"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth";

export async function createStaffAccountAction(input: {
  full_name: string;
  email: string;
  phone_wa?: string;
  role: "admin" | "coach";
  password: string;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat membuat akun tim." };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();

  if (!fullName || !email || input.password.length < 6) {
    return { error: "Nama, email, dan kata sandi (min. 6 karakter) wajib diisi." };
  }

  const adminSupabase = createAdminClient();

  const { data: created, error: authErr } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: input.role },
    });

  if (authErr || !created.user) {
    return { error: authErr?.message ?? "Gagal membuat akun di Auth." };
  }

  const { error: profErr } = await adminSupabase.from("profiles").upsert(
    {
      id: created.user.id,
      email,
      full_name: fullName,
      role: input.role,
      phone_wa: input.phone_wa?.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    return { error: `Akun Auth dibuat, tetapi gagal simpan profil: ${profErr.message}` };
  }

  revalidatePath("/settings");
  revalidatePath("/classes");
  return { success: true };
}

export async function toggleStaffActiveAction(userId: string, nextActive: boolean) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Akses ditolak." };
  }

  if (profile.id === userId) {
    return { error: "Anda tidak dapat menonaktifkan akun sendiri." };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mereset kata sandi." };
  }

  if (newPassword.length < 6) {
    return { error: "Kata sandi baru minimal 6 karakter." };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function changeOwnPasswordAction(newPassword: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) return { error: "Sesi tidak ditemukan." };

  if (newPassword.length < 6) {
    return { error: "Kata sandi baru minimal 6 karakter." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}