"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCheck,
  Save,
  Calendar,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadSessionAttendanceAction,
  saveAttendanceBatchAction,
  type AttendanceStatus,
} from "@/app/(app)/attendance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ClassWithStudents {
  id: string;
  name: string;
  level: string;
  students: {
    id: string;
    full_name: string;
    position: string;
  }[];
}

interface AttendanceManagerProps {
  classes: ClassWithStudents[];
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  short: string;
  label: string;
  activeClass: string;
}[] = [
  {
    value: "present",
    short: "H",
    label: "Hadir",
    activeClass: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "late",
    short: "T",
    label: "Telat",
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "excused",
    short: "I",
    label: "Izin",
    activeClass: "bg-blue-600 text-white border-blue-600",
  },
  {
    value: "sick",
    short: "S",
    label: "Sakit",
    activeClass: "bg-purple-600 text-white border-purple-600",
  },
  {
    value: "absent",
    short: "A",
    label: "Alpha",
    activeClass: "bg-red-600 text-white border-red-600",
  },
];

export function AttendanceManager({ classes }: AttendanceManagerProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(today);
  const [topic, setTopic] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map student_id -> { status, note }
  const [records, setRecords] = useState<
    Record<string, { status: AttendanceStatus; note: string }>
  >({});

  const currentClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  // Muat absensi tersimpan tiap kali kelas atau tanggal berubah
  useEffect(() => {
    if (!selectedClassId || !sessionDate) return;

    let cancelled = false;
    async function fetchSession() {
      setLoadingSession(true);
      const res = await loadSessionAttendanceAction(
        selectedClassId,
        sessionDate
      );
      if (cancelled) return;

      setTopic(res.topic);
      const nextMap: Record<string, { status: AttendanceStatus; note: string }> =
        {};

      // Default semua siswa ke 'present' jika sesi belum pernah disimpan
      (currentClass?.students ?? []).forEach((st) => {
        const found = res.records.find((r) => r.student_id === st.id);
        nextMap[st.id] = {
          status: found?.status ?? "present",
          note: found?.note ?? "",
        };
      });

      setRecords(nextMap);
      setLoadingSession(false);
    }

    fetchSession();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, sessionDate, currentClass]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: prev[studentId]?.note ?? "",
      },
    }));
  }

  function setNote(studentId: string, note: string) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? "present",
        note,
      },
    }));
  }

  function markAllPresent() {
    const next: Record<string, { status: AttendanceStatus; note: string }> = {};
    (currentClass?.students ?? []).forEach((st) => {
      next[st.id] = { status: "present", note: records[st.id]?.note ?? "" };
    });
    setRecords(next);
    toast.success("Semua siswa ditandai Hadir.");
  }

  const summary = useMemo(() => {
    const counts = { present: 0, late: 0, excused: 0, sick: 0, absent: 0 };
    Object.values(records).forEach((r) => {
      counts[r.status]++;
    });
    return counts;
  }, [records]);

  async function handleSave() {
    if (!currentClass) return;
    setSaving(true);

    const payload = currentClass.students.map((st) => ({
      student_id: st.id,
      status: records[st.id]?.status ?? "present",
      note: records[st.id]?.note ?? "",
    }));

    const res = await saveAttendanceBatchAction({
      classId: currentClass.id,
      sessionDate,
      topic,
      records: payload,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Absensi ${currentClass.name} (${sessionDate}) tersimpan!`);
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Absensi Lapangan
        </h1>
        <p className="text-sm text-slate-500">
          Ketuk status kehadiran tiap siswa (H: Hadir, T: Telat, I: Izin, S:
          Sakit, A: Alpha).
        </p>
      </div>

      {/* Filter Sesi */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="att-class">Kelas Latihan</Label>
            <select
              id="att-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.students.length} siswa)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-date">Tanggal Sesi</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="att-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-topic">Materi / Topik Latihan</Label>
            <Input
              id="att-topic"
              placeholder="Contoh: Passing Bawah & Servis"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan & Tombol Cepat */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Hadir: {summary.present}
          </Badge>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Telat: {summary.late}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Izin: {summary.excused}
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Sakit: {summary.sick}
          </Badge>
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Alpha: {summary.absent}
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAllPresent}
        >
          <CheckCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
          Semua Hadir
        </Button>
      </div>

      {/* Daftar Siswa 1-Tap */}
      {loadingSession ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memuat data sesi...
          </CardContent>
        </Card>
      ) : !currentClass || currentClass.students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Belum ada siswa aktif di kelas ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {currentClass.students.map((st, idx) => {
            const current = records[st.id] ?? { status: "present", note: "" };
            return (
              <Card key={st.id}>
                <CardContent className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {idx + 1}. {st.full_name}
                    </p>
                    <p className="text-xs text-slate-500">{st.position}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    {/* 5 Tombol 1-Tap besar (ramah jempol Android) */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {STATUS_OPTIONS.map((opt) => {
                        const isSelected = current.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(st.id, opt.value)}
                            className={`flex h-10 min-w-[44px] items-center justify-center rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                              isSelected
                                ? opt.activeClass
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                            title={opt.label}
                          >
                            {opt.short}
                          </button>
                        );
                      })}
                    </div>

                    {/* Input catatan muncul otomatis kalau bukan Hadir */}
                    {current.status !== "present" && (
                      <Input
                        placeholder="Catatan (opsional, misal: demam / macet)"
                        value={current.note}
                        onChange={(e) => setNote(st.id, e.target.value)}
                        className="h-8 text-xs sm:w-64"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tombol Simpan Sticky di Bawah */}
      {currentClass && currentClass.students.length > 0 && (
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
            Simpan Absensi Sesi Ini
          </Button>
        </div>
      )}
    </div>
  );
}