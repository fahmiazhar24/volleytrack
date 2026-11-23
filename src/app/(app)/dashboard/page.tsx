import Link from "next/link";
import { Users, Calendar, Star, ClipboardCheck, ArrowRight } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const [
    { count: studentsCount },
    { count: classesCount },
    { count: skillsCount },
    { data: activePeriod },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("skills")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("periods")
      .select("name, start_date, end_date")
      .eq("status", "active")
      .limit(1)
      .single(),
  ]);

  const stats = [
    {
      label: "Siswa Aktif",
      value: studentsCount ?? 0,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Kelas Latihan",
      value: classesCount ?? 0,
      icon: Calendar,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Aspek Skill",
      value: skillsCount ?? 0,
      icon: Star,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Halo, {profile?.full_name}
          </h1>
          <p className="text-sm text-slate-500">
            Ringkasan operasional klub dan akses cepat lapangan.
          </p>
        </div>
        {activePeriod && (
          <Badge className="w-fit bg-orange-100 text-orange-800 hover:bg-orange-100">
            Periode Aktif: {activePeriod.name}
          </Badge>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {item.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aksi Cepat Mode Lapangan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aksi Cepat Lapangan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/attendance"
            className="flex h-12 items-center justify-between rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-orange-400" />
              Mulai Absensi Sesi Hari Ini
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/students"
            className="flex h-12 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Kelola Data Siswa & Wali
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}