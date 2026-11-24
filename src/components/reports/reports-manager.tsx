"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileCheck2,
  ExternalLink,
  Copy,
  MessageCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { publishReportCardAction } from "@/app/(app)/reports/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ReportStudentRow {
  student_id: string;
  full_name: string;
  position: string;
  class_id: string;
  class_name: string;
  guardian_name: string;
  guardian_phone: string;
  period_id: string;
  has_scores: boolean;
  eval_status: "none" | "draft" | "review" | "published";
  report_token: string | null;
  report_version: number | null;
  published_at: string | null;
}

interface ReportsManagerProps {
  periods: { id: string; name: string; status: string }[];
  classes: { id: string; name: string }[];
  rowsByPeriod: Record<string, ReportStudentRow[]>;
  clubName: string;
  isAdmin: boolean;
}

function formatWaNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function ReportsManager({
  periods,
  classes,
  rowsByPeriod,
  clubName,
  isAdmin,
}: ReportsManagerProps) {
  const defaultPeriod =
    periods.find((p) => p.status === "active")?.id ?? periods[0]?.id ?? "";

  const [selectedPeriodId, setSelectedPeriodId] = useState(defaultPeriod);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

  const selectedPeriodName =
    periods.find((p) => p.id === selectedPeriodId)?.name ?? "";

  const rows = useMemo(() => {
    const list = rowsByPeriod[selectedPeriodId] ?? [];
    if (selectedClassId === "all") return list;
    return list.filter((r) => r.class_id === selectedClassId);
  }, [rowsByPeriod, selectedPeriodId, selectedClassId]);

  async function handlePublish(row: ReportStudentRow, isRevision: boolean) {
    let revisionNote = "";
    if (isRevision) {
      const note = prompt(
        `Masukkan catatan revisi untuk rapor ${row.full_name} (opsional):`,
        "Pembaruan nilai/catatan evaluasi"
      );
      if (note === null) return;
      revisionNote = note;
    }

    setBusyStudentId(row.student_id);
    const res = await publishReportCardAction({
      studentId: row.student_id,
      periodId: selectedPeriodId,
      revisionNote,
    });
    setBusyStudentId(null);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(
      `Rapor ${row.full_name} (v${res.version}) berhasil diterbitkan!`
    );
  }

  function copyReportLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link rapor berhasil disalin!");
  }

  function openWhatsApp(row: ReportStudentRow) {
    if (!row.report_token) return;
    const url = `${window.location.origin}/r/${row.report_token}`;
    const greeting = row.guardian_name
      ? `Yth. ${row.guardian_name}`
      : "Yth. Orangtua/Wali";
    const text = `${greeting},\n\nRapor perkembangan latihan voli *${row.full_name}* untuk periode *${selectedPeriodName}* dari *${clubName}* sudah terbit.\n\nSilakan buka & simpan PDF rapornya melalui tautan berikut:\n${url}\n\nTerima kasih.`;

    const waPhone = row.guardian_phone
      ? formatWaNumber(row.guardian_phone)
      : "";
    const waUrl = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Rapor Digital & Publikasi
        </h1>
        <p className="text-sm text-slate-500">
          Kunci snapshot rapor per periode, cetak PDF, atau kirim link langsung
          ke WhatsApp orangtua.
        </p>
      </div>

      {/* Filter Periode & Kelas */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-64"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.status === "active" ? "(Aktif)" : ""}
            </option>
          ))}
        </select>

        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-56"
        >
          <option value="all">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Daftar Status Rapor Siswa */}
      <div className="space-y-3">
        {rows.map((row) => {
          const isBusy = busyStudentId === row.student_id;
          const readyToPublish =
            row.has_scores && row.eval_status !== "none";

          return (
            <Card key={row.student_id}>
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {row.full_name}
                    </p>
                    <Badge variant="outline" className="text-[11px]">
                      {row.class_name}
                    </Badge>
                    {row.report_token ? (
                      <Badge className="bg-emerald-100 text-[11px] text-emerald-800 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Terbit v{row.report_version}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-[11px] text-slate-600 hover:bg-slate-100">
                        <Clock className="mr-1 h-3 w-3" />
                        Belum Terbit
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Nilai Skill:{" "}
                      <strong
                        className={
                          row.has_scores ? "text-emerald-700" : "text-amber-600"
                        }
                      >
                        {row.has_scores ? "Terisi" : "Kosong"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Evaluasi:{" "}
                      <strong
                        className={
                          row.eval_status !== "none"
                            ? "text-emerald-700"
                            : "text-amber-600"
                        }
                      >
                        {row.eval_status === "none"
                          ? "Belum dibuat"
                          : row.eval_status.toUpperCase()}
                      </strong>
                    </span>
                    {row.guardian_name && (
                      <>
                        <span>•</span>
                        <span>Wali: {row.guardian_name}</span>
                      </>
                    )}
                  </div>
                </div>
{/* Aksi */}
                <div className="flex flex-wrap items-center gap-2">
                  {row.report_token && (
                    <>
                      <Link
                        href={`/r/${row.report_token}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lihat Rapor
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyReportLink(row.report_token!)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Salin Link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openWhatsApp(row)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                        Kirim WA
                      </Button>
                    </>
                  )}

                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy || !readyToPublish}
                      onClick={() =>
                        handlePublish(row, Boolean(row.report_token))
                      }
                      className={
                        row.report_token
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : row.report_token ? (
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {row.report_token
                        ? "Terbitkan Revisi"
                        : "Publikasikan Rapor"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}