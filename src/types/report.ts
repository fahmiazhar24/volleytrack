import type { ScoreScale } from "@/lib/scoring";

export interface ReportSnapshot {
  generated_at: string;
  version: number;
  revision_note: string | null;
  club: {
    club_name: string;
    head_coach_name: string;
    primary_color: string;
    secondary_color: string;
    score_scale: ScoreScale;
    count_izin_as_present: boolean;
    count_sakit_as_present: boolean;
  };
  period: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
  };
  student: {
    id: string;
    full_name: string;
    birth_date: string;
    position: string;
    class_name: string;
  };
  attendance: {
    total_sessions: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    effective_present: number;
    percentage: number;
  };
  overall_score_five: number;
  categories: {
    name: string;
    average_five: number;
    skills: {
      name: string;
      score: number;
      rubric_label: string;
      raw_value: number | null;
      raw_metric_unit: string | null;
      notes: string | null;
    }[];
  }[];
  evaluation: {
    strengths: string;
    areas_to_improve: string;
    training_advice: string;
    next_target: string;
  };
}