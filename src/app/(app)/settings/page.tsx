import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import {
  TeamAccountsManager,
  type StaffMember,
} from "@/components/settings/team-accounts-manager";
import type { ScoreScale } from "@/lib/scoring";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: settings }, { data: staffRows }] = await Promise.all([
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
          Kelola identitas klub, logo, tanda tangan rapor, aturan penilaian, dan
          akun pelatih.
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

      <TeamAccountsManager
        staffList={(staffRows ?? []) as StaffMember[]}
        currentUserId={profile.id}
        clubName={settings.club_name}
      />
    </div>
  );
}