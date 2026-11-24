"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface SkillScoreInput {
  skill_id: string;
  score: number; // 1 - 5
  note?: string;
}

export async function loadStudentAssessmentsAction(
  studentId: string,
  periodId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skill_assessments")
    .select("skill_id, score, note")
    .eq("student_id", studentId)
    .eq("period_id", periodId);

  if (error) {
    return { error: error.message, records: [] };
  }

  return {
    records: (data ?? []) as SkillScoreInput[],
  };
}

export async function saveStudentAssessmentsAction(input: {
  studentId: string;
  periodId: string;
  scores: SkillScoreInput[];
}) {
  const profile = await getCurrentUserProfile();
  if (!profile || !["admin", "coach"].includes(profile.role)) {
    return { error: "Hanya Coach atau Admin yang dapat menyimpan penilaian." };
  }

  if (!input.studentId || !input.periodId) {
    return { error: "Siswa dan periode wajib dipilih." };
  }

  const validScores = input.scores.filter((s) => s.score >= 1 && s.score <= 5);
  if (validScores.length === 0) {
    return { error: "Belum ada skor yang diisi." };
  }

  const supabase = await createClient();
  const payload = validScores.map((s) => ({
    student_id: input.studentId,
    period_id: input.periodId,
    skill_id: s.skill_id,
    score: s.score,
    note: s.note?.trim() || null,
    assessed_by: profile.id,
  }));

  const { error } = await supabase
    .from("skill_assessments")
    .upsert(payload, { onConflict: "student_id,period_id,skill_id" });

  if (error) return { error: error.message };

  revalidatePath("/assessments");
  revalidatePath("/dashboard");
  return { success: true, savedCount: payload.length };
}