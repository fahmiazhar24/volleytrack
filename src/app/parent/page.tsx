import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ParentPortalView,
  type ParentChildData,
} from "@/components/parent/parent-portal-view";
import type { ScoreScale } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function ParentPortalPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent") redirect("/dashboard");

  const adminSupabase = createAdminClient();

  const [{ data: settings }, { data: activePeriod }, { data: guardian }] =
    await Promise.all([
      adminSupabase
        .from("club_settings")
        .select(
          "club_name, logo_url, primary_color, secondary_color, score_scale, count_izin_as_present, count_sakit_as_present"
        )
        .limit(1)
        .single(),
      adminSupabase
        .from("periods")
        .select("id, name, start_date, end_date")
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("guardians")
        .select(
          `
          id, full_name,
          student_guardians(
            students(
              id, full_name, position, is_active,
              enrollments(is_active, classes(name))
            )
          )
        `
        )
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);

  const linkedStudents = (guardian?.student_guardians ?? [])
    .map((sg: any) => sg.students)
    .filter((s: any) => s && s.is_active);

  const studentIds = linkedStudents.map((s: any) => s.id);

  let allReports: any[] = [];
  let allAttendance: any[] = [];

  if (studentIds.length > 0) {
    const [{ data: reports }, { data: attRows }] = await Promise.all([
      adminSupabase
        .from("report_cards")
        .select(
          "id, student_id, version, access_token, published_at, snapshot_data, periods(name)"
        )
        .in("student_id", studentIds)
        .eq("is_latest", true)
        .order("published_at", { ascending: false }),
      adminSupabase
        .from("attendance")
        .select("student_id, status, sessions!inner(session_date, status)")
        .in("student_id", studentIds)
        .neq("sessions.status", "cancelled"),
    ]);

    allReports = reports ?? [];
    allAttendance = attRows ?? [];
  }

  const countIzin = Boolean(settings?.count_izin_as_present);
  const countSakit = Boolean(settings?.count_sakit_as_present);

  const childrenList: ParentChildData[] = linkedStudents.map((st: any) => {
    const activeEnroll = (st.enrollments ?? []).find((e: any) => e.is_active);
    const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };

    allAttendance
      .filter((a) => a.student_id === st.id)
      .forEach((a) => {
        const sDate = a.sessions?.session_date;
        if (!sDate) return;
        if (activePeriod?.start_date && sDate < activePeriod.start_date) return;
        if (activePeriod?.end_date && sDate > activePeriod.end_date) return;
        const key = a.status as keyof typeof counts;
        if (key in counts) counts[key]++;
      });

    const total = counts.hadir + counts.izin + counts.sakit + counts.alpa;
    const effective =
      counts.hadir +
      (countIzin ? counts.izin : 0) +
      (countSakit ? counts.sakit : 0);

    const studentReports = allReports
      .filter((r) => r.student_id === st.id)
      .map((r) => ({
        id: r.id,
        period_name:
          r.periods?.name ?? r.snapshot_data?.period?.name ?? "Periode",
        version: r.version,
        access_token: r.access_token,
        published_at: r.published_at,
        overall_score_five: Number(r.snapshot_data?.overall_score_five ?? 0),
        score_scale:
          (r.snapshot_data?.club?.score_scale as ScoreScale) ??
          (settings?.score_scale as ScoreScale) ??
          "1-5",
      }));

    return {
      id: st.id,
      full_name: st.full_name,
      position: st.position ?? "All-Round",
      class_name: activeEnroll?.classes?.name ?? "Belum terdaftar kelas",
      attendance: {
        total,
        ...counts,
        percentage: total > 0 ? Math.round((effective / total) * 100) : 0,
      },
      reports: studentReports,
    };
  });

  return (
    <ParentPortalView
      guardianName={guardian?.full_name ?? profile.full_name}
      activePeriodName={activePeriod?.name ?? "Periode Aktif"}
      club={{
        club_name: settings?.club_name ?? "VolleyTrack Academy",
        logo_url: settings?.logo_url ?? null,
        primary_color: settings?.primary_color ?? "#0f172a",
        secondary_color: settings?.secondary_color ?? "#f97316",
      }}
      childrenList={childrenList}
    />
  );
}