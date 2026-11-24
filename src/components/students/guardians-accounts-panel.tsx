"use client";

import { useState } from "react";
import {
  UserCheck,
  UserPlus,
  KeyRound,
  MessageCircle,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  activateGuardianAccountAction,
  resetGuardianPasswordAction,
} from "@/app/(app)/students/guardian-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface GuardianAccountRow {
  id: string;
  user_id: string | null;
  full_name: string;
  phone_wa: string;
  email: string | null;
  children_names: string[];
}

interface GuardiansAccountsPanelProps {
  guardians: GuardianAccountRow[];
  clubName: string;
  isAdmin: boolean;
}

function formatWaNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

function generateParentPass() {
  return `VT-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function GuardiansAccountsPanel({
  guardians,
  clubName,
  isAdmin,
}: GuardiansAccountsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastActivated, setLastActivated] = useState<{
    fullName: string;
    loginEmail: string;
    password: string;
    phoneWa: string;
  } | null>(null);

  async function handleActivate(g: GuardianAccountRow) {
    const defaultPass = generateParentPass();
    const pass = prompt(
      `Buat akun Portal Orangtua untuk ${g.full_name}?\nMasukkan kata sandi awal (min. 6 karakter):`,
      defaultPass
    );
    if (!pass) return;

    setBusyId(g.id);
    const res = await activateGuardianAccountAction({
      guardianId: g.id,
      email: g.email ?? undefined,
      password: pass.trim(),
    });
    setBusyId(null);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    if (res.loginEmail) {
      setLastActivated({
        fullName: res.fullName!,
        loginEmail: res.loginEmail,
        password: res.password!,
        phoneWa: res.phoneWa!,
      });
    }
    toast.success(`Akun portal ${g.full_name} berhasil diaktifkan!`);
  }

  async function handleReset(g: GuardianAccountRow) {
    if (!g.user_id) return;
    const nextPass = prompt(
      `Masukkan kata sandi baru untuk ${g.full_name}:`,
      generateParentPass()
    );
    if (!nextPass) return;

    setBusyId(g.id);
    const res = await resetGuardianPasswordAction(g.user_id, nextPass.trim());
    setBusyId(null);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    navigator.clipboard.writeText(nextPass.trim());
    toast.success(`Kata sandi ${g.full_name} direset & disalin ke clipboard!`);
  }

  function sendParentLoginWa(info: {
    fullName: string;
    loginEmail: string;
    password: string;
    phoneWa: string;
  }) {
    const loginUrl = `${window.location.origin}/login`;
    const msg = `Yth. ${info.fullName},\n\nAkun *Portal Orangtua ${clubName}* sudah aktif untuk memantau absensi & rapor perkembangan putra/putri Anda.\n\nLink Login: ${loginUrl}\nEmail: ${info.loginEmail}\nKata Sandi: ${info.password}\n\nTerima kasih.`;
    const waPhone = info.phoneWa ? formatWaNumber(info.phoneWa) : "";
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-orange-500" />
          Akses Portal Orangtua / Wali ({guardians.length})
        </CardTitle>
        <p className="text-xs text-slate-500">
          Aktifkan akun portal 1-klik. Wali dengan lebih dari satu anak otomatis
          terhubung dalam 1 login.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {lastActivated && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold">
                Akun portal aktif: {lastActivated.fullName}
              </p>
              <p>
                Email: <code>{lastActivated.loginEmail}</code> • Sandi:{" "}
                <code>{lastActivated.password}</code>
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => sendParentLoginWa(lastActivated)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              Kirim Info Login via WA
            </Button>
          </div>
        )}

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {guardians.map((g) => {
            const isBusy = busyId === g.id;
            return (
              <div
                key={g.id}
                className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{g.full_name}</p>
                    {g.children_names.length > 1 && (
                      <Badge className="bg-purple-100 text-[11px] text-purple-800 hover:bg-purple-100">
                        Multi-Anak ({g.children_names.length})
                      </Badge>
                    )}
                    {g.user_id ? (
                      <Badge className="bg-emerald-100 text-[11px] text-emerald-800 hover:bg-emerald-100">
                        <UserCheck className="mr-1 h-3 w-3" />
                        Akun Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Belum Ada Akun
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    WA: {g.phone_wa}
                    {g.email ? ` • ${g.email}` : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Anak:{" "}
                    <strong>{g.children_names.join(", ") || "-"}</strong>
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 gap-2">
                    {g.user_id ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleReset(g)}
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Reset Sandi
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleActivate(g)}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                      >
                        {isBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Aktifkan Akun Portal
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}