import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

type Params = {
  params: Promise<{ id: string }>;
};

type StepCreatePayload = {
  description?: string | null;
  llm_temperature?: number | null;
  llm_input_type_id?: number;
  llm_output_type_id?: number;
  llm_model_id?: number;
  humor_flavor_step_type_id?: number;
  llm_system_prompt?: string | null;
  llm_user_prompt?: string | null;
};

export async function POST(req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const flavorId = Number(id);

  if (!Number.isFinite(flavorId)) {
    return NextResponse.json({ error: "Invalid flavor id" }, { status: 400 });
  }

  const body = (await req.json()) as StepCreatePayload;

  if (
    !body.llm_input_type_id ||
    !body.llm_output_type_id ||
    !body.llm_model_id ||
    !body.humor_flavor_step_type_id
  ) {
    return NextResponse.json(
      {
        error:
          "llm_input_type_id, llm_output_type_id, llm_model_id, and humor_flavor_step_type_id are required",
      },
      { status: 400 },
    );
  }

  const { data: lastStep } = await admin.supabase
    .from("humor_flavor_steps")
    .select("order_by")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrderBy = (lastStep?.order_by ?? 0) + 1;

  const { data, error } = await admin.supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: flavorId,
      order_by: nextOrderBy,
      description: body.description?.trim() || null,
      llm_temperature:
        body.llm_temperature === null || body.llm_temperature === undefined
          ? null
          : Number(body.llm_temperature),
      llm_input_type_id: body.llm_input_type_id,
      llm_output_type_id: body.llm_output_type_id,
      llm_model_id: body.llm_model_id,
      humor_flavor_step_type_id: body.humor_flavor_step_type_id,
      llm_system_prompt: body.llm_system_prompt?.trim() || null,
      llm_user_prompt: body.llm_user_prompt?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ humor_flavor_step: data }, { status: 201 });
}
