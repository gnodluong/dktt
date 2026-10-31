import { cache } from "react";
import { redirect } from "next/navigation";
import { supa } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  full_name: string;
  role: "admin" | "commander" | "duty";
  phone: string | null;
  email: string;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  try {
    const sb = await supa();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb
      .from("profiles")
      .select("id, full_name, role, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;
    return { ...data, email: user.email ?? "" } as Profile;
  } catch {
    return null;
  }
});

export async function requireStaff(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/chi-huy/login");
  return profile;
}
