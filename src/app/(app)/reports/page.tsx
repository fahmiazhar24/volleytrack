import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  ReportsManager,
  type ReportStudentRow,
} from "@/components/reports/reports-manager";

export default async function ReportsPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const [
    { data: periods },
    { data: classes },
    { data: students },
    { data: assessments },
    { data: evaluations },
    { data: reportCards },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("periods")
      .select("id, name, status")
      .order("start_date", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("students")
      .select(
        `
        id, full_name, position,
        enrollments(class_id, is_active, classes(name)),
        student_guardians(is_primary, guardians(full_name, phone_wa))
      `
      )
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("assessments").select("student_id, period_id"),
    supabase.from("evaluations").select("student_id, period_id, status"),
    supabase
      .from("report_cards")
      .select("student_id, period_id, access_token, version, published_at")
      .eq("is_latest", true),
    supabase.from("club_settings").select("club_name").limit(1).single(),
  ]);

  const assessmentSet = new Set(
    (assessments ?? []).map((a) => `${a.student_id}_${a.period_id}`)
  );

  const evalMap = new Map<string, string>();
  (evaluations ?? []).forEach((e) => {
    evalMap.set(`${e.student_id}_${e.period_id}`, e.status);
  });

  const reportMap = new Map<
    string,
    { token: string; version: number; published_at: string }
  >();
  (reportCards ?? []).forEach((r) => {
    reportMap.set(`${r.student_id}_${r.period_id}`, {
      token: r.access_token,
      version: r.version,
      published_at: r.published_at,
    });
  });

  const rowsByPeriod: Record<string, ReportStudentRow[]> = {};

  (periods ?? []).forEach((p) => {
    rowsByPeriod[p.id] = (students ?? []).map((s: any) => {
      const activeEnroll = (s.enrollments ?? []).find((e: any) => e.is_active);
      const primaryGuardian =
        (s.student_guardians ?? []).find((g: any) => g.is_primary)?.guardians ??
        s.student_guardians?.[0]?.guardians;

      const key = `${s.id}_${p.id}`;
      const rep = reportMap.get(key);
      const evStatus = evalMap.get(key) as
        | "draft"
        | "review"
        | "published"
        | undefined;

      return {
        student_id: s.id,
        full_name: s.full_name,
        position: s.position ?? "All-Round",
        class_id: activeEnroll?.class_id ?? "",
        class_name: activeEnroll?.classes?.name ?? "Tanpa Kelas",
        guardian_name: primaryGuardian?.full_name ?? "",
        guardian_phone: primaryGuardian?.phone_wa ?? "",
        period_id: p.id,
        has_scores: assessmentSet.has(key),
        eval_status: evStatus ?? "none",
        report_token: rep?.token ?? null,
        report_version: rep?.version ?? null,
        published_at: rep?.published_at ?? null,
      };
    });
  });

  return (
    <ReportsManager
      periods={periods ?? []}
      classes={classes ?? []}
      rowsByPeriod={rowsByPeriod}
      clubName={settings?.club_name ?? "VolleyTrack Academy"}
      isAdmin={profile?.role === "admin"}
    />
  );
}