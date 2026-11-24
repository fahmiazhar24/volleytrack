"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth";
import type { ScoreScale } from "@/lib/scoring";

export interface ClubSettingsPayload {
  id: string;
  club_name: string;
  head_coach_name: string;
  logo_url?: string | null;
  head_coach_signature_url?: string | null;
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

export async function uploadClubAssetAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengunggah aset." };
  }

  const settingsId = String(formData.get("settingsId") || "");
  const kind = String(formData.get("kind") || "");
  const file = formData.get("file") as File | null;

  if (!settingsId || !["logo", "signature"].includes(kind) || !file) {
    return { error: "Parameter unggahan tidak lengkap." };
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Format file harus PNG, JPG, atau WebP." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Ukuran gambar maksimal 2 MB." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";
  const filePath = `${kind}.${ext}`;

  const adminSupabase = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await adminSupabase.storage
    .from("club-assets")
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return { error: `Gagal unggah: ${uploadErr.message}` };
  }

  const { data: pub } = adminSupabase.storage
    .from("club-assets")
    .getPublicUrl(filePath);

  // Tambahkan cache-buster agar browser langsung memuat gambar terbaru
  const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
  const column =
    kind === "logo" ? "logo_url" : "head_coach_signature_url";

  const { error: dbErr } = await adminSupabase
    .from("club_settings")
    .update({ [column]: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", settingsId);

  if (dbErr) {
    return { error: dbErr.message };
  }

  revalidatePath("/settings");
  revalidatePath("/reports");
  revalidatePath("/", "layout");
  return { success: true, url: publicUrl };
}