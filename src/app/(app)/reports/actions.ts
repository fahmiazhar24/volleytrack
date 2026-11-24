"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import type { ScoreScale } from "@/lib/scoring";
import type { ReportSnapshot } from "@/types/report";

export async function publishReportCardAction(input: {
    studentId: string;
    periodId: string;
    revisionNote?: string;
}) {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
        return { error: "Hanya Head Coach / Admin yang dapat mempublikasikan rapor." };
    }

    const supabase = await createClient();

    // 1. Ambil club_settings, period, student, evaluation, dan assessment secara paralel
    const [
        { data: settings },
        { data: period },
        { data: student },
        { data: evaluation },
        { data: assessment },
    ] = await Promise.all([
        supabase
            .from("club_settings")
            .select(
                "club_name, logo_url, head_coach_name, head_coach_signature_url, primary_color, secondary_color, score_scale, count_izin_as_present, count_sakit_as_present"
            )
            .limit(1)
            .single(),
        supabase
            .from("periods")
            .select("id, name, start_date, end_date")
            .eq("id", input.periodId)
            .single(),
        supabase
            .from("students")
            .select(
                "id, full_name, birth_date, position, enrollments(is_active, classes(name))"
            )
            .eq("id", input.studentId)
            .single(),
        supabase
            .from("evaluations")
            .select(
                "id, strengths, areas_to_improve, training_advice, next_target"
            )
            .eq("student_id", input.studentId)
            .eq("period_id", input.periodId)
            .maybeSingle(),
        supabase
            .from("assessments")
            .select("id")
            .eq("student_id", input.studentId)
            .eq("period_id", input.periodId)
            .maybeSingle(),
    ]);

    if (!settings || !period || !student) {
        return { error: "Data klub, periode, atau siswa tidak ditemukan." };
    }

    if (!evaluation) {
        return {
            error:
                "Evaluasi 3 bulan belum dibuat. Silakan isi di menu Evaluasi 3 Bulan terlebih dahulu.",
        };
    }

    if (!assessment) {
        return {
            error:
                "Nilai skill periode ini belum diisi. Silakan isi di menu Penilaian Skill terlebih dahulu.",
        };
    }

    // 2. Ambil seluruh skor skill + rubrik
    const { data: rawScores } = await supabase
        .from("assessment_scores")
        .select(
            `
      score, raw_value, notes,
      skills(
        name, raw_metric_unit, sort_order,
        skill_categories(name, sort_order),
        skill_rubrics(level, label)
      )
    `
        )
        .eq("assessment_id", assessment.id);

    if (!rawScores || rawScores.length === 0) {
        return { error: "Belum ada skor skill yang tersimpan untuk siswa ini." };
    }

    // Kelompokkan skor per kategori sesuai sort_order
    const catMap = new Map<
        string,
        {
            sort_order: number;
            skills: {
                name: string;
                sort_order: number;
                score: number;
                rubric_label: string;
                raw_value: number | null;
                raw_metric_unit: string | null;
                notes: string | null;
            }[];
        }
    >();

    let totalScoreSum = 0;
    let totalSkillCount = 0;

    rawScores.forEach((row: any) => {
        if (!row.skills) return;
        const scoreNum = Number(row.score);
        const rounded = Math.min(5, Math.max(1, Math.round(scoreNum)));
        const rubric = (row.skills.skill_rubrics ?? []).find(
            (r: any) => Number(r.level) === rounded
        );
        const catName = row.skills.skill_categories?.name ?? "Umum";
        const catSort = row.skills.skill_categories?.sort_order ?? 99;

        if (!catMap.has(catName)) {
            catMap.set(catName, { sort_order: catSort, skills: [] });
        }
        catMap.get(catName)!.skills.push({
            name: row.skills.name,
            sort_order: row.skills.sort_order ?? 99,
            score: scoreNum,
            rubric_label: rubric?.label ?? "",
            raw_value: row.raw_value !== null ? Number(row.raw_value) : null,
            raw_metric_unit: row.skills.raw_metric_unit ?? null,
            notes: row.notes ?? null,
        });

        totalScoreSum += scoreNum;
        totalSkillCount++;
    });

    const categories = Array.from(catMap.entries())
        .sort((a, b) => a[1].sort_order - b[1].sort_order)
        .map(([name, group]) => {
            const sortedSkills = group.skills.sort(
                (a, b) => a.sort_order - b.sort_order
            );
            const avg =
                sortedSkills.reduce((acc, s) => acc + s.score, 0) / sortedSkills.length;
            return {
                name,
                average_five: Number(avg.toFixed(2)),
                skills: sortedSkills.map(({ sort_order: _so, ...rest }) => rest),
            };
        });

    const overallFive =
        totalSkillCount > 0
            ? Number((totalScoreSum / totalSkillCount).toFixed(2))
            : 0;

    // 3. Hitung rekap absensi pada rentang tanggal periode
    const { data: rawAttendance } = await supabase
        .from("attendance")
        .select("status, sessions!inner(session_date, status)")
        .eq("student_id", input.studentId)
        .neq("sessions.status", "cancelled");

    const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    (rawAttendance ?? []).forEach((row: any) => {
        const sDate = row.sessions?.session_date;
        if (!sDate) return;
        if (period.start_date && sDate < period.start_date) return;
        if (period.end_date && sDate > period.end_date) return;

        const st = row.status as keyof typeof counts;
        if (st in counts) counts[st]++;
    });

    const totalSessions =
        counts.hadir + counts.izin + counts.sakit + counts.alpa;
    const effectivePresent =
        counts.hadir +
        (settings.count_izin_as_present ? counts.izin : 0) +
        (settings.count_sakit_as_present ? counts.sakit : 0);
    const percentage =
        totalSessions > 0
            ? Math.round((effectivePresent / totalSessions) * 100)
            : 0;

    // 4. Tentukan versi rapor berikutnya
    const { data: latestReport } = await supabase
        .from("report_cards")
        .select("id, version")
        .eq("evaluation_id", evaluation.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextVersion = (latestReport?.version ?? 0) + 1;
    const activeEnroll = (student.enrollments ?? []).find((e: any) => e.is_active);
    const className =
        (activeEnroll as any)?.classes?.name ?? "Belum terdaftar kelas";

    const snapshot: ReportSnapshot = {
        generated_at: new Date().toISOString(),
        version: nextVersion,
        revision_note: input.revisionNote?.trim() || null,
        club: {
            club_name: settings.club_name,
            logo_url: settings.logo_url ?? null,
            head_coach_name: settings.head_coach_name,
            head_coach_signature_url: settings.head_coach_signature_url ?? null,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            score_scale: (settings.score_scale as ScoreScale) ?? "1-5",
            count_izin_as_present: Boolean(settings.count_izin_as_present),
            count_sakit_as_present: Boolean(settings.count_sakit_as_present),
        },
        period: {
            id: period.id,
            name: period.name,
            start_date: period.start_date ?? null,
            end_date: period.end_date ?? null,
        },
        student: {
            id: student.id,
            full_name: student.full_name,
            birth_date: student.birth_date,
            position: student.position ?? "All-Round",
            class_name: className,
        },
        attendance: {
            total_sessions: totalSessions,
            ...counts,
            effective_present: effectivePresent,
            percentage,
        },
        overall_score_five: overallFive,
        categories,
        evaluation: {
            strengths: evaluation.strengths ?? "",
            areas_to_improve: evaluation.areas_to_improve ?? "",
            training_advice: evaluation.training_advice ?? "",
            next_target: evaluation.next_target ?? "",
        },
    };

    // Tandai versi lama tidak lagi latest
    if (latestReport) {
        await supabase
            .from("report_cards")
            .update({ is_latest: false })
            .eq("evaluation_id", evaluation.id)
            .eq("is_latest", true);
    }

    // Simpan snapshot baru ke report_cards
    const { data: created, error: insertErr } = await supabase
        .from("report_cards")
        .insert({
            evaluation_id: evaluation.id,
            student_id: input.studentId,
            period_id: input.periodId,
            version: nextVersion,
            snapshot_data: snapshot,
            is_latest: true,
            revision_note: input.revisionNote?.trim() || null,
            published_by: profile.id,
            published_at: new Date().toISOString(),
        })
        .select("access_token, version")
        .single();

    if (insertErr || !created) {
        return { error: insertErr?.message ?? "Gagal menerbitkan rapor." };
    }

    // Update status evaluations menjadi published
    await supabase
        .from("evaluations")
        .update({
            status: "published",
            reviewed_by: profile.id,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", evaluation.id);

    revalidatePath("/reports");
    revalidatePath("/evaluations");
    return {
        success: true,
        accessToken: created.access_token as string,
        version: created.version as number,
    };
}