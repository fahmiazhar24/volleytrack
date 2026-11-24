"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface SkillSummaryItem {
  skill_id: string;
  skill_name: string;
  category_name: string;
  score: number;
  rubric_label: string;
  suggestion_template: string | null;
}

export interface EvaluationFormData {
  id: string | null;
  strengths: string;
  areas_to_improve: string;
  training_advice: string;
  next_target: string;
  status: "draft" | "review" | "published";
}

export async function loadStudentEvaluationAction(
  studentId: string,
  periodId: string
) {
  const supabase = await createClient();

  const [{ data: evaluation }, { data: assessment }] = await Promise.all([
    supabase
      .from("evaluations")
      .select(
        "id, strengths, areas_to_improve, training_advice, next_target, status"
      )
      .eq("student_id", studentId)
      .eq("period_id", periodId)
      .maybeSingle(),
    supabase
      .from("assessments")
      .select("id")
      .eq("student_id", studentId)
      .eq("period_id", periodId)
      .maybeSingle(),
  ]);

  let skillSummaries: SkillSummaryItem[] = [];

  if (assessment?.id) {
    const { data: rawScores } = await supabase
      .from("assessment_scores")
      .select(
        `
        score,
        skills(
          id, name,
          skill_categories(name),
          skill_rubrics(level, label, suggestion_template)
        )
      `
      )
      .eq("assessment_id", assessment.id);

    skillSummaries = (rawScores ?? [])
      .filter((row: any) => row.skills)
      .map((row: any) => {
        const numericScore = Number(row.score);
        const roundedLevel = Math.min(5, Math.max(1, Math.round(numericScore)));
        const matchedRubric = (row.skills.skill_rubrics ?? []).find(
          (r: any) => Number(r.level) === roundedLevel
        );

        return {
          skill_id: row.skills.id,
          skill_name: row.skills.name,
          category_name: row.skills.skill_categories?.name ?? "Umum",
          score: numericScore,
          rubric_label: matchedRubric?.label ?? "",
          suggestion_template: matchedRubric?.suggestion_template ?? null,
        };
      });
  }

  return {
    evaluation: evaluation
      ? ({
          id: evaluation.id,
          strengths: evaluation.strengths ?? "",
          areas_to_improve: evaluation.areas_to_improve ?? "",
          training_advice: evaluation.training_advice ?? "",
          next_target: evaluation.next_target ?? "",
          status: evaluation.status as "draft" | "review" | "published",
        } satisfies EvaluationFormData)
      : ({
          id: null,
          strengths: "",
          areas_to_improve: "",
          training_advice: "",
          next_target: "",
          status: "draft",
        } satisfies EvaluationFormData),
    skillSummaries,
  };
}

export async function saveEvaluationAction(input: {
  studentId: string;
  periodId: string;
  classId?: string | null;
  strengths: string;
  areas_to_improve: string;
  training_advice: string;
  next_target: string;
  status: "draft" | "review";
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || !["admin", "coach"].includes(profile.role)) {
    return { error: "Hanya Coach atau Admin yang dapat menyimpan evaluasi." };
  }

  if (!input.studentId || !input.periodId) {
    return { error: "Siswa dan periode wajib dipilih." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("evaluations")
    .select("status")
    .eq("student_id", input.studentId)
    .eq("period_id", input.periodId)
    .maybeSingle();

  // Jika sudah published, tetap pertahankan status published kecuali direvisi lewat modul Rapor
  const nextStatus: "draft" | "review" | "published" =
  existing?.status === "published" ? "published" : input.status;

  const { error } = await supabase.from("evaluations").upsert(
    {
      student_id: input.studentId,
      period_id: input.periodId,
      class_id: input.classId || null,
      strengths: input.strengths.trim() || null,
      areas_to_improve: input.areas_to_improve.trim() || null,
      training_advice: input.training_advice.trim() || null,
      next_target: input.next_target.trim() || null,
      status: nextStatus,
      reviewed_by: profile.role === "admin" ? profile.id : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,period_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/evaluations");
  revalidatePath("/reports");
  return { success: true, status: nextStatus };
}