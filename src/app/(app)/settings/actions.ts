"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import type { ScoreScale } from "@/lib/scoring";

export interface ClubSettingsPayload {
  id: string;
  club_name: string;
  head_coach_name: string;
  primary_color: string;
  secondary_color: string;
  score_scale: ScoreScale;
  count_izin_as_present: boolean;
  count_sakit_as_present: boolean;
  report_language: "id" | "en" | "both";
}

export async function updateClubSettingsAction(input: ClubSettingsPayload) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengubah pengaturan." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_settings")
    .update({
      club_name: input.club_name.trim() || "VolleyTrack Academy",
      head_coach_name: input.head_coach_name.trim() || "Head Coach",
      primary_color: input.primary_color || "#0f172a",
      secondary_color: input.secondary_color || "#f97316",
      score_scale: input.score_scale,
      count_izin_as_present: input.count_izin_as_present,
      count_sakit_as_present: input.count_sakit_as_present,
      report_language: input.report_language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/evaluations");
  revalidatePath("/reports");
  revalidatePath("/", "layout");
  return { success: true };
}