"use client";

import { useState } from "react";
import { Save, Loader2, Sliders, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  updateClubSettingsAction,
  type ClubSettingsPayload,
} from "@/app/(app)/settings/actions";
import type { ScoreScale } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClubSettingsFormProps {
  initialSettings: ClubSettingsPayload;
}

export function ClubSettingsForm({ initialSettings }: ClubSettingsFormProps) {
  const [clubName, setClubName] = useState(initialSettings.club_name);
  const [headCoachName, setHeadCoachName] = useState(
    initialSettings.head_coach_name
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialSettings.primary_color
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialSettings.secondary_color
  );
  const [scoreScale, setScoreScale] = useState<ScoreScale>(
    initialSettings.score_scale
  );
  const [countIzin, setCountIzin] = useState(
    initialSettings.count_izin_as_present
  );
  const [countSakit, setCountSakit] = useState(
    initialSettings.count_sakit_as_present
  );
  const [reportLanguage, setReportLanguage] = useState<"id" | "en" | "both">(
    initialSettings.report_language
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await updateClubSettingsAction({
      id: initialSettings.id,
      club_name: clubName,
      head_coach_name: headCoachName,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      score_scale: scoreScale,
      count_izin_as_present: countIzin,
      count_sakit_as_present: countSakit,
      report_language: reportLanguage,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success("Pengaturan klub berhasil disimpan!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan Klub & Rapor
        </h1>
        <p className="text-sm text-slate-500">
          Identitas klub, standar skala nilai rapor, dan aturan perhitungan
          kehadiran.
        </p>
      </div>

      {/* Identitas Klub */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            Identitas & Branding Klub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="club-name">Nama Klub / Akademi</Label>
              <Input
                id="club-name"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="head-coach">
                Nama Head Coach (Penandatangan Rapor)
              </Label>
              <Input
                id="head-coach"
                value={headCoachName}
                onChange={(e) => setHeadCoachName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Warna Utama</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-200 p-1"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondary-color">Warna Aksen</Label>
              <div className="flex items-center gap-2">
                <input
                  id="secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-200 p-1"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skala Nilai & Aturan Absensi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-4 w-4 text-orange-500" />
            Aturan Penilaian & Kehadiran Rapor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Format Tampilan Skor di Rapor Orangtua</Label>
            <p className="text-xs text-slate-500">
              Input coach di lapangan tetap menggunakan rubrik 1–5 agar cepat
              dan seragam. Pilihan ini mengatur format yang tampil di rapor.
            </p>
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScoreScale("1-5")}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  scoreScale === "1-5"
                    ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">
                  Skala 1–5 + Predikat (Disarankan)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Contoh: <strong>3.80 / 5.00 (Mahir)</strong>. Ramah pembinaan
                  atlet usia dini.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScoreScale("1-100")}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  scoreScale === "1-100"
                    ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">
                  Konversi Skala 1–100 + Predikat
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Contoh: <strong>76 / 100 (Mahir)</strong>. Dikonversi otomatis
                  (skor × 20).
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <Label>Aturan Perhitungan Persentase Kehadiran</Label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={countIzin}
                onChange={(e) => setCountIzin(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Hitung status &ldquo;Izin&rdquo; sebagai Hadir
                </p>
                <p className="text-xs text-slate-500">
                  Jika dicentang, siswa yang izin resmi tidak mengurangi
                  persentase kehadiran di rapor.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={countSakit}
                onChange={(e) => setCountSakit(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Hitung status &ldquo;Sakit&rdquo; sebagai Hadir
                </p>
                <p className="text-xs text-slate-500">
                  Jika dicentang, ketidakhadiran karena sakit tidak mengurangi
                  persentase kehadiran di rapor.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-4 sm:max-w-xs">
            <Label htmlFor="report-lang">Bahasa Rapor</Label>
            <select
              id="report-lang"
              value={reportLanguage}
              onChange={(e) =>
                setReportLanguage(e.target.value as "id" | "en" | "both")
              }
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
              <option value="both">Dwibahasa (ID / EN)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="h-11 bg-orange-500 px-6 text-white hover:bg-orange-600"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
}