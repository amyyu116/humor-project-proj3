import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

type Params = {
  params: Promise<{ id: string }>;
};

type MovePayload = {
  direction?: "up" | "down";
};

export async function POST(req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const stepId = Number(id);

  if (!Number.isFinite(stepId)) {
    return NextResponse.json({ error: "Invalid step id" }, { status: 400 });
  }

  const body = (await req.json()) as MovePayload;
  if (!body.direction || !["up", "down"].includes(body.direction)) {
    return NextResponse.json({ error: "direction must be 'up' or 'down'" }, { status: 400 });
  }

  const { data: step, error: stepError } = await admin.supabase
    .from("humor_flavor_steps")
    .select("id, humor_flavor_id")
    .eq("id", stepId)
    .single();

  if (stepError || !step) {
    return NextResponse.json({ error: stepError?.message ?? "Step not found" }, { status: 404 });
  }

  const { data: allSteps, error: allStepsError } = await admin.supabase
    .from("humor_flavor_steps")
    .select("id, order_by")
    .eq("humor_flavor_id", step.humor_flavor_id)
    .order("order_by", { ascending: true });

  if (allStepsError) {
    return NextResponse.json({ error: allStepsError.message }, { status: 400 });
  }

  const ordered = allSteps ?? [];
  const currentIndex = ordered.findIndex((item) => item.id === stepId);
  const moveOffset = body.direction === "up" ? -1 : 1;
  const targetIndex = currentIndex + moveOffset;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
    return NextResponse.json({ success: true });
  }

  const currentStep = ordered[currentIndex];
  const targetStep = ordered[targetIndex];

  const [updateCurrent, updateTarget] = await Promise.all([
    admin.supabase
      .from("humor_flavor_steps")
      .update({ order_by: targetStep.order_by })
      .eq("id", currentStep.id),
    admin.supabase
      .from("humor_flavor_steps")
      .update({ order_by: currentStep.order_by })
      .eq("id", targetStep.id),
  ]);

  const firstError = updateCurrent.error ?? updateTarget.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
