"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Save,
  Send,
  Loader2,
  Star,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadStudentEvaluationAction,
  saveEvaluationAction,
  type SkillSummaryItem,
} from "@/app/(app)/evaluations/actions";
import { formatScore, type ScoreScale } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface EvalClass {
  id: string;
  name: string;
  students: { id: string; full_name: string; position: string }[];
}

export interface EvalPeriod {
  id: string;
  name: string;
  status: string;
}

interface EvaluationsManagerProps {
  classes: EvalClass[];
  periods: EvalPeriod[];
  scoreScale: ScoreScale;
}

const STATUS_BADGE: Record<
  "draft" | "review" | "published",
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  review: {
    label: "Menunggu Review Head Coach",
    className: "bg-amber-100 text-amber-800",
  },
  published: {
    label: "Sudah Dipublikasikan",
    className: "bg-emerald-100 text-emerald-800",
  },
};

export function EvaluationsManager({
  classes,
  periods,
  scoreScale,
}: EvaluationsManagerProps) {
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

  const [skillSummaries, setSkillSummaries] = useState<SkillSummaryItem[]>([]);
  const [status, setStatus] = useState<"draft" | "review" | "published">(
    "draft"
  );
  const [strengths, setStrengths] = useState("");
  const [areasToImprove, setAreasToImprove] = useState("");
  const [trainingAdvice, setTrainingAdvice] = useState("");
  const [nextTarget, setNextTarget] = useState("");

  useEffect(() => {
    setSelectedStudentId(currentClass?.students[0]?.id ?? "");
  }, [selectedClassId, currentClass]);

  useEffect(() => {
    if (!selectedStudentId || !selectedPeriodId) {
      setSkillSummaries([]);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await loadStudentEvaluationAction(
        selectedStudentId,
        selectedPeriodId
      );
      if (cancelled) return;

      setSkillSummaries(res.skillSummaries);
      setStatus(res.evaluation.status);
      setStrengths(res.evaluation.strengths);
      setAreasToImprove(res.evaluation.areas_to_improve);
      setTrainingAdvice(res.evaluation.training_advice);
      setNextTarget(res.evaluation.next_target);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, selectedPeriodId]);

  const scoreOverview = useMemo(() => {
    if (skillSummaries.length === 0) return null;
    const avg =
      skillSummaries.reduce((acc, cur) => acc + cur.score, 0) /
      skillSummaries.length;

    const byCategory = new Map<string, number[]>();
    skillSummaries.forEach((item) => {
      if (!byCategory.has(item.category_name)) {
        byCategory.set(item.category_name, []);
      }
      byCategory.get(item.category_name)!.push(item.score);
    });

    const categories = Array.from(byCategory.entries()).map(([name, vals]) => ({
      name,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));

    return { avg, categories };
  }, [skillSummaries]);

  function handleAutoDraft() {
    if (skillSummaries.length === 0) {
      toast.error(
        "Belum ada nilai skill untuk periode ini. Isi penilaian skill dulu."
      );
      return;
    }

    const sortedDesc = [...skillSummaries].sort((a, b) => b.score - a.score);
    const sortedAsc = [...skillSummaries].sort((a, b) => a.score - b.score);

    const topSkills = sortedDesc.filter((s) => s.score >= 4).slice(0, 4);
    const fallbackTop = topSkills.length > 0 ? topSkills : sortedDesc.slice(0, 3);

    const lowSkills = sortedAsc.filter((s) => s.score <= 2.5).slice(0, 4);
    const fallbackLow = lowSkills.length > 0 ? lowSkills : sortedAsc.slice(0, 3);

    const studentName =
      currentClass?.students.find((s) => s.id === selectedStudentId)
        ?.full_name ?? "Siswa";

    const draftStrengths = `${studentName} menunjukkan perkembangan positif terutama pada aspek ${fallbackTop
      .map((s) => `${s.skill_name} (skor ${s.score})`)
      .join(", ")}. Konsistensi teknik pada aspek-aspek tersebut menjadi modal kuat dalam permainan tim.`;

    const draftAreas = `Aspek yang masih perlu difokuskan pada periode mendatang adalah ${fallbackLow
      .map((s) => `${s.skill_name} (skor ${s.score})`)
      .join(", ")} agar penguasaan dasar lebih stabil saat situasi pertandingan.`;

    const adviceLines = fallbackLow
      .map((s) =>
        s.suggestion_template
          ? `• ${s.skill_name}: ${s.suggestion_template}`
          : `• ${s.skill_name}: Perbanyak repetisi drill dasar secara bertahap di sesi latihan maupun mandiri di rumah.`
      )
      .join("\n");

    const draftTarget = `Meningkatkan skor minimal +1 level pada aspek ${fallbackLow
      .slice(0, 2)
      .map((s) => s.skill_name)
      .join(" dan ")} serta menjaga kehadiran latihan minimal 85% pada periode berikutnya.`;

    setStrengths(draftStrengths);
    setAreasToImprove(draftAreas);
    setTrainingAdvice(adviceLines);
    setNextTarget(draftTarget);

    toast.success("Auto-Draft berhasil dibuat dari nilai & rubrik skill!");
  }

  async function handleSave(targetStatus: "draft" | "review") {
    if (!selectedStudentId || !selectedPeriodId) return;
    setSaving(true);

    const res = await saveEvaluationAction({
      studentId: selectedStudentId,
      periodId: selectedPeriodId,
      classId: selectedClassId,
      strengths,
      areas_to_improve: areasToImprove,
      training_advice: trainingAdvice,
      next_target: nextTarget,
      status: targetStatus,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    if (res.status) setStatus(res.status);
    toast.success(
      targetStatus === "review"
        ? "Evaluasi disimpan & diajukan untuk review/publikasi rapor!"
        : "Draft evaluasi berhasil disimpan."
    );
  }

  const formattedOverall = scoreOverview
    ? formatScore(scoreOverview.avg, scoreScale)
    : null;

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Evaluasi 3 Bulan
          </h1>
          <p className="text-sm text-slate-500">
            Susun catatan kekuatan, area pengembangan, saran latihan, dan target
            siswa sebelum publikasi rapor.
          </p>
        </div>
        <Badge className={STATUS_BADGE[status].className}>
          {STATUS_BADGE[status].label}
        </Badge>
      </div>

      {/* Filter Kelas, Siswa, Periode */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-class">Kelas</Label>
            <select
              id="ev-class"
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
            <Label htmlFor="ev-student">Siswa</Label>
            <select
              id="ev-student"
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
            <Label htmlFor="ev-period">Periode Evaluasi</Label>
            <select
              id="ev-period"
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

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat data evaluasi...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Ringkasan Nilai Skill sebagai Referensi Coach */}
          <Card>
            <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-orange-500" />
                Ringkasan Nilai Skill Periode Ini ({skillSummaries.length} aspek)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDraft}
                disabled={skillSummaries.length === 0}
                className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Auto-Draft dari Nilai Skill
              </Button>
            </CardHeader>
            <CardContent>
              {!scoreOverview || !formattedOverall ? (
                <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:flex-row sm:items-center">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Siswa ini belum memiliki nilai skill di periode terpilih.
                  </span>
                  <Link
                    href="/assessments"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    Isi Nilai Skill <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                      <p className="text-[11px] text-slate-300">
                        Rata-rata Keseluruhan
                      </p>
                      <p className="text-xl font-bold">
                        {formattedOverall.displayValue}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {formattedOverall.maxLabel}
                        </span>
                      </p>
                    </div>
                    <Badge className={`text-xs ${formattedOverall.badgeClass}`}>
                      Predikat: {formattedOverall.predicate}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {scoreOverview.categories.map((cat) => {
                      const f = formatScore(cat.avg, scoreScale);
                      return (
                        <div
                          key={cat.name}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                        >
                          <p className="truncate text-xs text-slate-500">
                            {cat.name}
                          </p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900">
                            {f.displayValue}{" "}
                            <span className="text-[11px] font-normal text-slate-400">
                              {f.maxLabel}
                            </span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Narasi Evaluasi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Catatan Evaluasi Naratif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ev-strengths">
                  1. Kekuatan & Perkembangan Utama
                </Label>
                <textarea
                  id="ev-strengths"
                  rows={3}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Tuliskan poin keunggulan atau progres paling menonjol dari siswa..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-improve">
                  2. Area yang Perlu Ditingkatkan
                </Label>
                <textarea
                  id="ev-improve"
                  rows={3}
                  value={areasToImprove}
                  onChange={(e) => setAreasToImprove(e.target.value)}
                  placeholder="Tuliskan aspek teknik, fisik, atau sikap yang masih perlu diperbaiki..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-advice">
                  3. Saran Latihan (di Klub & Mandiri di Rumah)
                </Label>
                <textarea
                  id="ev-advice"
                  rows={4}
                  value={trainingAdvice}
                  onChange={(e) => setTrainingAdvice(e.target.value)}
                  placeholder="Klik Auto-Draft untuk menarik saran langsung dari rubrik, lalu sesuaikan..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ev-target">4. Target Periode Berikutnya</Label>
                <textarea
                  id="ev-target"
                  rows={2}
                  value={nextTarget}
                  onChange={(e) => setNextTarget(e.target.value)}
                  placeholder="Contoh: Mampu melakukan servis atas stabil 7/10 percobaan..."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => handleSave("draft")}
                  className="h-11"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Draft
                </Button>

                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("review")}
                  className="h-11 bg-orange-500 text-white hover:bg-orange-600"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : status === "published" ? (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {status === "published"
                    ? "Perbarui Evaluasi"
                    : "Ajukan Siap Publikasi"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}