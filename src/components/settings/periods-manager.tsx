"use client";

import { useState } from "react";
import {
  CalendarRange,
  Plus,
  CheckCircle2,
  Lock,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPeriodAction,
  updatePeriodStatusAction,
} from "@/app/(app)/settings/period-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface PeriodItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "closed" | string;
}

interface PeriodsManagerProps {
  periods: PeriodItem[];
}

function formatDateID(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PeriodsManager({ periods }: PeriodsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activateNow, setActivateNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createPeriodAction({
      name,
      startDate,
      endDate,
      activateNow,
    });
    setSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(
      activateNow
        ? `Periode "${name}" ditambahkan dan langsung diaktifkan.`
        : `Periode "${name}" berhasil ditambahkan.`
    );
    setName("");
    setStartDate("");
    setEndDate("");
    setActivateNow(false);
    setShowForm(false);
  }

  async function handleSetActive(period: PeriodItem) {
    const ok = window.confirm(
      `Aktifkan periode "${period.name}"?\n\nPeriode yang sedang aktif sebelumnya akan otomatis ditutup (status Selesai), namun seluruh riwayat nilai dan rapornya tetap aman dan bisa diakses kapan saja.`
    );
    if (!ok) return;

    setBusyId(period.id);
    const res = await updatePeriodStatusAction({
      periodId: period.id,
      status: "active",
    });
    setBusyId(null);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Periode "${period.name}" kini menjadi periode aktif.`);
  }

  async function handleClose(period: PeriodItem) {
    const ok = window.confirm(
      `Tutup periode "${period.name}"?\n\nRiwayat rapor dan nilai tetap tersimpan dan bisa dibuka ulang lewat filter periode.`
    );
    if (!ok) return;

    setBusyId(period.id);
    const res = await updatePeriodStatusAction({
      periodId: period.id,
      status: "closed",
    });
    setBusyId(null);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Periode "${period.name}" berhasil ditutup.`);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CalendarRange className="h-4 w-4 text-orange-500" />
              Periode Evaluasi ({periods.length})
            </h2>
            <p className="text-xs text-slate-500">
              Tambah periode baru dan atur periode aktif. Riwayat rapor periode
              sebelumnya tetap tersimpan dan dapat dibuka kembali.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {showForm ? (
              <>
                <X className="mr-1.5 h-4 w-4" />
                Batal
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Periode
              </>
            )}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nama Periode
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Q1 2027 (Jan–Mar)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={activateNow}
                onChange={(e) => setActivateNow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Langsung jadikan periode aktif (otomatis menutup periode aktif
              saat ini)
            </label>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {submitting && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Simpan Periode
              </Button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {periods.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">
              Belum ada periode evaluasi terdaftar.
            </p>
          ) : (
            periods.map((period) => {
              const isBusy = busyId === period.id;
              const isActive = period.status === "active";
              const isClosed = period.status === "closed";

              return (
                <div
                  key={period.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {period.name}
                      </p>
                      {isActive && (
                        <Badge className="bg-emerald-100 text-[11px] text-emerald-800 hover:bg-emerald-100">
                          Aktif
                        </Badge>
                      )}
                      {isClosed && (
                        <Badge className="bg-slate-100 text-[11px] text-slate-600 hover:bg-slate-100">
                          Selesai
                        </Badge>
                      )}
                      {!isActive && !isClosed && (
                        <Badge className="bg-blue-100 text-[11px] text-blue-700 hover:bg-blue-100">
                          Akan Datang
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDateID(period.start_date)} –{" "}
                      {formatDateID(period.end_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleSetActive(period)}
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        )}
                        Jadikan Aktif
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => handleClose(period)}
                        className="text-slate-600"
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Lock className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Tutup Periode
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}