"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email.trim(),
    password: formData.password,
  });

  if (error || !data.user) {
    return { error: "Email atau kata sandi salah. Silakan cek kembali." };
  }

  // Gunakan admin client di server agar tidak kena race condition cookie saat login pertama
  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      error: `Data profil tidak ditemukan (${profileError?.message ?? "row kosong"}).`,
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Akun kamu dinonaktifkan. Hubungi Admin/Head Coach." };
  }

  revalidatePath("/", "layout");

  if (profile.role === "parent") {
    redirect("/parent");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}