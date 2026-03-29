import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-context";
import { runPromptChain } from "@/lib/prompt-chain";

type Params = {
  params: Promise<{ id: string }>;
};

type TestPayload = {
  image_ids?: string[];
  image_urls?: string[];
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

  const body = (await req.json()) as TestPayload;
  const imageIds = (body.image_ids ?? body.image_urls ?? [])
    .map((value) => value.trim())
    .filter((value) => Boolean(value));

  if (!imageIds.length) {
    return NextResponse.json({ error: "Provide at least one image id" }, { status: 400 });
  }

  const bearerToken = admin.accessToken;
  if (!bearerToken) {
    return NextResponse.json({ error: "No Supabase session token found" }, { status: 401 });
  }

  const { data: imageRows } = await admin.supabase
    .from("images")
    .select("id, url")
    .in("id", imageIds);
  const imageUrlById = new Map(
    (imageRows ?? []).map((row) => [row.id, row.url]),
  );

  const { data: flavor, error: flavorError } = await admin.supabase
    .from("humor_flavors")
    .select("id, slug, humor_flavor_steps(*)")
    .eq("id", flavorId)
    .single();

  if (flavorError || !flavor) {
    return NextResponse.json(
      { error: flavorError?.message ?? "Humor flavor not found" },
      { status: 404 },
    );
  }

  const steps = [...(flavor.humor_flavor_steps ?? [])].sort((a, b) => a.order_by - b.order_by);

  if (!steps.length) {
    return NextResponse.json(
      { error: "Add at least one step before testing the flavor" },
      { status: 400 },
    );
  }

  const maxConcurrency = Number(
    process.env.CAPTION_TEST_CONCURRENCY ?? "4",
  );
  const safeConcurrency = Number.isFinite(maxConcurrency)
    ? Math.max(1, Math.min(Math.floor(maxConcurrency), imageIds.length))
    : 1;
  const results = new Array(imageIds.length);
  let cursor = 0;

  const runWorker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= imageIds.length) {
        break;
      }
      const imageId = imageIds[index];
      try {
        const runResult = await runPromptChain({
          imageId,
          imageUrl: imageUrlById.get(imageId),
          humorFlavorId: flavorId,
          steps,
          bearerToken,
        });

        results[index] = {
          image_id: imageId,
          captions: runResult.captions,
          final_output: runResult.finalOutput,
          step_outputs: runResult.steps,
        };
      } catch (error) {
        results[index] = {
          image_id: imageId,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  };

  await Promise.all(
    Array.from({ length: safeConcurrency }, () => runWorker()),
  );

  return NextResponse.json({
    flavor_id: flavor.id,
    flavor_slug: flavor.slug,
    results,
  });
}
