import { createClient } from "@/lib/supabase/server";
import {
  AttendanceManager,
  type ClassWithStudents,
} from "@/components/attendance/attendance-manager";

export default async function AttendancePage() {
  const supabase = await createClient();

  const { data: rawClasses } = await supabase
    .from("classes")
    .select(
      `
      id, name, level,
      enrollments(
        is_active,
        students(id, full_name, position, is_active)
      )
    `
    )
    .eq("is_active", true)
    .order("name");

  const classes: ClassWithStudents[] = (rawClasses ?? []).map((c: any) => {
    const activeStudents = (c.enrollments ?? [])
      .filter((e: any) => e.is_active && e.students?.is_active)
      .map((e: any) => ({
        id: e.students.id,
        full_name: e.students.full_name,
        position: e.students.position ?? "All-Round",
      }))
      .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

    return {
      id: c.id,
      name: c.name,
      level: c.level,
      students: activeStudents,
    };
  });

  return <AttendanceManager classes={classes} />;
}