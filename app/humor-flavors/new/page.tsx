import { redirect } from "next/navigation";
import NewFlavorClient from "./NewFlavorClient";
import { createClient } from "@/utils/supabase/server";

export default async function NewFlavorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = Boolean(profile?.is_superadmin || profile?.is_matrix_admin);
  if (!isAdmin) {
    redirect("/");
  }

  const [modelsResult, inputTypesResult, outputTypesResult, stepTypesResult] =
    await Promise.all([
      supabase.from("llm_models").select("*").order("id", { ascending: true }),
      supabase.from("llm_input_types").select("*").order("id", { ascending: true }),
      supabase.from("llm_output_types").select("*").order("id", { ascending: true }),
      supabase.from("humor_flavor_step_types").select("*").order("id", { ascending: true }),
    ]);

  return (
    <NewFlavorClient
      initialLookups={{
        llm_models: modelsResult.data ?? [],
        llm_input_types: inputTypesResult.data ?? [],
        llm_output_types: outputTypesResult.data ?? [],
        humor_flavor_step_types: stepTypesResult.data ?? [],
      }}
    />
  );
}
