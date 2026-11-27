import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import {
  TeamAccountsManager,
  type StaffMember,
} from "@/components/settings/team-accounts-manager";
import type { ScoreScale } from "@/lib/scoring";
import { PeriodsManager } from "@/components/settings/periods-manager";
import {
  RubricsManager,
  type SkillCategoryRow,
  type SkillRow,
  type RubricRow,
} from "@/components/settings/rubrics-manager";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [
    { data: settings },
    { data: staffRows },
    { data: periods },
    { data: skillCategories },
    { data: skills },
    { data: skillRubrics },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select(
        "id, club_name, logo_url, head_coach_name, head_coach_signature_url, primary_color, secondary_color, score_scale, count_izin_as_present, count_sakit_as_present, report_language"
      )
      .limit(1)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, phone_wa, is_active")
      .in("role", ["admin", "coach"])
      .order("role")
      .order("full_name"),
    supabase
      .from("periods")
      .select("id, name, start_date, end_date, status")
      .order("start_date", { ascending: false }),
    supabase
      .from("skill_categories")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("skills")
      .select(
        "id, category_id, name, description, has_raw_metric, raw_metric_unit, sort_order, is_active"
      )
      .order("sort_order", { ascending: true }),
    supabase
      .from("skill_rubrics")
      .select("id, skill_id, level, label, description, suggestion_template")
      .order("level", { ascending: true }),
  ]);

  if (!settings) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Data <code>club_settings</code> belum ditemukan di database.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan Klub & Akun Tim
        </h1>
        <p className="text-sm text-slate-500">
          Kelola identitas klub, logo, tanda tangan rapor, aturan penilaian,
          periode evaluasi, rubrik skill, dan akun pelatih.
        </p>
      </div>

      <ClubSettingsForm
        initialSettings={{
          id: settings.id,
          club_name: settings.club_name,
          logo_url: settings.logo_url,
          head_coach_name: settings.head_coach_name,
          head_coach_signature_url: settings.head_coach_signature_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          score_scale: (settings.score_scale as ScoreScale) ?? "1-5",
          count_izin_as_present: Boolean(settings.count_izin_as_present),
          count_sakit_as_present: Boolean(settings.count_sakit_as_present),
          report_language:
            (settings.report_language as "id" | "en" | "both") ?? "id",
        }}
      />

      <PeriodsManager periods={periods ?? []} />

      <RubricsManager
        categories={(skillCategories ?? []) as SkillCategoryRow[]}
        skills={(skills ?? []) as SkillRow[]}
        rubrics={(skillRubrics ?? []) as RubricRow[]}
      />

      <TeamAccountsManager
        staffList={(staffRows ?? []) as StaffMember[]}
        currentUserId={profile.id}
        clubName={settings.club_name}
      />
    </div>
  );
}