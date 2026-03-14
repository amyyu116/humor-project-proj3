export type PromptChainStep = {
    id: number;
    order_by: number;
    llm_temperature: number | null;
    llm_model_id: number;
    llm_input_type_id: number;
    llm_output_type_id: number;
    humor_flavor_step_type_id: number;
    llm_system_prompt: string | null;
    llm_user_prompt: string | null;
    description: string | null;
};

type RunPromptChainInput = {
    imageId: string;
    humorFlavorId: number;
    steps: PromptChainStep[];
    bearerToken: string;
};

type RawCaptionRecord = Record<string, unknown>;

const DEFAULT_BASE_URL = "https://api.almostcrackd.ai";
const DEFAULT_CAPTION_PATH = "/pipeline/generate-captions";

function toCaptionArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\n+/)
            .map((line) => line.replace(/^[-*0-9.)\s]+/, "").trim())
            .filter(Boolean)
            .slice(0, 5);
    }

    return [];
}

function pickCaptionText(record: RawCaptionRecord): string {
    const candidate =
        record.caption ??
        record.caption_text ??
        record.captionText ??
        record.final_caption ??
        record.caption_output ??
        record.content ??
        record.text ??
        record.generated_caption ??
        record.output ??
        record.result;

    return typeof candidate === "string" ? candidate.trim() : "";
}

function collectCaptionLikeStrings(value: unknown): string[] {
    if (!value || typeof value !== "object") {
        return [];
    }

    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    const direct = keys
        .filter((key) => key.toLowerCase().includes("caption"))
        .map((key) => objectValue[key])
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

    const nested = keys.flatMap((key) => {
        const child = objectValue[key];
        if (Array.isArray(child)) {
            return child.flatMap((item) => collectCaptionLikeStrings(item));
        }
        if (child && typeof child === "object") {
            return collectCaptionLikeStrings(child);
        }
        return [];
    });

    return [...direct, ...nested];
}

function extractCaptionsFromResponse(body: unknown): string[] {
    if (Array.isArray(body)) {
        const mapped = body
            .map((record) =>
                record && typeof record === "object"
                    ? pickCaptionText(record as RawCaptionRecord)
                    : "",
            )
            .filter(Boolean);

        if (mapped.length) {
            return mapped;
        }

        return body.flatMap((record) => collectCaptionLikeStrings(record));
    }

    if (!body || typeof body !== "object") {
        return [];
    }

    const objectBody = body as RawCaptionRecord;
    const candidates = [
        objectBody.captions,
        objectBody.records,
        objectBody.results,
        objectBody.data,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            const captions = extractCaptionsFromResponse(candidate);
            if (captions.length) {
                return captions;
            }
        }
    }

    const directText = pickCaptionText(objectBody);
    if (directText) {
        return [directText];
    }

    return collectCaptionLikeStrings(objectBody);
}

async function generateCaptionsFromApi(
    imageId: string,
    humorFlavorId: number,
    bearerToken: string,
): Promise<string[]> {
    const baseUrl = process.env.ALMOSTCRACKD_API_URL ?? DEFAULT_BASE_URL;
    const captionPath =
        process.env.ALMOSTCRACKD_CAPTION_PATH ?? DEFAULT_CAPTION_PATH;
    const response = await fetch(`${baseUrl}${captionPath}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
            imageId,
            humorFlavorId,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `REST API call failed (${response.status}): ${errorBody}`,
        );
    }

    const body = (await response.json()) as unknown;
    return extractCaptionsFromResponse(body);
}

export async function runPromptChain({
    imageId,
    humorFlavorId,
    steps,
    bearerToken,
}: RunPromptChainInput) {
    const orderedSteps = [...steps].sort((a, b) => a.order_by - b.order_by);
    const captions = await generateCaptionsFromApi(
        imageId,
        humorFlavorId,
        bearerToken,
    );
    const finalOutput = captions.join("\n");
    const stepOutput = finalOutput || "Caption generation completed.";
    const outputs = orderedSteps.map((step) => ({
        stepId: step.id,
        orderBy: step.order_by,
        output: stepOutput,
    }));

    return {
        finalOutput,
        captions: toCaptionArray(captions),
        steps: outputs,
    };
}
