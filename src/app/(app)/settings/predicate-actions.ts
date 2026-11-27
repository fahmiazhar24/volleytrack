"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PredicateRule } from "@/lib/scoring";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi login berakhir. Silakan masuk kembali." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      error: "Hanya Head Coach / Admin yang dapat mengubah aturan predikat.",
    };
  }

  return { error: null };
}

export async function updatePredicateRulesAction(input: {
  settingsId: string;
  rules: PredicateRule[];
}) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (!Array.isArray(input.rules) || input.rules.length !== 5) {
    return { error: "Format aturan predikat harus terdiri dari 5 tingkat." };
  }

  const cleaned: PredicateRule[] = input.rules.map((r, idx) => ({
    ...r,
    label_id: r.label_id.trim(),
    label_en: r.label_en.trim() || r.label_id.trim(),
    min_score: idx === 4 ? 0 : Number(r.min_score),
  }));

  for (const rule of cleaned) {
    if (!rule.label_id) {
      return { error: "Semua label predikat wajib diisi." };
    }
    if (Number.isNaN(rule.min_score) || rule.min_score < 0 || rule.min_score > 5) {
      return { error: "Batas skor harus berada di rentang 0,00 sampai 5,00." };
    }
  }

  // Pastikan ambang batas selalu menurun tegas: tingkat 1 > 2 > 3 > 4 > 0
  if (
    !(
      cleaned[0].min_score > cleaned[1].min_score &&
      cleaned[1].min_score > cleaned[2].min_score &&
      cleaned[2].min_score > cleaned[3].min_score &&
      cleaned[3].min_score > 0
    )
  ) {
    return {
      error:
        "Urutan batas skor tidak valid. Skor minimal predikat lebih tinggi harus selalu lebih besar dari predikat di bawahnya.",
    };
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from("club_settings")
    .update({ predicate_rules: cleaned })
    .eq("id", input.settingsId);

  if (error) {
    return { error: `Gagal menyimpan aturan predikat: ${error.message}` };
  }

  revalidatePath("/settings");
  revalidatePath("/reports");
  revalidatePath("/evaluations");
  revalidatePath("/dashboard");

  return { error: null };
}