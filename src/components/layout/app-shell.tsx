"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Star,
  Users,
  Menu,
  Calendar,
  FileText,
  Award,
  Settings,
  LogOut,
  Trophy,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import type { UserProfile } from "@/lib/auth";
import { logoutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface AppShellProps {
  profile: UserProfile;
  clubName: string;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Head Coach / Admin",
  coach: "Asisten Coach",
  parent: "Orangtua",
};

export function AppShell({ profile, clubName, children }: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = profile.role === "admin";

  const sidebarItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/attendance", label: "Absensi Lapangan", icon: ClipboardCheck },
    { href: "/assessments", label: "Penilaian Skill", icon: Star },
    { href: "/students", label: "Data Siswa", icon: Users },
    { href: "/classes", label: "Kelas & Jadwal", icon: Calendar },
    { href: "/evaluations", label: "Evaluasi 3 Bulan", icon: FileText },
    { href: "/reports", label: "Rapor Digital", icon: Award },
    ...(isAdmin
      ? [{ href: "/settings", label: "Pengaturan Klub", icon: Settings }]
      : []),
  ];

  // 4 tombol utama di Bottom Bar HP Android (+ 1 tombol "Lainnya")
  const mobilePrimaryItems = [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
    { href: "/attendance", label: "Absensi", icon: ClipboardCheck },
    { href: "/assessments", label: "Nilai", icon: Star },
    { href: "/students", label: "Siswa", icon: Users },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 md:flex">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {APP_CONFIG.name}
            </p>
            <p className="truncate text-xs text-slate-400">{clubName}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-500 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3">
            <p className="truncate text-sm font-semibold text-white">
              {profile.full_name}
            </p>
            <p className="text-xs text-orange-400">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </form>
          <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
            {APP_CONFIG.copyright}
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* MOBILE TOP BAR */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">
                {APP_CONFIG.name}
              </p>
              <p className="text-[11px] text-slate-500">{clubName}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            {isAdmin ? "Head Coach" : "Coach"}
          </Badge>
        </header>

        {/* PAGE CONTENT (beri padding bawah ekstra di mobile agar tidak tertutup Bottom Nav) */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-6 md:pb-8">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (KHUSUS SATU TANGAN DI LAPANGAN) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium ${
                  active ? "text-orange-600" : "text-slate-500"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[2.4px]" : ""}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Tombol Drawer Menu Lainnya */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium text-slate-500">
              <Menu className="h-5 w-5" />
              <span>Lainnya</span>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>{profile.full_name}</DrawerTitle>
                <p className="text-xs text-slate-500">
                  {ROLE_LABELS[profile.role]} • {profile.email}
                </p>
              </DrawerHeader>
              <div className="space-y-1 px-4 pb-6">
                {sidebarItems.slice(4).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Icon className="h-5 w-5 text-slate-500" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <div className="pt-3">
                  <form action={logoutAction}>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="h-11 w-full"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Keluar dari Akun
                    </Button>
                  </form>
                </div>

                <p className="pt-4 text-center text-[11px] text-slate-400">
                  {APP_CONFIG.name} v{APP_CONFIG.version} •{" "}
                  {APP_CONFIG.copyright}
                </p>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </div>
  );
}