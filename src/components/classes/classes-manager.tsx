"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Calendar, Users, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveClassAction,
  archiveClassAction,
  type RoutineScheduleItem,
} from "@/app/(app)/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

const LEVELS = ["Pemula", "Menengah", "Lanjutan", "U-12", "U-15", "U-18"];

export interface ClassRow {
  id: string;
  name: string;
  level: string;
  description: string | null;
  coach_id: string | null;
  coach_name: string | null;
  routine_schedules: RoutineScheduleItem[];
  student_count: number;
}

interface ClassesManagerProps {
  classes: ClassRow[];
  coaches: { id: string; full_name: string }[];
  isAdmin: boolean;
}

export function ClassesManager({
  classes,
  coaches,
  isAdmin,
}: ClassesManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("Pemula");
  const [description, setDescription] = useState("");
  const [coachId, setCoachId] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 4]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");

  function openCreate() {
    setEditingId(undefined);
    setName("");
    setLevel("Pemula");
    setDescription("");
    setCoachId(coaches[0]?.id ?? "");
    setSelectedDays([2, 4]);
    setStartTime("16:00");
    setEndTime("18:00");
    setModalOpen(true);
  }

  function openEdit(row: ClassRow) {
    setEditingId(row.id);
    setName(row.name);
    setLevel(row.level);
    setDescription(row.description ?? "");
    setCoachId(row.coach_id ?? "");
    const sched = Array.isArray(row.routine_schedules)
      ? row.routine_schedules
      : [];
    setSelectedDays(sched.map((s) => s.day));
    setStartTime(sched[0]?.start ?? "16:00");
    setEndTime(sched[0]?.end ?? "18:00");
    setModalOpen(true);
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama kelas wajib diisi.");
    setSaving(true);

    const routine_schedules: RoutineScheduleItem[] = selectedDays.map(
      (day) => ({
        day,
        start: startTime,
        end: endTime,
      })
    );

    const res = await saveClassAction({
      id: editingId,
      name,
      level,
      description,
      coach_id: coachId || null,
      routine_schedules,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(
      editingId ? "Kelas berhasil diperbarui." : "Kelas baru ditambahkan."
    );
    setModalOpen(false);
  }

  async function handleArchive(row: ClassRow) {
    if (!confirm(`Arsipkan kelas "${row.name}"? Data historis tetap aman.`)) {
      return;
    }
    const res = await archiveClassAction(row.id);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Kelas "${row.name}" diarsipkan.`);
  }

  const dayName = (d: number) => DAYS.find((x) => x.value === d)?.label ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Kelas & Jadwal Latihan
          </h1>
          <p className="text-sm text-slate-500">
            Kelompok latihan, coach penanggung jawab, dan jadwal rutin mingguan.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreate}
            className="h-10 bg-orange-500 text-white hover:bg-orange-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kelas
          </Button>
        )}
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Belum ada kelas latihan. Klik <strong>Tambah Kelas</strong> untuk
            membuat kelompok latihan pertama.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {classes.map((cls) => (
            <Card key={cls.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="secondary" className="mb-1.5">
                      {cls.level}
                    </Badge>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cls)}
                        title="Edit Kelas"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(cls)}
                        title="Arsipkan Kelas"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {cls.description && (
                  <p className="text-slate-600">{cls.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-500" />
                    <strong className="text-slate-800">
                      {cls.student_count}
                    </strong>{" "}
                    Siswa Aktif
                  </span>
                  <span>
                    Coach:{" "}
                    <strong className="text-slate-800">
                      {cls.coach_name ?? "Belum ditentukan"}
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Calendar className="mr-1 h-4 w-4 text-orange-500" />
                  {cls.routine_schedules?.length > 0 ? (
                    cls.routine_schedules.map((s, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[11px] font-normal"
                      >
                        {dayName(s.day)} {s.start}–{s.end}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      Jadwal belum diatur
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT KELAS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Kelas Latihan" : "Tambah Kelas Baru"}
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
                <Label htmlFor="cls-name">Nama Kelas</Label>
                <Input
                  id="cls-name"
                  placeholder="Contoh: Kelas U-15 Putra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cls-level">Level / Kelompok Umur</Label>
                  <select
                    id="cls-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cls-coach">Coach Utama</Label>
                  <select
                    id="cls-coach"
                    value={coachId}
                    onChange={(e) => setCoachId(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">-- Pilih Coach --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Hari Latihan Rutin</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const active = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cls-start">Jam Mulai</Label>
                  <Input
                    id="cls-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cls-end">Jam Selesai</Label>
                  <Input
                    id="cls-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cls-desc">Catatan / Fokus Kelas (Opsional)</Label>
                <Input
                  id="cls-desc"
                  placeholder="Contoh: Fokus fundamental passing & servis"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  Simpan Kelas
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}