"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, Loader2, Info, ChevronDown, ChevronUp, Star } from "lucide-react";
import { toast } from "sonner";
import {
  loadStudentAssessmentsAction,
  saveStudentAssessmentsAction,
} from "@/app/(app)/assessments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AssessmentClass {
  id: string;
  name: string;
  students: { id: string; full_name: string; position: string }[];
}

export interface PeriodOption {
  id: string;
  name: string;
  status: string;
}

export interface SkillWithRubrics {
  id: string;
  name: string;
  description: string | null;
  category: string;
  category_sort_order: number;
  sort_order: number;
  has_raw_metric: boolean;
  raw_metric_unit: string | null;
  rubrics: { level: number; label: string; description: string }[];
}

interface ScoreState {
  score: number;
  raw_value: string;
  notes: string;
}

interface AssessmentsManagerProps {
  classes: AssessmentClass[];
  periods: PeriodOption[];
  skills: SkillWithRubrics[];
}

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white border-red-600",
  2: "bg-orange-500 text-white border-orange-500",
  3: "bg-amber-500 text-white border-amber-500",
  4: "bg-blue-600 text-white border-blue-600",
  5: "bg-emerald-600 text-white border-emerald-600",
};

export function AssessmentsManager({
  classes,
  periods,
  skills,
}: AssessmentsManagerProps) {
  const defaultPeriod =
    periods.find((p) => p.status === "active")?.id ?? periods[0]?.id ?? "";

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedPeriodId, setSelectedPeriodId] = useState(defaultPeriod);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  const [selectedStudentId, setSelectedStudentId] = useState(
    classes[0]?.students[0]?.id ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [openRubricId, setOpenRubricId] = useState<string | null>(null);

  useEffect(() => {
    const firstStudent = currentClass?.students[0]?.id ?? "";
    setSelectedStudentId(firstStudent);
  }, [selectedClassId, currentClass]);

  useEffect(() => {
    if (!selectedStudentId || !selectedPeriodId) {
      setScores({});
      return;
    }

    let cancelled = false;
    async function fetchScores() {
      setLoading(true);
      const res = await loadStudentAssessmentsAction(
        selectedStudentId,
        selectedPeriodId
      );
      if (cancelled) return;

      if (res.error) {
        toast.error(res.error);
      }

      const map: Record<string, ScoreState> = {};
      (res.records ?? []).forEach((r) => {
        map[r.skill_id] = {
          score: r.score,
          raw_value:
            r.raw_value !== undefined && r.raw_value !== null
              ? String(r.raw_value)
              : "",
          notes: r.notes ?? "",
        };
      });
      setScores(map);
      setLoading(false);
    }

    fetchScores();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, selectedPeriodId]);

  const groupedSkills = useMemo(() => {
    const groups = new Map<string, SkillWithRubrics[]>();
    skills.forEach((sk) => {
      const cat = sk.category || "Umum";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(sk);
    });
    return Array.from(groups.entries());
  }, [skills]);

  const stats = useMemo(() => {
    const filled = Object.values(scores).filter((s) => s.score > 0);
    const avg =
      filled.length > 0
        ? (
            filled.reduce((acc, cur) => acc + cur.score, 0) / filled.length
          ).toFixed(2)
        : "0.00";
    return { filledCount: filled.length, total: skills.length, avg };
  }, [scores, skills.length]);

  function setSkillScore(skillId: string, score: number) {
    setScores((prev) => ({
      ...prev,
      [skillId]: {
        score,
        raw_value: prev[skillId]?.raw_value ?? "",
        notes: prev[skillId]?.notes ?? "",
      },
    }));
  }

  function setSkillRawValue(skillId: string, raw_value: string) {
    setScores((prev) => ({
      ...prev,
      [skillId]: {
        score: prev[skillId]?.score ?? 0,
        raw_value,
        notes: prev[skillId]?.notes ?? "",
      },
    }));
  }

  function setSkillNotes(skillId: string, notes: string) {
    setScores((prev) => ({
      ...prev,
      [skillId]: {
        score: prev[skillId]?.score ?? 0,
        raw_value: prev[skillId]?.raw_value ?? "",
        notes,
      },
    }));
  }

  async function handleSave() {
    if (!selectedStudentId || !selectedPeriodId) return;
    setSaving(true);

    const payload = Object.entries(scores)
      .filter(([, val]) => val.score >= 1 && val.score <= 5)
      .map(([skill_id, val]) => ({
        skill_id,
        score: val.score,
        raw_value: val.raw_value.trim() !== "" ? Number(val.raw_value) : null,
        notes: val.notes,
      }));

    const res = await saveStudentAssessmentsAction({
      studentId: selectedStudentId,
      periodId: selectedPeriodId,
      classId: selectedClassId,
      scores: payload,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    const stName =
      currentClass?.students.find((s) => s.id === selectedStudentId)
        ?.full_name ?? "Siswa";
    toast.success(`${res.savedCount} aspek skill ${stName} berhasil disimpan!`);
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Penilaian Skill Voli
          </h1>
          <p className="text-sm text-slate-500">
            Skala 1–5 untuk {skills.length} aspek keterampilan. Ketuk ikon info
            untuk melihat panduan rubrik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Terisi: {stats.filledCount}/{stats.total}
          </Badge>
          <Badge className="bg-orange-100 text-xs text-orange-800 hover:bg-orange-100">
            <Star className="mr-1 h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            Rata-rata: {stats.avg}
          </Badge>
        </div>
      </div>

      {/* Pemilih Kelas, Siswa, Periode */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="as-class">Kelas</Label>
            <select
              id="as-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="as-student">Siswa</Label>
            <select
              id="as-student"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {(currentClass?.students ?? []).length === 0 ? (
                <option value="">Tidak ada siswa</option>
              ) : (
                currentClass!.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} ({st.position})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="as-period">Periode Evaluasi</Label>
            <select
              id="as-period"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === "active" ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Daftar 19 Skill per Kategori */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat nilai siswa...
          </CardContent>
        </Card>
      ) : !selectedStudentId ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Pilih kelas yang memiliki siswa aktif terlebih dahulu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedSkills.map(([category, catSkills]) => (
            <Card key={category}>
              <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  {category} ({catSkills.length} Aspek)
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {catSkills.map((sk) => {
                  const current = scores[sk.id] ?? {
                    score: 0,
                    raw_value: "",
                    notes: "",
                  };
                  const isRubricOpen = openRubricId === sk.id;
                  const activeRubric = sk.rubrics.find(
                    (r) => r.level === current.score
                  );

                  return (
                    <div key={sk.id} className="space-y-2.5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {sk.name}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenRubricId(isRubricOpen ? null : sk.id)
                            }
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Rubrik
                            {isRubricOpen ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        {/* 5 Tombol Skor 1-5 ramah jempol */}
                        <div className="grid grid-cols-5 gap-1.5 sm:w-64">
                          {[1, 2, 3, 4, 5].map((num) => {
                            const selected = current.score === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setSkillScore(sk.id, num)}
                                className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition-all active:scale-95 ${
                                  selected
                                    ? SCORE_COLORS[num]
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ringkasan rubrik untuk skor terpilih */}
                      {activeRubric && !isRubricOpen && (
                        <p className="rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                          <strong>
                            Skor {current.score}
                            {activeRubric.label ? ` (${activeRubric.label})` : ""}:
                          </strong>{" "}
                          {activeRubric.description}
                        </p>
                      )}

                      {/* Panduan lengkap rubrik 1-5 (Expandable) */}
                      {isRubricOpen && (
                        <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                          {[...sk.rubrics]
                            .sort((a, b) => a.level - b.level)
                            .map((r) => (
                              <div
                                key={r.level}
                                className={`flex gap-2 rounded px-2 py-1 ${
                                  current.score === r.level
                                    ? "bg-orange-100/80 font-medium text-slate-900"
                                    : "text-slate-600"
                                }`}
                              >
                                <span className="w-5 shrink-0 font-bold">
                                  {r.level}.
                                </span>
                                <span>
                                  {r.label && (
                                    <strong className="mr-1">[{r.label}]</strong>
                                  )}
                                  {r.description}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Metrik mentah + catatan singkat jika skor sudah dipilih */}
                      {current.score > 0 && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {sk.has_raw_metric && (
                            <div className="flex items-center gap-1.5 sm:w-52">
                              <Input
                                type="number"
                                step="any"
                                placeholder="Nilai ukur"
                                value={current.raw_value}
                                onChange={(e) =>
                                  setSkillRawValue(sk.id, e.target.value)
                                }
                                className="h-8 text-xs"
                              />
                              {sk.raw_metric_unit && (
                                <span className="shrink-0 text-[11px] text-slate-500">
                                  {sk.raw_metric_unit}
                                </span>
                              )}
                            </div>
                          )}
                          <Input
                            placeholder="Catatan singkat coach (opsional)..."
                            value={current.notes}
                            onChange={(e) =>
                              setSkillNotes(sk.id, e.target.value)
                            }
                            className="h-8 flex-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tombol Simpan Sticky */}
      {selectedStudentId && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-12 w-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600 md:w-auto md:px-8"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Penilaian ({stats.filledCount}/{stats.total})
          </Button>
        </div>
      )}
    </div>
  );
}