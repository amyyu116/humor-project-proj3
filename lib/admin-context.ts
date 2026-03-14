import { createClient } from "@/utils/supabase/server";

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  accessToken: string | null;
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  const isAdmin = Boolean(profile?.is_superadmin || profile?.is_matrix_admin);
  if (!isAdmin) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    accessToken: session?.access_token ?? null,
  };
}
