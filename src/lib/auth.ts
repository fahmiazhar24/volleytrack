import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "coach" | "parent";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone_wa: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone_wa, avatar_url, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return profile as UserProfile;
}