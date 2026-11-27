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

export async function updateStaffAccountAction(input: {
  id: string;
  full_name: string;
  phone_wa: string;
  role: "admin" | "coach";
  classIds: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi login berakhir. Silakan masuk kembali." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengubah data akun." };
  }

  const fullName = input.full_name.trim();
  if (!fullName) {
    return { error: "Nama lengkap wajib diisi." };
  }

  if (input.id === user.id && input.role !== "admin") {
    return {
      error: "Anda tidak dapat menurunkan hak akses akun sendiri.",
    };
  }

  const admin = await createAdminClient();

  // 1. Perbarui profil pelatih
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      phone_wa: input.phone_wa.trim() || null,
      role: input.role,
    })
    .eq("id", input.id);

  if (profileErr) {
    return { error: `Gagal memperbarui profil: ${profileErr.message}` };
  }

  // Sinkronkan nama ke metadata Auth (opsional, tidak menggagalkan proses utama)
  await admin.auth.admin.updateUserById(input.id, {
    user_metadata: { full_name: fullName },
  });

  // 2. Lepas penugasan kelas lama milik pelatih ini yang tidak lagi dicentang
  const { data: prevClasses } = await admin
    .from("classes")
    .select("id")
    .eq("coach_id", input.id);

  const selectedSet = new Set(input.classIds);
  const toUnassign = (prevClasses ?? [])
    .map((c) => c.id)
    .filter((cid) => !selectedSet.has(cid));

  if (toUnassign.length > 0) {
    const { error: unassignErr } = await admin
      .from("classes")
      .update({ coach_id: null })
      .in("id", toUnassign);

    if (unassignErr) {
      return { error: `Gagal melepas kelas lama: ${unassignErr.message}` };
    }
  }

  // 3. Tugaskan kelas yang dicentang ke pelatih ini
  if (input.classIds.length > 0) {
    const { error: assignErr } = await admin
      .from("classes")
      .update({ coach_id: input.id })
      .in("id", input.classIds);

    if (assignErr) {
      return { error: `Gagal menetapkan kelas: ${assignErr.message}` };
    }
  }

  revalidatePath("/settings");
  revalidatePath("/classes");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/skills");
  revalidatePath("/evaluations");

  return { error: null };
}

