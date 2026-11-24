import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  StudentsManager,
  type StudentRow,
} from "@/components/students/students-manager";

export default async function StudentsPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const [{ data: rawStudents }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id, full_name, birth_date, position, notes,
        enrollments(class_id, is_active, classes(name)),
        student_guardians(is_primary, guardians(full_name, phone_wa, email))
      `
      )
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const students: StudentRow[] = (rawStudents ?? []).map((s: any) => {
    const activeEnroll = (s.enrollments ?? []).find((e: any) => e.is_active);
    const primaryGuardian =
      (s.student_guardians ?? []).find((g: any) => g.is_primary)?.guardians ??
      s.student_guardians?.[0]?.guardians;

    return {
      id: s.id,
      full_name: s.full_name,
      birth_date: s.birth_date,
      position: s.position ?? "All-Round",
      notes: s.notes,
      class_id: activeEnroll?.class_id ?? "",
      class_name: activeEnroll?.classes?.name ?? "",
      guardian_name: primaryGuardian?.full_name ?? "",
      guardian_phone: primaryGuardian?.phone_wa ?? "",
      guardian_email: primaryGuardian?.email ?? "",
    };
  });

  return (
    <StudentsManager
      students={students}
      classes={classes ?? []}
      isAdmin={profile?.role === "admin"}
    />
  );
}