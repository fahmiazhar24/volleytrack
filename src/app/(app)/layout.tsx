import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  // Orangtua tidak boleh masuk area Coach/Admin
  if (profile.role === "parent") {
    redirect("/parent");
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from("club_settings")
    .select("club_name")
    .limit(1)
    .single();

  return (
    <AppShell
      profile={profile}
      clubName={club?.club_name ?? "VolleyTrack Academy"}
    >
      {children}
    </AppShell>
  );
}