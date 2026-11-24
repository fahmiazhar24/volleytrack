"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  LogOut,
  FileText,
  ExternalLink,
  CheckCircle2,
  Award,
  KeyRound,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/app/auth/actions";
import { changeOwnPasswordAction } from "@/app/(app)/settings/users-actions";
import { formatScore, type ScoreScale } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ParentChildData {
  id: string;
  full_name: string;
  position: string;
  class_name: string;
  attendance: {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    percentage: number;
  };
  reports: {
    id: string;
    period_name: string;
    version: number;
    access_token: string;
    published_at: string;
    overall_score_five: number;
    score_scale: ScoreScale;
  }[];
}

interface ParentPortalViewProps {
  guardianName: string;
  activePeriodName: string;
  club: {
    club_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
  };
  childrenList: ParentChildData[];
}

export function ParentPortalView({
  guardianName,
  activePeriodName,
  club,
  childrenList,
}: ParentPortalViewProps) {
  const [selectedChildId, setSelectedChildId] = useState(
    childrenList[0]?.id ?? ""
  );
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const activeChild =
    childrenList.find((c) => c.id === selectedChildId) ?? childrenList[0];

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    const res = await changeOwnPasswordAction(newPassword);
    setSavingPw(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setNewPassword("");
    setPwModalOpen(false);
    toast.success("Kata sandi berhasil diperbarui!");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header Klub */}
      <header
        className="px-4 py-4 text-white shadow-sm"
        style={{ backgroundColor: club.primary_color || "#0f172a" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {club.logo_url ? (
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                <img
                  src={club.logo_url}
                  alt={club.club_name}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: club.secondary_color || "#f97316" }}
              >
                <Trophy className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/75">
                Portal Orangtua
              </p>
              <h1 className="text-base font-bold leading-tight">
                {club.club_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPwModalOpen(true)}
              className="text-white/90 hover:bg-white/10 hover:text-white"
              title="Ubah Kata Sandi"
            >
              <KeyRound className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sandi</span>
            </Button>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-white/90 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-5">
        <div>
          <p className="text-xs text-slate-500">Selamat datang,</p>
          <h2 className="text-xl font-bold text-slate-900">{guardianName}</h2>
        </div>

        {/* Pemilih Anak (Multi-Anak) */}
        {childrenList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {childrenList.map((child) => {
              const active = child.id === activeChild?.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all ${
                    active
                      ? "border-orange-500 bg-orange-500 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-bold">{child.full_name}</p>
                  <p
                    className={`text-[11px] ${
                      active ? "text-white/85" : "text-slate-500"
                    }`}
                  >
                    {child.class_name}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {!activeChild ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Belum ada data siswa yang tertaut ke akun Anda. Silakan hubungi
              Head Coach.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Kartu Profil Atlet + Kehadiran */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {activeChild.full_name}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      {activeChild.class_name} • Posisi: {activeChild.position}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {activePeriodName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Kehadiran Periode Aktif
                  </span>
                  <strong className="text-emerald-700">
                    {activeChild.attendance.total > 0
                      ? `${activeChild.attendance.percentage}% (${activeChild.attendance.hadir}/${activeChild.attendance.total} sesi)`
                      : "Belum ada sesi"}
                  </strong>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="text-emerald-700">Hadir</p>
                    <p className="text-base font-bold text-emerald-900">
                      {activeChild.attendance.hadir}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2">
                    <p className="text-blue-700">Izin</p>
                    <p className="text-base font-bold text-blue-900">
                      {activeChild.attendance.izin}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-2">
                    <p className="text-purple-700">Sakit</p>
                    <p className="text-base font-bold text-purple-900">
                      {activeChild.attendance.sakit}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2">
                    <p className="text-red-700">Alpa</p>
                    <p className="text-base font-bold text-red-900">
                      {activeChild.attendance.alpa}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daftar Rapor Digital Terbit */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
                <FileText className="h-4 w-4 text-orange-500" />
                Riwayat Rapor Digital ({activeChild.reports.length})
              </h3>

              {activeChild.reports.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-slate-500">
                    Belum ada rapor yang dipublikasikan untuk{" "}
                    <strong>{activeChild.full_name}</strong>.
                  </CardContent>
                </Card>
              ) : (
                activeChild.reports.map((rep) => {
                  const score = formatScore(
                    rep.overall_score_five,
                    rep.score_scale
                  );
                  return (
                    <Card key={rep.id}>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">
                              {rep.period_name}
                            </p>
                            <Badge className={`text-[11px] ${score.badgeClass}`}>
                              <Award className="mr-1 h-3 w-3" />
                              {score.displayValue} {score.maxLabel} (
                              {score.predicate})
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            Terbit{" "}
                            {new Date(rep.published_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}{" "}
                            • Versi v{rep.version}
                          </p>
                        </div>

                        <Link
                          href={`/r/${rep.access_token}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                        >
                          Buka & Cetak Rapor
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal Ubah Kata Sandi */}
      {pwModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Ubah Kata Sandi</h3>
              <button
                type="button"
                onClick={() => setPwModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                type="password"
                placeholder="Kata sandi baru (min. 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <Button
                type="submit"
                disabled={savingPw}
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
              >
                {savingPw && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Kata Sandi
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}