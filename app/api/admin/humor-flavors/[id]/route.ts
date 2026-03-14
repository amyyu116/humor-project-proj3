import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

type Params = {
  params: Promise<{ id: string }>;
};

type FlavorUpdatePayload = {
  slug?: string;
  description?: string | null;
};

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const flavorId = Number(id);
  if (!Number.isFinite(flavorId)) {
    return NextResponse.json({ error: "Invalid flavor id" }, { status: 400 });
  }

  const body = (await req.json()) as FlavorUpdatePayload;
  const updatePayload: Record<string, string | null> = {};

  if (typeof body.slug === "string") {
    const trimmedSlug = body.slug.trim();
    if (!trimmedSlug) {
      return NextResponse.json({ error: "Slug cannot be empty" }, { status: 400 });
    }
    updatePayload.slug = trimmedSlug;
  }

  if (body.description !== undefined) {
    updatePayload.description = body.description?.trim() || null;
  }

  const { data, error } = await admin.supabase
    .from("humor_flavors")
    .update(updatePayload)
    .eq("id", flavorId)
    .select("id, created_datetime_utc, slug, description")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ humor_flavor: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const flavorId = Number(id);

  if (!Number.isFinite(flavorId)) {
    return NextResponse.json({ error: "Invalid flavor id" }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("humor_flavors")
    .delete()
    .eq("id", flavorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
