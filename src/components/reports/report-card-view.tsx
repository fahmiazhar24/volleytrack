"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Printer,
  Calendar,
  CheckCircle2,
  Award,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ReportSnapshot } from "@/types/report";
import { formatScore } from "@/lib/scoring";
import { SkillRadarChart } from "@/components/reports/skill-radar-chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReportCardViewProps {
  snapshot: ReportSnapshot;
  accessToken?: string;
  showPrintButton?: boolean;
}

function calcAge(birthDate: string) {
  if (!birthDate) return "-";
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function ReportCardView({
  snapshot,
  accessToken,
  showPrintButton = true,
}: ReportCardViewProps) {
  const router = useRouter();
  const [reportUrl, setReportUrl] = useState("");
  const { club, period, student, attendance, categories, evaluation } =
    snapshot;
  const overall = formatScore(snapshot.overall_score_five, club.score_scale);

  useEffect(() => {
    if (accessToken && typeof window !== "undefined") {
      setReportUrl(`${window.location.origin}/r/${accessToken}`);
    }
  }, [accessToken]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-0">
      {showPrintButton && (
        <div className="space-y-2 print:hidden">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="bg-white"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Kembali
            </Button>
            <Button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Printer className="mr-2 h-4 w-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Versi Rapor: <strong>v{snapshot.version}</strong> • Terbit{" "}
            {new Date(snapshot.generated_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Kertas Rapor */}
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        {/* Header Klub */}
        <header
          className="px-6 py-6 text-white print:rounded-xl print:px-5 print:py-4"
          style={{ backgroundColor: club.primary_color || "#0f172a" }}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:flex-row print:items-center">
            <div className="flex items-center gap-3.5">
              {club.logo_url ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-xs print:h-12 print:w-12">
                  <img
                    src={club.logo_url}
                    alt={club.club_name}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: club.secondary_color || "#f97316" }}
                >
                  <Trophy className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                  Rapor Perkembangan Atlet
                </p>
                <h1 className="text-xl font-bold text-white print:text-lg">
                  {club.club_name}
                </h1>
              </div>
            </div>
            <div className="text-left sm:text-right print:text-right">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: club.secondary_color || "#f97316" }}
              >
                <Calendar className="h-3.5 w-3.5" />
                {period.name}
              </span>
              {snapshot.version > 1 && (
                <p className="mt-1 text-[11px] text-white/80">
                  Revisi v{snapshot.version}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6 print:space-y-4 print:px-0 print:py-4">
          {/* Identitas Siswa + Skor Utama */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3 print:grid-cols-3 print:p-3.5">
            <div className="space-y-1 sm:col-span-2 print:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Identitas Atlet
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                {student.full_name}
              </h2>
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-600">
                <span>
                  Kelas:{" "}
                  <strong className="text-slate-900">{student.class_name}</strong>
                </span>
                <span>•</span>
                <span>
                  Posisi:{" "}
                  <strong className="text-slate-900">{student.position}</strong>
                </span>
                <span>•</span>
                <span>
                  Usia:{" "}
                  <strong className="text-slate-900">
                    {calcAge(student.birth_date)} tahun
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start justify-center rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs sm:items-end print:items-end print:p-3">
              <p className="text-[11px] font-medium uppercase text-slate-400">
                Indeks Performa
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {overall.displayValue}
                </span>
                <span className="text-xs text-slate-400">{overall.maxLabel}</span>
              </div>
              <Badge className={`mt-1 text-[11px] ${overall.badgeClass}`}>
                <Award className="mr-1 h-3 w-3" />
                {overall.predicate}
              </Badge>
            </div>
          </div>

          {/* Rekap Kehadiran */}
          <section className="space-y-2.5 print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Rekap Kehadiran Latihan
              </h3>
              <span className="text-sm font-bold text-emerald-700">
                {attendance.total_sessions > 0
                  ? `${attendance.percentage}% Kehadiran`
                  : "Belum ada sesi tercatat"}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 p-2.5">
                <p className="text-[11px] text-slate-500">Total Sesi</p>
                <p className="text-lg font-bold text-slate-900">
                  {attendance.total_sessions}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
                <p className="text-[11px] text-emerald-700">Hadir</p>
                <p className="text-lg font-bold text-emerald-800">
                  {attendance.hadir}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2.5">
                <p className="text-[11px] text-blue-700">Izin</p>
                <p className="text-lg font-bold text-blue-800">
                  {attendance.izin}
                </p>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-2.5">
                <p className="text-[11px] text-purple-700">Sakit</p>
                <p className="text-lg font-bold text-purple-800">
                  {attendance.sakit}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-2.5">
                <p className="text-[11px] text-red-700">Alpa</p>
                <p className="text-lg font-bold text-red-800">
                  {attendance.alpa}
                </p>
              </div>
            </div>
          </section>

          {/* Profil Radar Kemampuan Atlet */}
          {categories.length >= 3 && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 print:break-inside-avoid print:p-3">
              <h3 className="mb-1 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                Peta Keseimbangan Kemampuan Atlet
              </h3>
              <SkillRadarChart
                categories={categories}
                scoreScale={club.score_scale}
                accentColor={club.secondary_color || "#f97316"}
              />
            </section>
          )}

          {/* Ringkasan & Rincian Skill per Kategori — mulai rapi di halaman baru saat cetak */}
          <section className="space-y-3.5 print:break-before-page print:space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 print:break-after-avoid">
              Evaluasi Keterampilan Voli
            </h3>

            {categories.map((cat) => {
              const catScore = formatScore(cat.average_five, club.score_scale);
              return (
                <div
                  key={cat.name}
                  className="overflow-hidden rounded-xl border border-slate-200 print:break-inside-avoid"
                >
                  <div className="flex items-center justify-between bg-slate-100 px-4 py-2 print:py-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                      {cat.name}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Rata-rata: {catScore.displayValue} {catScore.maxLabel} (
                      {catScore.predicate})
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {cat.skills.map((sk) => {
                      const skDisplay = formatScore(sk.score, club.score_scale);
                      const pct = Math.min(100, Math.round((sk.score / 5) * 100));
                      return (
                        <div
                          key={sk.name}
                          className="flex flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center print:py-1.5"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="text-sm font-medium text-slate-900 print:text-xs">
                              {sk.name}
                              {sk.raw_value !== null && (
                                <span className="ml-2 text-xs font-normal text-slate-500 print:text-[11px]">
                                  ({sk.raw_value} {sk.raw_metric_unit ?? ""})
                                </span>
                              )}
                            </p>
                            {sk.notes && (
                              <p className="text-xs text-slate-500 print:text-[11px]">
                                Catatan: {sk.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 sm:w-60 print:w-56">
                            <div className="h-2 flex-1 overflow-hidden rounded-full border border-slate-200/70 bg-slate-100">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    club.secondary_color || "#f97316",
                                }}
                              />
                            </div>
                            <span className="w-28 shrink-0 text-right text-xs font-bold text-slate-800 print:text-[11px]">
                              {club.score_scale === "1-100"
                                ? `${skDisplay.displayValue} / 100`
                                : `${sk.score} / 5`}
                              {sk.rubric_label ? ` • ${sk.rubric_label}` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Catatan Evaluasi Coach */}
          <section className="space-y-3 print:break-inside-avoid">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 print:break-after-avoid">
              Catatan & Rekomendasi Pelatih
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 print:p-3">
                <p className="text-xs font-bold uppercase text-emerald-800">
                  Kekuatan & Perkembangan
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 print:text-xs">
                  {evaluation.strengths || "-"}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 print:p-3">
                <p className="text-xs font-bold uppercase text-amber-800">
                  Area yang Perlu Ditingkatkan
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 print:text-xs">
                  {evaluation.areas_to_improve || "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 print:p-3">
              <p className="text-xs font-bold uppercase text-slate-700">
                Saran Latihan (Klub & Mandiri di Rumah)
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 print:text-xs">
                {evaluation.training_advice || "-"}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 print:p-3">
              <p className="text-xs font-bold uppercase text-blue-800">
                Target Periode Berikutnya
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 print:text-xs">
                {evaluation.next_target || "-"}
              </p>
            </div>
          </section>

          {/* Pengesahan Head Coach + QR Verifikasi */}
          <footer className="flex flex-col items-start justify-between gap-5 border-t border-slate-200 pt-5 sm:flex-row sm:items-end print:break-inside-avoid print:flex-row print:items-end print:pt-4">
            <div className="flex items-center gap-3">
              {reportUrl && (
                <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                  <QRCodeSVG value={reportUrl} size={64} />
                </div>
              )}
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-700">
                  Verifikasi Rapor Digital
                </p>
                <p>Pindai QR untuk membuka versi resmi VolleyTrack.</p>
                {snapshot.revision_note && (
                  <p className="mt-1 text-amber-700">
                    Catatan revisi: {snapshot.revision_note}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right print:text-right">
              <p className="text-xs text-slate-500">Mengetahui,</p>
              {club.head_coach_signature_url ? (
                <img
                  src={club.head_coach_signature_url}
                  alt="Tanda Tangan Head Coach"
                  className="my-2 h-14 w-auto object-contain sm:ml-auto print:ml-auto"
                />
              ) : (
                <div className="h-10" />
              )}
              <p className="text-sm font-bold text-slate-900">
                {club.head_coach_name}
              </p>
              <p className="text-xs text-slate-500">
                Head Coach • {club.club_name}
              </p>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}