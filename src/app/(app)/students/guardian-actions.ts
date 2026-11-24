"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth";

export async function activateGuardianAccountAction(input: {
  guardianId: string;
  email?: string;
  password: string;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengaktifkan akun wali." };
  }

  if (input.password.length < 6) {
    return { error: "Kata sandi minimal 6 karakter." };
  }

  const adminSupabase = createAdminClient();

  const { data: guardian, error: gErr } = await adminSupabase
    .from("guardians")
    .select("id, user_id, full_name, phone_wa, email")
    .eq("id", input.guardianId)
    .single();

  if (gErr || !guardian) {
    return { error: "Data wali tidak ditemukan." };
  }

  if (guardian.user_id) {
    return { error: "Wali ini sudah memiliki akun portal aktif." };
  }

  const phoneDigits = guardian.phone_wa.replace(/\D/g, "");
  const loginEmail =
    input.email?.trim().toLowerCase() ||
    guardian.email?.trim().toLowerCase() ||
    `${phoneDigits || guardian.id.slice(0, 8)}@orangtua.volleytrack.app`;

  // 1. Buat akun Auth (langsung terkonfirmasi)
  const { data: created, error: authErr } =
    await adminSupabase.auth.admin.createUser({
      email: loginEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: guardian.full_name, role: "parent" },
    });

  if (authErr || !created.user) {
    return { error: authErr?.message ?? "Gagal membuat akun login orangtua." };
  }

  // 2. Pastikan baris di public.profiles terdaftar sebagai 'parent'
  const { error: profErr } = await adminSupabase.from("profiles").upsert(
    {
      id: created.user.id,
      email: loginEmail,
      full_name: guardian.full_name,
      role: "parent",
      phone_wa: guardian.phone_wa,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    return { error: profErr.message };
  }

  // 3. Tautkan guardians.user_id ke akun baru
  const { error: linkErr } = await adminSupabase
    .from("guardians")
    .update({
      user_id: created.user.id,
      email: loginEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guardian.id);

  if (linkErr) {
    return { error: linkErr.message };
  }

  revalidatePath("/students");
  return {
    success: true,
    loginEmail,
    password: input.password,
    fullName: guardian.full_name,
    phoneWa: guardian.phone_wa,
  };
}

export async function resetGuardianPasswordAction(
  userId: string,
  newPassword: string
) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Akses ditolak." };
  }

  if (newPassword.length < 6) {
    return { error: "Kata sandi minimal 6 karakter." };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };
  return { success: true };
}