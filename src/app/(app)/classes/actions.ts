"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface RoutineScheduleItem {
  day: number; // 0 = Minggu .. 6 = Sabtu
  start: string; // "16:00"
  end: string; // "18:00"
}

export async function saveClassAction(input: {
  id?: string;
  name: string;
  level: string;
  description?: string;
  coach_id?: string | null;
  routine_schedules: RoutineScheduleItem[];
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya Head Coach / Admin yang dapat mengelola kelas." };
  }

  const supabase = await createClient();
  const payload = {
    name: input.name.trim(),
    level: input.level.trim(),
    description: input.description?.trim() || null,
    coach_id: input.coach_id || null,
    routine_schedules: input.routine_schedules,
  };

  if (input.id) {
    const { error } = await supabase
      .from("classes")
      .update(payload)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("classes").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/classes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveClassAction(classId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Akses ditolak." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ is_active: false })
    .eq("id", classId);

  if (error) return { error: error.message };

  revalidatePath("/classes");
  revalidatePath("/dashboard");
  return { success: true };
}