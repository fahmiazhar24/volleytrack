import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  ClassesManager,
  type ClassRow,
} from "@/components/classes/classes-manager";

export default async function ClassesPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const [{ data: rawClasses }, { data: coaches }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, name, level, description, coach_id, routine_schedules, profiles:coach_id(full_name)"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["admin", "coach"])
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("enrollments")
        .select("class_id")
        .eq("is_active", true),
    ]);

  const countMap = new Map<string, number>();
  (enrollments ?? []).forEach((e) => {
    countMap.set(e.class_id, (countMap.get(e.class_id) ?? 0) + 1);
  });

  const classes: ClassRow[] = (rawClasses ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    description: c.description,
    coach_id: c.coach_id,
    coach_name: c.profiles?.full_name ?? null,
    routine_schedules: c.routine_schedules ?? [],
    student_count: countMap.get(c.id) ?? 0,
  }));

  return (
    <ClassesManager
      classes={classes}
      coaches={coaches ?? []}
      isAdmin={profile?.role === "admin"}
    />
  );
}