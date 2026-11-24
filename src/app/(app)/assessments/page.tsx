import { createClient } from "@/lib/supabase/server";
import {
  AssessmentsManager,
  type AssessmentClass,
  type PeriodOption,
  type SkillWithRubrics,
} from "@/components/assessments/assessments-manager";

export default async function AssessmentsPage() {
  const supabase = await createClient();

  const [{ data: rawClasses }, { data: periods }, { data: rawSkills }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          `
          id, name,
          enrollments(
            is_active,
            students(id, full_name, position, is_active)
          )
        `
        )
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("periods")
        .select("id, name, status")
        .order("start_date", { ascending: false }),
      supabase
        .from("skills")
        .select(
          `
          id, name, description, has_raw_metric, raw_metric_unit, sort_order,
          skill_categories(name, sort_order),
          skill_rubrics(level, label, description)
        `
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  const classes: AssessmentClass[] = (rawClasses ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    students: (c.enrollments ?? [])
      .filter((e: any) => e.is_active && e.students?.is_active)
      .map((e: any) => ({
        id: e.students.id,
        full_name: e.students.full_name,
        position: e.students.position ?? "All-Round",
      }))
      .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)),
  }));

  const skills: SkillWithRubrics[] = (rawSkills ?? [])
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      category: s.skill_categories?.name ?? "Umum",
      category_sort_order: s.skill_categories?.sort_order ?? 99,
      sort_order: s.sort_order ?? 99,
      has_raw_metric: Boolean(s.has_raw_metric),
      raw_metric_unit: s.raw_metric_unit ?? null,
      rubrics: (s.skill_rubrics ?? []).map((r: any) => ({
        level: Number(r.level),
        label: r.label ?? "",
        description: r.description ?? "",
      })),
    }))
    .sort((a, b) =>
      a.category_sort_order !== b.category_sort_order
        ? a.category_sort_order - b.category_sort_order
        : a.sort_order - b.sort_order
    );

  return (
    <AssessmentsManager
      classes={classes}
      periods={(periods ?? []) as PeriodOption[]}
      skills={skills}
    />
  );
}