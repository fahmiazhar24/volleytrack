"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    return { error: "Hanya Head Coach / Admin yang dapat mengubah master rubrik." };
  }

  return { error: null };
}

function revalidateRubricPages() {
  revalidatePath("/settings");
  revalidatePath("/skills");
  revalidatePath("/evaluations");
  revalidatePath("/reports");
}

export async function createSkillCategoryAction(input: { name: string }) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const name = input.name.trim();
  if (!name) return { error: "Nama kategori wajib diisi." };

  const admin = await createAdminClient();
  const { data: existing } = await admin
    .from("skill_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await admin.from("skill_categories").insert({
    name,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) return { error: `Gagal menambah kategori: ${error.message}` };

  revalidateRubricPages();
  return { error: null };
}

export async function toggleSkillCategoryAction(input: {
  id: string;
  isActive: boolean;
}) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const admin = await createAdminClient();
  const { error } = await admin
    .from("skill_categories")
    .update({ is_active: input.isActive })
    .eq("id", input.id);

  if (error) return { error: `Gagal memperbarui status kategori: ${error.message}` };

  revalidateRubricPages();
  return { error: null };
}

export async function saveSkillItemAction(input: {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  hasRawMetric: boolean;
  rawMetricUnit: string;
}) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const name = input.name.trim();
  if (!name) return { error: "Nama item skill wajib diisi." };

  const unit = input.hasRawMetric ? input.rawMetricUnit.trim() || null : null;
  const admin = await createAdminClient();

  if (input.id) {
    const { error } = await admin
      .from("skills")
      .update({
        name,
        description: input.description.trim() || null,
        has_raw_metric: input.hasRawMetric,
        raw_metric_unit: unit,
      })
      .eq("id", input.id);

    if (error) return { error: `Gagal memperbarui skill: ${error.message}` };
  } else {
    const { data: existing } = await admin
      .from("skills")
      .select("sort_order")
      .eq("category_id", input.categoryId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

    const { error } = await admin.from("skills").insert({
      category_id: input.categoryId,
      name,
      description: input.description.trim() || null,
      has_raw_metric: input.hasRawMetric,
      raw_metric_unit: unit,
      sort_order: nextOrder,
      is_active: true,
    });

    if (error) return { error: `Gagal menambahkan skill: ${error.message}` };
  }

  revalidateRubricPages();
  return { error: null };
}

export async function toggleSkillItemAction(input: {
  id: string;
  isActive: boolean;
}) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const admin = await createAdminClient();
  const { error } = await admin
    .from("skills")
    .update({ is_active: input.isActive })
    .eq("id", input.id);

  if (error) return { error: `Gagal mengubah status skill: ${error.message}` };

  revalidateRubricPages();
  return { error: null };
}

export async function saveSkillRubricsAction(input: {
  skillId: string;
  rubrics: Array<{
    level: number;
    label: string;
    description: string;
    suggestion_template: string;
  }>;
}) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const admin = await createAdminClient();

  for (const item of input.rubrics) {
    const { data: existing } = await admin
      .from("skill_rubrics")
      .select("id")
      .eq("skill_id", input.skillId)
      .eq("level", item.level)
      .maybeSingle();

    const payload = {
      label: item.label.trim() || `Level ${item.level}`,
      description: item.description.trim(),
      suggestion_template: item.suggestion_template.trim() || null,
    };

    if (existing?.id) {
      const { error } = await admin
        .from("skill_rubrics")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { error: `Gagal simpan rubrik level ${item.level}: ${error.message}` };
    } else if (payload.description) {
      const { error } = await admin.from("skill_rubrics").insert({
        skill_id: input.skillId,
        level: item.level,
        ...payload,
      });
      if (error) return { error: `Gagal buat rubrik level ${item.level}: ${error.message}` };
    }
  }

  revalidateRubricPages();
  return { error: null };
}