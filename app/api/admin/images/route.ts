import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 200;

export async function GET(request: Request) {
  const admin = await getAdminContext();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)),
  );
  const query = (searchParams.get("query") ?? "").trim();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = admin.supabase
    .from("images")
    .select(
      "id, url, created_datetime_utc, additional_context, image_description, is_public, is_common_use",
      { count: "exact" },
    )
    .order("created_datetime_utc", { ascending: false });

  if (query) {
    const escaped = query.replace(/,/g, "\\,");
    dbQuery = dbQuery.or(
      [
        `id.ilike.%${escaped}%`,
        `url.ilike.%${escaped}%`,
        `image_description.ilike.%${escaped}%`,
        `additional_context.ilike.%${escaped}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await dbQuery.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    images: data ?? [],
    total: count ?? 0,
  });
}
