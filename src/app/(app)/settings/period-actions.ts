"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PeriodStatus = "upcoming" | "active" | "closed";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "Sesi login berakhir. Silakan masuk kembali." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      supabase,
      error: "Hanya Head Coach / Admin yang dapat mengelola periode evaluasi.",
    };
  }

  return { supabase, error: null };
}

function revalidateAllPeriodPages() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/skills");
  revalidatePath("/evaluations");
  revalidatePath("/reports");
}

export async function createPeriodAction(input: {
  name: string;
  startDate: string;
  endDate: string;
  activateNow: boolean;
}) {
  const { supabase, error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const name = input.name.trim();
  if (!name) return { error: "Nama periode wajib diisi." };
  if (!input.startDate || !input.endDate) {
    return { error: "Tanggal mulai dan tanggal selesai wajib diisi." };
  }
  if (input.endDate < input.startDate) {
    return { error: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  }

  if (input.activateNow) {
    const { error: closeErr } = await supabase
      .from("periods")
      .update({ status: "closed" })
      .eq("status", "active");

    if (closeErr) {
      return { error: `Gagal menutup periode aktif lama: ${closeErr.message}` };
    }
  }

  const { error: insertErr } = await supabase.from("periods").insert({
    name,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.activateNow ? "active" : "upcoming",
  });

  if (insertErr) {
    return { error: `Gagal menambahkan periode: ${insertErr.message}` };
  }

  revalidateAllPeriodPages();
  return { error: null };
}

export async function updatePeriodStatusAction(input: {
  periodId: string;
  status: PeriodStatus;
}) {
  const { supabase, error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (input.status === "active") {
    const { error: closeErr } = await supabase
      .from("periods")
      .update({ status: "closed" })
      .eq("status", "active")
      .neq("id", input.periodId);

    if (closeErr) {
      return { error: `Gagal menutup periode aktif sebelumnya: ${closeErr.message}` };
    }
  }

  const { error: updateErr } = await supabase
    .from("periods")
    .update({ status: input.status })
    .eq("id", input.periodId);

  if (updateErr) {
    return { error: `Gagal memperbarui status periode: ${updateErr.message}` };
  }

  revalidateAllPeriodPages();
  return { error: null };
}