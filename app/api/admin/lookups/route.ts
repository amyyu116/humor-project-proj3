import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

export async function GET() {
  const admin = await getAdminContext();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [models, inputTypes, outputTypes, stepTypes] = await Promise.all([
    admin.supabase.from("llm_models").select("*").order("id"),
    admin.supabase.from("llm_input_types").select("*").order("id"),
    admin.supabase.from("llm_output_types").select("*").order("id"),
    admin.supabase.from("humor_flavor_step_types").select("*").order("id"),
  ]);

  const firstError = [models.error, inputTypes.error, outputTypes.error, stepTypes.error].find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({
    llm_models: models.data,
    llm_input_types: inputTypes.data,
    llm_output_types: outputTypes.data,
    humor_flavor_step_types: stepTypes.data,
  });
}
