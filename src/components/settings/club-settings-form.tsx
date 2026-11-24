"use client";

import { useState } from "react";
import {
  Save,
  Loader2,
  Sliders,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateClubSettingsAction,
  uploadClubAssetAction,
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
  const [logoUrl, setLogoUrl] = useState(initialSettings.logo_url ?? "");
  const [signatureUrl, setSignatureUrl] = useState(
    initialSettings.head_coach_signature_url ?? ""
  );
  const [uploadingKind, setUploadingKind] = useState<
    "logo" | "signature" | null
  >(null);

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

  async function handleAssetUpload(
    kind: "logo" | "signature",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKind(kind);
    const fd = new FormData();
    fd.append("settingsId", initialSettings.id);
    fd.append("kind", kind);
    fd.append("file", file);

    const res = await uploadClubAssetAction(fd);
    setUploadingKind(null);
    e.target.value = "";

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    if (res.url) {
      if (kind === "logo") setLogoUrl(res.url);
      else setSignatureUrl(res.url);
    }
    toast.success(
      kind === "logo"
        ? "Logo klub berhasil diperbarui!"
        : "Tanda tangan Head Coach berhasil diperbarui!"
    );
  }

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
      {/* Identitas Klub & Aset Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            Identitas, Logo & Tanda Tangan Klub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Upload Logo & Tanda Tangan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Logo Klub */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Klub"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-semibold text-slate-900">Logo Klub</p>
                <p className="text-[11px] text-slate-500">
                  PNG/WebP transparan, maks 2 MB.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  {uploadingKind === "logo" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {logoUrl ? "Ganti Logo" : "Unggah Logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleAssetUpload("logo", e)}
                    className="hidden"
                    disabled={uploadingKind !== null}
                  />
                </label>
              </div>
            </div>

            {/* Tanda Tangan Head Coach */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Tanda Tangan"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">Belum ada</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-semibold text-slate-900">
                  TTD Head Coach
                </p>
                <p className="text-[11px] text-slate-500">
                  Tampil di bagian pengesahan rapor.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  {uploadingKind === "signature" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {signatureUrl ? "Ganti TTD" : "Unggah TTD"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleAssetUpload("signature", e)}
                    className="hidden"
                    disabled={uploadingKind !== null}
                  />
                </label>
              </div>
            </div>
          </div>

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
              dan seragam.
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
                  Contoh: <strong>3.80 / 5.00 (Mahir)</strong>.
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
                  Contoh: <strong>76 / 100 (Mahir)</strong> (skor × 20).
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
                  Izin resmi tidak mengurangi persentase kehadiran di rapor.
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
                  Ketidakhadiran karena sakit tidak mengurangi persentase
                  kehadiran.
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
          Simpan Pengaturan Klub
        </Button>
      </div>
    </form>
  );
}