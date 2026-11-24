import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { ClubSettingsForm } from "@/components/settings/club-settings-form";
import type { ScoreScale } from "@/lib/scoring";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("club_settings")
    .select(
      "id, club_name, head_coach_name, primary_color, secondary_color, score_scale, count_izin_as_present, count_sakit_as_present, report_language"
    )
    .limit(1)
    .single();

  if (!settings) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Data <code>club_settings</code> belum ditemukan di database.
      </div>
    );
  }

  return (
    <ClubSettingsForm
      initialSettings={{
        id: settings.id,
        club_name: settings.club_name,
        head_coach_name: settings.head_coach_name,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        score_scale: (settings.score_scale as ScoreScale) ?? "1-5",
        count_izin_as_present: Boolean(settings.count_izin_as_present),
        count_sakit_as_present: Boolean(settings.count_sakit_as_present),
        report_language:
          (settings.report_language as "id" | "en" | "both") ?? "id",
      }}
    />
  );
}