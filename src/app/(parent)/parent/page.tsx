import { getCurrentUserProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParentHomePage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">
        Selamat Datang, {profile?.full_name}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rapor Perkembangan Anak</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Daftar anak yang terhubung dengan akun ini dan rapor yang sudah
          dipublikasikan akan tampil di halaman ini pada Fase 3.
        </CardContent>
      </Card>
    </div>
  );
}