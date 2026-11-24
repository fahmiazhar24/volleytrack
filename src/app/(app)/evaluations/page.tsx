import { createClient } from "@/lib/supabase/server";
import {
  EvaluationsManager,
  type EvalClass,
  type EvalPeriod,
} from "@/components/evaluations/evaluations-manager";
import type { ScoreScale } from "@/lib/scoring";

export default async function EvaluationsPage() {
  const supabase = await createClient();

  const [{ data: rawClasses }, { data: periods }, { data: settings }] =
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
      supabase.from("club_settings").select("score_scale").limit(1).single(),
    ]);

  const classes: EvalClass[] = (rawClasses ?? []).map((c: any) => ({
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

  return (
    <EvaluationsManager
      classes={classes}
      periods={(periods ?? []) as EvalPeriod[]}
      scoreScale={(settings?.score_scale as ScoreScale) ?? "1-5"}
    />
  );
}