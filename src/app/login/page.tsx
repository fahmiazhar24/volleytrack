"use client";

import { useState } from "react";
import { Trophy, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { APP_CONFIG } from "@/config/app";
import { loginAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginAction({ email, password });
      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
      }
    } catch {
      // Redirect dari Next.js Server Action melempar error internal — abaikan jika redirect berjalan
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {APP_CONFIG.name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{APP_CONFIG.tagline}</p>
        </div>

        {/* Form Card */}
        <Card className="border-slate-800 bg-white shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Masuk ke Akun</CardTitle>
            <CardDescription>
              Gunakan akun Admin, Coach, atau Orangtua yang terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="coach@klubvoli.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer Copyright */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        <p>
          {APP_CONFIG.name} v{APP_CONFIG.version}
        </p>
        <p className="mt-0.5">{APP_CONFIG.copyright}</p>
      </footer>
    </div>
  );
}