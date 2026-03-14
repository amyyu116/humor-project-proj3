import { redirect } from "next/navigation";
import HumorAdminClient from "./HumorAdminClient";
import { createClient } from "@/utils/supabase/server";

type ImageRow = {
  id: string;
  url: string | null;
  created_datetime_utc: string;
  additional_context: string | null;
  image_description: string | null;
  is_public: boolean | null;
  is_common_use: boolean | null;
};

type CaptionRow = {
  image_id: string | null;
};

export default async function HomePage() {
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
    return (
      <main className="unauthorized-shell">
        <h1>Unauthorized</h1>
        <p>This tool requires profiles.is_superadmin or profiles.is_matrix_admin.</p>
        <form action="/auth/signout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </main>
    );
  }

  const [flavorsResult, modelsResult, inputTypesResult, outputTypesResult, stepTypesResult, imagesResult, captionsResult] =
    await Promise.all([
      supabase
        .from("humor_flavors")
        .select("id, created_datetime_utc, description, slug, humor_flavor_steps(*)")
        .order("id", { ascending: true }),
      supabase.from("llm_models").select("*").order("id", { ascending: true }),
      supabase.from("llm_input_types").select("*").order("id", { ascending: true }),
      supabase.from("llm_output_types").select("*").order("id", { ascending: true }),
      supabase.from("humor_flavor_step_types").select("*").order("id", { ascending: true }),
      supabase
        .from("images")
        .select(
          "id, url, created_datetime_utc, additional_context, image_description, is_public, is_common_use",
        )
        .order("created_datetime_utc", { ascending: false })
        .limit(300),
      supabase.from("captions").select("image_id").not("image_id", "is", null).limit(10000),
    ]);

  const images = (imagesResult.data ?? []) as ImageRow[];
  const captionRows = (captionsResult.error ? [] : (captionsResult.data ?? [])) as CaptionRow[];
  const captionCountByImageId = new Map<string, number>();

  for (const row of captionRows) {
    if (!row.image_id) {
      continue;
    }
    captionCountByImageId.set(
      row.image_id,
      (captionCountByImageId.get(row.image_id) ?? 0) + 1,
    );
  }

  const sortedImages = [...images].sort((a, b) => {
    const aCount = captionCountByImageId.get(a.id) ?? 0;
    const bCount = captionCountByImageId.get(b.id) ?? 0;

    if (bCount !== aCount) {
      return bCount - aCount;
    }

    return (
      new Date(b.created_datetime_utc).getTime() -
      new Date(a.created_datetime_utc).getTime()
    );
  });

  const flavors = (flavorsResult.data ?? []).map((flavor) => ({
    ...flavor,
    humor_flavor_steps: [...(flavor.humor_flavor_steps ?? [])].sort((a, b) => a.order_by - b.order_by),
  }));

  return (
    <HumorAdminClient
      userEmail={user.email ?? null}
      initialFlavors={flavors}
      initialLookups={{
        llm_models: modelsResult.data ?? [],
        llm_input_types: inputTypesResult.data ?? [],
        llm_output_types: outputTypesResult.data ?? [],
        humor_flavor_step_types: stepTypesResult.data ?? [],
      }}
      initialImages={sortedImages}
    />
  );
}
