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
  Pencil,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import {
  createStaffAccountAction,
  updateStaffAccountAction,
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

export interface ClassOption {
  id: string;
  name: string;
  level: string | null;
  coach_id: string | null;
  is_active: boolean | null;
}

interface TeamAccountsManagerProps {
  staffList: StaffMember[];
  classes?: ClassOption[];
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
  classes = [],
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

  // Modal Edit Akun & Penugasan Kelas
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhoneWa, setEditPhoneWa] = useState("");
  const [editRole, setEditRole] = useState<"coach" | "admin">("coach");
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [updatingStaff, setUpdatingStaff] = useState(false);

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

  const staffNameById = new Map(staffList.map((s) => [s.id, s.full_name]));

  function openEditModal(member: StaffMember) {
    setEditingMember(member);
    setEditName(member.full_name);
    setEditPhoneWa(member.phone_wa ?? "");
    setEditRole(member.role);
    setEditClassIds(
      classes.filter((c) => c.coach_id === member.id).map((c) => c.id)
    );
  }

  function toggleClassSelection(classId: string) {
    setEditClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }

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

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;

    setUpdatingStaff(true);
    const res = await updateStaffAccountAction({
      id: editingMember.id,
      full_name: editName,
      phone_wa: editPhoneWa,
      role: editRole,
      classIds: editClassIds,
    });
    setUpdatingStaff(false);

    if (res?.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Data & penugasan kelas ${editName} berhasil diperbarui.`);
    setEditingMember(null);
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
              Kelola akun, peran, dan penugasan kelas pelatih langsung dari
              aplikasi tanpa membuka dashboard Supabase.
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
              const assignedClasses = classes.filter(
                (c) => c.coach_id === m.id
              );

              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <GraduationCap className="h-3 w-3" />
                        Kelas:
                      </span>
                      {assignedClasses.length > 0 ? (
                        assignedClasses.map((cls) => (
                          <Badge
                            key={cls.id}
                            variant="secondary"
                            className="bg-slate-100 text-[11px] font-normal text-slate-700"
                          >
                            {cls.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] italic text-slate-400">
                          Belum ada penugasan kelas
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(m)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit & Kelas
                    </Button>
                    {!isSelf && (
                      <>
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
                      </>
                    )}
                  </div>
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

      {/* Modal Edit Akun & Penugasan Kelas */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Akun & Penugasan Kelas
                </h2>
                <p className="text-xs text-slate-500">{editingMember.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="edit-fullname">Nama Lengkap</Label>
                <Input
                  id="edit-fullname"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-wa">No. WhatsApp</Label>
                  <Input
                    id="edit-wa"
                    placeholder="0812xxxxxxxx"
                    value={editPhoneWa}
                    onChange={(e) => setEditPhoneWa(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-role">Hak Akses</Label>
                  <select
                    id="edit-role"
                    value={editRole}
                    disabled={editingMember.id === currentUserId}
                    onChange={(e) =>
                      setEditRole(e.target.value as "coach" | "admin")
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="coach">Coach Lapangan</option>
                    <option value="admin">Head Coach / Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Penugasan Kelas (Penanggung Jawab)</Label>
                {classes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                    Belum ada kelas aktif yang terdaftar.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
                    {classes.map((cls) => {
                      const checked = editClassIds.includes(cls.id);
                      const otherCoachName =
                        cls.coach_id && cls.coach_id !== editingMember.id
                          ? staffNameById.get(cls.coach_id)
                          : null;

                      return (
                        <label
                          key={cls.id}
                          className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleClassSelection(cls.id)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-slate-900">
                                {cls.name}
                              </span>
                              {cls.level && (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {cls.level}
                                </Badge>
                              )}
                            </div>
                            {otherCoachName && (
                              <p className="text-[11px] text-amber-700">
                                Saat ini diampu: {otherCoachName}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Mencentang kelas yang sedang diampu pelatih lain akan
                  memindahkan penanggung jawab kelas ke akun ini.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMember(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updatingStaff}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  {updatingStaff && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}