"use client";

import { useState } from "react";
import {
  UserPlus,
  KeyRound,
  Power,
  MessageCircle,
  Loader2,
  X,
  Users,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  createStaffAccountAction,
  toggleStaffActiveAction,
  resetUserPasswordAction,
  changeOwnPasswordAction,
} from "@/app/(app)/settings/users-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "coach";
  phone_wa: string | null;
  is_active: boolean;
}

interface TeamAccountsManagerProps {
  staffList: StaffMember[];
  currentUserId: string;
  clubName: string;
}

function formatWaNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "VT-";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function TeamAccountsManager({
  staffList,
  currentUserId,
  clubName,
}: TeamAccountsManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneWa, setPhoneWa] = useState("");
  const [role, setRole] = useState<"coach" | "admin">("coach");
  const [password, setPassword] = useState("volley123");

  // Simpan info akun yang baru dibuat agar bisa langsung dikirim ke WA
  const [lastCreated, setLastCreated] = useState<{
    fullName: string;
    email: string;
    password: string;
    phoneWa: string;
  } | null>(null);

  // Ubah password sendiri
  const [ownPassword, setOwnPassword] = useState("");
  const [changingOwn, setChangingOwn] = useState(false);

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await createStaffAccountAction({
      full_name: fullName,
      email,
      phone_wa: phoneWa,
      role,
      password,
    });

    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Akun ${fullName} berhasil dibuat dan langsung aktif!`);
    setLastCreated({ fullName, email, password, phoneWa });
    setFullName("");
    setEmail("");
    setPhoneWa("");
    setPassword(generatePassword());
    setModalOpen(false);
  }

  async function handleToggleActive(member: StaffMember) {
    const actionLabel = member.is_active ? "nonaktifkan" : "aktifkan kembali";
    if (!confirm(`Yakin ingin ${actionLabel} akun ${member.full_name}?`)) return;

    const res = await toggleStaffActiveAction(member.id, !member.is_active);
    if (res?.error) return toast.error(res.error);
    toast.success(`Status akun ${member.full_name} diperbarui.`);
  }

  async function handleResetPassword(member: StaffMember) {
    const nextPass = prompt(
      `Masukkan kata sandi baru untuk ${member.full_name} (min. 6 karakter):`,
      generatePassword()
    );
    if (!nextPass) return;

    const res = await resetUserPasswordAction(member.id, nextPass);
    if (res?.error) return toast.error(res.error);

    navigator.clipboard.writeText(nextPass);
    toast.success(
      `Kata sandi ${member.full_name} direset & disalin ke clipboard!`
    );
  }

  function sendLoginViaWa(info: {
    fullName: string;
    email: string;
    password: string;
    phoneWa: string;
  }) {
    const loginUrl = `${window.location.origin}/login`;
    const msg = `Halo Coach ${info.fullName},\n\nAkun aplikasi *${clubName} (VolleyTrack)* Anda sudah aktif.\n\nLink Login: ${loginUrl}\nEmail: ${info.email}\nKata Sandi Awal: ${info.password}\n\nSilakan masuk dan segera ganti kata sandi Anda di menu Pengaturan.`;
    const waPhone = info.phoneWa ? formatWaNumber(info.phoneWa) : "";
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleChangeOwnPassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingOwn(true);
    const res = await changeOwnPasswordAction(ownPassword);
    setChangingOwn(false);
    if (res?.error) return toast.error(res.error);

    setOwnPassword("");
    toast.success("Kata sandi Anda berhasil diubah!");
  }

  return (
    <div className="space-y-5">
      {/* Kartu Manajemen Tim Coach & Admin */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-orange-500" />
              Akun Pelatih & Head Coach ({staffList.length})
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Buat akun coach langsung dari aplikasi tanpa perlu membuka
              dashboard Supabase.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setPassword(generatePassword());
              setModalOpen(true);
            }}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah Akun Coach
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {lastCreated && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold">
                  Akun baru siap dipakai: {lastCreated.fullName}
                </p>
                <p>
                  Email: <code>{lastCreated.email}</code> • Sandi:{" "}
                  <code>{lastCreated.password}</code>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => sendLoginViaWa(lastCreated)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Kirim Info Login via WA
              </Button>
            </div>
          )}

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {staffList.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {m.full_name}
                      </p>
                      <Badge
                        className={
                          m.role === "admin"
                            ? "bg-orange-100 text-[11px] text-orange-800 hover:bg-orange-100"
                            : "bg-blue-100 text-[11px] text-blue-800 hover:bg-blue-100"
                        }
                      >
                        {m.role === "admin" ? "Head Coach / Admin" : "Coach"}
                      </Badge>
                      {!m.is_active && (
                        <Badge className="bg-red-100 text-[11px] text-red-700 hover:bg-red-100">
                          Nonaktif
                        </Badge>
                      )}
                      {isSelf && (
                        <Badge variant="outline" className="text-[11px]">
                          Anda
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {m.email}
                      {m.phone_wa ? ` • WA: ${m.phone_wa}` : ""}
                    </p>
                  </div>

                  {!isSelf && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(m)}
                      >
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        Reset Sandi
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(m)}
                        className={
                          m.is_active ? "text-red-600" : "text-emerald-700"
                        }
                      >
                        <Power className="mr-1.5 h-3.5 w-3.5" />
                        {m.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kartu Ubah Kata Sandi Mandiri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-orange-500" />
            Ubah Kata Sandi Akun Saya
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleChangeOwnPassword}
            className="flex flex-col gap-3 sm:max-w-md sm:flex-row"
          >
            <Input
              type="password"
              placeholder="Kata sandi baru (min. 6 karakter)"
              value={ownPassword}
              onChange={(e) => setOwnPassword(e.target.value)}
              minLength={6}
              required
            />
            <Button
              type="submit"
              variant="outline"
              disabled={changingOwn}
              className="shrink-0"
            >
              {changingOwn && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Perbarui Sandi
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modal Tambah Akun Coach */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Tambah Akun Coach / Admin
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="st-fullname">Nama Lengkap</Label>
                <Input
                  id="st-fullname"
                  placeholder="Contoh: Coach Budi Pratama"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="st-email">Email Login</Label>
                <Input
                  id="st-email"
                  type="email"
                  placeholder="coach@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="st-wa">No. WhatsApp</Label>
                  <Input
                    id="st-wa"
                    placeholder="0812xxxxxxxx"
                    value={phoneWa}
                    onChange={(e) => setPhoneWa(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="st-role">Hak Akses</Label>
                  <select
                    id="st-role"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as "coach" | "admin")
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="coach">Coach Lapangan</option>
                    <option value="admin">Head Coach / Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="st-pass">Kata Sandi Awal</Label>
                <div className="flex gap-2">
                  <Input
                    id="st-pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPassword(generatePassword())}
                  >
                    Acak
                  </Button>
                </div>
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
                  Buat Akun
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}