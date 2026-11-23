import { redirect } from "next/navigation";
import { Trophy, LogOut } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/auth";
import { logoutAction } from "@/app/auth/actions";
import { APP_CONFIG } from "@/config/app";
import { Button } from "@/components/ui/button";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Trophy className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">{APP_CONFIG.name}</span>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="mr-1.5 h-4 w-4" />
              Keluar
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        {APP_CONFIG.name} • {APP_CONFIG.copyright}
      </footer>
    </div>
  );
}