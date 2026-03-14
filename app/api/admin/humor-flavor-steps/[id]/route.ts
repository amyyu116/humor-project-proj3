import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

type Params = {
  params: Promise<{ id: string }>;
};

type StepUpdatePayload = {
  description?: string | null;
  llm_temperature?: number | null;
  llm_input_type_id?: number;
  llm_output_type_id?: number;
  llm_model_id?: number;
  humor_flavor_step_type_id?: number;
  llm_system_prompt?: string | null;
  llm_user_prompt?: string | null;
};

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const stepId = Number(id);

  if (!Number.isFinite(stepId)) {
    return NextResponse.json({ error: "Invalid step id" }, { status: 400 });
  }

  const body = (await req.json()) as StepUpdatePayload;

  const payload: Record<string, number | string | null> = {};

  if (body.description !== undefined) {
    payload.description = body.description?.trim() || null;
  }
  if (body.llm_temperature !== undefined) {
    payload.llm_temperature =
      body.llm_temperature === null ? null : Number(body.llm_temperature);
  }
  if (body.llm_input_type_id !== undefined) {
    payload.llm_input_type_id = Number(body.llm_input_type_id);
  }
  if (body.llm_output_type_id !== undefined) {
    payload.llm_output_type_id = Number(body.llm_output_type_id);
  }
  if (body.llm_model_id !== undefined) {
    payload.llm_model_id = Number(body.llm_model_id);
  }
  if (body.humor_flavor_step_type_id !== undefined) {
    payload.humor_flavor_step_type_id = Number(body.humor_flavor_step_type_id);
  }
  if (body.llm_system_prompt !== undefined) {
    payload.llm_system_prompt = body.llm_system_prompt?.trim() || null;
  }
  if (body.llm_user_prompt !== undefined) {
    payload.llm_user_prompt = body.llm_user_prompt?.trim() || null;
  }

  const { data, error } = await admin.supabase
    .from("humor_flavor_steps")
    .update(payload)
    .eq("id", stepId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ humor_flavor_step: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const stepId = Number(id);

  if (!Number.isFinite(stepId)) {
    return NextResponse.json({ error: "Invalid step id" }, { status: 400 });
  }

  const { data: deletedStep, error: stepError } = await admin.supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("id", stepId)
    .select("id, humor_flavor_id")
    .maybeSingle();

  if (stepError) {
    return NextResponse.json({ error: stepError.message }, { status: 400 });
  }

  if (!deletedStep) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const { data: remainingSteps, error: remainingError } = await admin.supabase
    .from("humor_flavor_steps")
    .select("id")
    .eq("humor_flavor_id", deletedStep.humor_flavor_id)
    .order("order_by", { ascending: true });

  if (remainingError) {
    return NextResponse.json({ error: remainingError.message }, { status: 400 });
  }

  const updates = (remainingSteps ?? []).map((step, index) =>
    admin.supabase
      .from("humor_flavor_steps")
      .update({ order_by: index + 1 })
      .eq("id", step.id),
  );

  await Promise.all(updates);

  return NextResponse.json({ success: true });
}
