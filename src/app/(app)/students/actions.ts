"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface StudentPayload {
  id?: string;
  full_name: string;
  birth_date: string;
  position: string;
  class_id: string;
  notes?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "").trim();
}

export async function saveStudentAction(input: StudentPayload) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengubah data siswa." };
  }

  const supabase = await createClient();
  let studentId = input.id;

  // 1. Simpan atau update siswa
  if (studentId) {
    const { error } = await supabase
      .from("students")
      .update({
        full_name: input.full_name.trim(),
        birth_date: input.birth_date,
        position: input.position || "All-Round",
        notes: input.notes?.trim() || null,
      })
      .eq("id", studentId);

    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("students")
      .insert({
        full_name: input.full_name.trim(),
        birth_date: input.birth_date,
        position: input.position || "All-Round",
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) return { error: error?.message ?? "Gagal simpan siswa." };
    studentId = data.id;
  }

  // 2. Atur kelas aktif (enrollment)
  if (input.class_id) {
    await supabase
      .from("enrollments")
      .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
      .eq("student_id", studentId)
      .eq("is_active", true)
      .neq("class_id", input.class_id);

    const { data: existingEnroll } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("class_id", input.class_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!existingEnroll) {
      await supabase.from("enrollments").insert({
        student_id: studentId,
        class_id: input.class_id,
        is_active: true,
      });
    }
  }

  // 3. Tautkan Orangtua / Wali (Otomatis dukung Multi-Anak berdasarkan No WA)
  const cleanPhone = normalizePhone(input.guardian_phone);
  if (input.guardian_name.trim() && cleanPhone) {
    const { data: existingGuardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("phone_wa", cleanPhone)
      .maybeSingle();

    let guardianId = existingGuardian?.id;

    if (guardianId) {
      await supabase
        .from("guardians")
        .update({
          full_name: input.guardian_name.trim(),
          email: input.guardian_email?.trim() || null,
        })
        .eq("id", guardianId);
    } else {
      const { data: newGuardian } = await supabase
        .from("guardians")
        .insert({
          full_name: input.guardian_name.trim(),
          phone_wa: cleanPhone,
          email: input.guardian_email?.trim() || null,
        })
        .select("id")
        .single();
      guardianId = newGuardian?.id;
    }

    if (guardianId) {
      await supabase
        .from("student_guardians")
        .upsert(
          { student_id: studentId, guardian_id: guardianId, is_primary: true },
          { onConflict: "student_id,guardian_id" }
        );
    }
  }

  revalidatePath("/students");
  revalidatePath("/classes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveStudentAction(studentId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Akses ditolak." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ is_active: false })
    .eq("id", studentId);

  if (error) return { error: error.message };

  await supabase
    .from("enrollments")
    .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
    .eq("student_id", studentId)
    .eq("is_active", true);

  revalidatePath("/students");
  revalidatePath("/classes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function importStudentsCsvAction(
  rows: {
    full_name: string;
    birth_date: string;
    position: string;
    class_id: string;
    guardian_name: string;
    guardian_phone: string;
    guardian_email?: string;
  }[]
) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Admin yang dapat melakukan impor massal." };
  }

  let successCount = 0;
  let failCount = 0;

  for (const row of rows) {
    if (!row.full_name?.trim() || !row.birth_date?.trim()) {
      failCount++;
      continue;
    }
    const res = await saveStudentAction(row);
    if (res?.success) successCount++;
    else failCount++;
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: true, successCount, failCount };
}