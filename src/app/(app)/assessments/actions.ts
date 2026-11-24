"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface SkillScoreInput {
  skill_id: string;
  score: number; // 1 - 5
  raw_value?: number | null;
  notes?: string;
}

export async function loadStudentAssessmentsAction(
  studentId: string,
  periodId: string
) {
  const supabase = await createClient();

  const { data: assessment, error: headerErr } = await supabase
    .from("assessments")
    .select("id")
    .eq("student_id", studentId)
    .eq("period_id", periodId)
    .maybeSingle();

  if (headerErr) {
    return { error: headerErr.message, records: [] as SkillScoreInput[] };
  }

  if (!assessment) {
    return { records: [] as SkillScoreInput[] };
  }

  const { data: scores, error: scoreErr } = await supabase
    .from("assessment_scores")
    .select("skill_id, score, raw_value, notes")
    .eq("assessment_id", assessment.id);

  if (scoreErr) {
    return { error: scoreErr.message, records: [] as SkillScoreInput[] };
  }

  const records: SkillScoreInput[] = (scores ?? []).map((r) => ({
    skill_id: r.skill_id,
    score: Number(r.score),
    raw_value: r.raw_value !== null ? Number(r.raw_value) : null,
    notes: r.notes ?? "",
  }));

  return { records };
}

export async function saveStudentAssessmentsAction(input: {
  studentId: string;
  periodId: string;
  classId?: string | null;
  scores: SkillScoreInput[];
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || !["admin", "coach"].includes(profile.role)) {
    return { error: "Hanya Coach atau Admin yang dapat menyimpan penilaian." };
  }

  if (!input.studentId || !input.periodId) {
    return { error: "Siswa dan periode wajib dipilih." };
  }

  const validScores = input.scores.filter((s) => s.score >= 1 && s.score <= 5);
  if (validScores.length === 0) {
    return { error: "Belum ada skor yang diisi." };
  }

  const supabase = await createClient();

  // 1. Upsert header assessments (unik per student_id + period_id)
  const { data: assessment, error: headerErr } = await supabase
    .from("assessments")
    .upsert(
      {
        student_id: input.studentId,
        period_id: input.periodId,
        class_id: input.classId || null,
        assessor_id: profile.id,
        assessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,period_id" }
    )
    .select("id")
    .single();

  if (headerErr || !assessment) {
    return { error: headerErr?.message ?? "Gagal menyimpan header penilaian." };
  }

  // 2. Upsert detail skor ke assessment_scores
  const payload = validScores.map((s) => ({
    assessment_id: assessment.id,
    skill_id: s.skill_id,
    score: s.score,
    raw_value:
      s.raw_value !== undefined &&
      s.raw_value !== null &&
      !Number.isNaN(s.raw_value)
        ? s.raw_value
        : null,
    notes: s.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }));

  const { error: scoreErr } = await supabase
    .from("assessment_scores")
    .upsert(payload, { onConflict: "assessment_id,skill_id" });

  if (scoreErr) {
    return { error: scoreErr.message };
  }

  revalidatePath("/assessments");
  revalidatePath("/dashboard");
  return { success: true, savedCount: payload.length };
}