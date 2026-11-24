"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Upload,
  Search,
  Pencil,
  Trash2,
  Phone,
  X,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveStudentAction,
  archiveStudentAction,
  importStudentsCsvAction,
} from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const POSITIONS = [
  "All-Round",
  "Setter",
  "Outside Hitter",
  "Opposite",
  "Middle Blocker",
  "Libero",
];

export interface StudentRow {
  id: string;
  full_name: string;
  birth_date: string;
  position: string;
  notes: string | null;
  class_id: string;
  class_name: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
}

interface StudentsManagerProps {
  students: StudentRow[];
  classes: { id: string; name: string }[];
  isAdmin: boolean;
}

function calcAge(birthDate: string) {
  if (!birthDate) return "-";
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function StudentsManager({
  students,
  classes,
  isAdmin,
}: StudentsManagerProps) {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  // Modal Form Siswa
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("2012-01-01");
  const [position, setPosition] = useState("All-Round");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Modal Impor CSV
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvClassId, setCsvClassId] = useState(classes[0]?.id ?? "");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchClass = filterClass === "all" || s.class_id === filterClass;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.guardian_name.toLowerCase().includes(q) ||
        s.guardian_phone.includes(q);
      return matchClass && matchSearch;
    });
  }, [students, search, filterClass]);

  function openCreate() {
    setEditingId(undefined);
    setFullName("");
    setBirthDate("2012-01-01");
    setPosition("All-Round");
    setClassId(classes[0]?.id ?? "");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setNotes("");
    setModalOpen(true);
  }

  function openEdit(s: StudentRow) {
    setEditingId(s.id);
    setFullName(s.full_name);
    setBirthDate(s.birth_date);
    setPosition(s.position || "All-Round");
    setClassId(s.class_id || classes[0]?.id || "");
    setGuardianName(s.guardian_name);
    setGuardianPhone(s.guardian_phone);
    setGuardianEmail(s.guardian_email);
    setNotes(s.notes ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Nama siswa wajib diisi.");
    setSaving(true);

    const res = await saveStudentAction({
      id: editingId,
      full_name: fullName,
      birth_date: birthDate,
      position,
      class_id: classId,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      guardian_email: guardianEmail,
      notes,
    });

    setSaving(false);
    if (res?.error) return toast.error(res.error);

    toast.success(
      editingId ? "Data siswa diperbarui." : "Siswa baru berhasil ditambahkan."
    );
    setModalOpen(false);
  }

  async function handleArchive(s: StudentRow) {
    if (
      !confirm(
        `Nonaktifkan siswa "${s.full_name}"? Riwayat absensi & rapor tetap tersimpan.`
      )
    ) {
      return;
    }
    const res = await archiveStudentAction(s.id);
    if (res?.error) return toast.error(res.error);
    toast.success(`${s.full_name} telah dinonaktifkan.`);
  }

  function downloadCsvTemplate() {
    const sample =
      "nama_siswa,tanggal_lahir,posisi,nama_wali,no_wa_wali,email_wali\nBudi Santoso,2012-05-14,Outside Hitter,Pak Hendra,081234567890,hendra@mail.com\nSiti Rahma,2013-08-20,Setter,Ibu Rina,081298765432,";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_siswa_volleytrack.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function handleImportCsv() {
    if (!csvText.trim()) return toast.error("Pilih file CSV atau tempel datanya.");
    setImporting(true);

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Lewati baris header jika ada
    const dataLines = lines[0]?.toLowerCase().includes("nama_siswa")
      ? lines.slice(1)
      : lines;

    const rows = dataLines.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        full_name: cols[0] ?? "",
        birth_date: cols[1] ?? "2012-01-01",
        position: cols[2] || "All-Round",
        class_id: csvClassId,
        guardian_name: cols[3] ?? "",
        guardian_phone: cols[4] ?? "",
        guardian_email: cols[5] ?? "",
      };
    });

    const res = await importStudentsCsvAction(rows);
    setImporting(false);

    if (res?.error) return toast.error(res.error);
    toast.success(
      `Impor selesai: ${res.successCount} siswa masuk${
        res.failCount ? `, ${res.failCount} dilewati` : ""
      }.`
    );
    setCsvText("");
    setCsvOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Siswa & Wali
          </h1>
          <p className="text-sm text-slate-500">
            Total {students.length} siswa aktif terdaftar di klub.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCsvOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Impor CSV
            </Button>
            <Button
              onClick={openCreate}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Siswa
            </Button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama siswa, nama wali, atau nomor WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm sm:w-52"
        >
          <option value="all">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Daftar Siswa (Card Mobile-Friendly) */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Tidak ada data siswa yang cocok.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {s.full_name}
                    </p>
                    <Badge variant="secondary" className="text-[11px]">
                      {calcAge(s.birth_date)} thn
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                      {s.class_name || "Belum masuk kelas"}
                    </Badge>
                    <Badge variant="outline">{s.position}</Badge>
                  </div>
                  {s.guardian_name && (
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-500">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      Wali: <strong className="text-slate-700">{s.guardian_name}</strong> ({s.guardian_phone})
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(s)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(s)}
                      title="Nonaktifkan"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT SISWA */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-name">Nama Lengkap Siswa</Label>
                <Input
                  id="st-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="st-dob">Tanggal Lahir</Label>
                  <Input
                    id="st-dob"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-pos">Posisi Utama</Label>
                  <select
                    id="st-pos"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-class">Kelas Latihan</Label>
                <select
                  id="st-class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Data Orangtua / Wali (Otomatis Multi-Anak via No WA)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="g-name">Nama Orangtua / Wali</Label>
                    <Input
                      id="g-name"
                      placeholder="Contoh: Ibu Rina"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="g-phone">Nomor WhatsApp</Label>
                    <Input
                      id="g-phone"
                      placeholder="0812xxxxxxxx"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="g-email">Email Wali (Opsional)</Label>
                  <Input
                    id="g-email"
                    type="email"
                    placeholder="orangtua@email.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-notes">Catatan Khusus (Cedera / Alergi)</Label>
                <Input
                  id="st-notes"
                  placeholder="Opsional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Siswa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPOR CSV */}
      {csvOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Impor Massal Siswa (CSV)
              </h2>
              <button
                type="button"
                onClick={() => setCsvOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
              <p>
                Format kolom CSV:{" "}
                <code>
                  nama_siswa,tanggal_lahir,posisi,nama_wali,no_wa_wali,email_wali
                </code>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Unduh Template CSV
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-class">Masukkan ke Kelas</Label>
              <select
                id="csv-class"
                value={csvClassId}
                onChange={(e) => setCsvClassId(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">-- Pilih Kelas Tujuan --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-file">Pilih File .CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFile}
              />
            </div>

            {csvText && (
              <p className="text-xs text-emerald-700">
                File terbaca ({csvText.split(/\r?\n/).filter(Boolean).length}{" "}
                baris). Siap diimpor.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCsvOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={importing}
                onClick={handleImportCsv}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mulai Impor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}