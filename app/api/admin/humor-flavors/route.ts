import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

type FlavorPayload = {
  slug?: string;
  description?: string | null;
};

export async function GET() {
  const admin = await getAdminContext();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin.supabase
    .from("humor_flavors")
    .select("id, created_datetime_utc, slug, description, humor_flavor_steps(*)")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const normalized = (data ?? []).map((flavor) => ({
    ...flavor,
    humor_flavor_steps: [...(flavor.humor_flavor_steps ?? [])].sort(
      (a, b) => a.order_by - b.order_by,
    ),
  }));

  return NextResponse.json({ humor_flavors: normalized });
}

export async function POST(req: Request) {
  const admin = await getAdminContext();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as FlavorPayload;
  const slug = body.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("humor_flavors")
    .insert({
      slug,
      description: body.description?.trim() || null,
    })
    .select("id, created_datetime_utc, slug, description")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ humor_flavor: data }, { status: 201 });
}
