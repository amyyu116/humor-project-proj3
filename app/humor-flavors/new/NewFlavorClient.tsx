"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FLAVOR_DUPLICATE_STORAGE_KEY } from "@/app/humor-admin/utils";

type LookupItem = {
  id: number;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  label?: string | null;
};

type Lookups = {
  llm_models: LookupItem[];
  llm_input_types: LookupItem[];
  llm_output_types: LookupItem[];
  humor_flavor_step_types: LookupItem[];
};

type Props = {
  initialLookups: Lookups;
};

type CreateFlavorResponse = {
  humor_flavor: {
    id: number;
    slug: string;
  };
};

type StepDraft = {
  description: string;
  llm_temperature: string;
  llm_model_id: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  humor_flavor_step_type_id: number;
  llm_system_prompt: string;
  llm_user_prompt: string;
};

type DuplicateDraft = {
  slug: string;
  description: string;
  steps: StepDraft[];
};

function getLookupLabel(item: LookupItem): string {
  return item.name || item.label || item.slug || item.description || `ID ${item.id}`;
}

function createDefaultStep(lookups: Lookups): StepDraft {
  return {
    description: "",
    llm_temperature: "0.7",
    llm_model_id: lookups.llm_models[0]?.id ?? 0,
    llm_input_type_id: lookups.llm_input_types[0]?.id ?? 0,
    llm_output_type_id: lookups.llm_output_types[0]?.id ?? 0,
    humor_flavor_step_type_id: lookups.humor_flavor_step_types[0]?.id ?? 0,
    llm_system_prompt: "",
    llm_user_prompt: "{{input}}",
  };
}

export default function NewFlavorClient({ initialLookups }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([createDefaultStep(initialLookups)]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasRequiredLookups = Boolean(
    initialLookups.llm_models.length &&
      initialLookups.llm_input_types.length &&
      initialLookups.llm_output_types.length &&
      initialLookups.humor_flavor_step_types.length,
  );

  useEffect(() => {
    if (!searchParams.get("fromDuplicate")) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const raw = window.sessionStorage.getItem(FLAVOR_DUPLICATE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    window.sessionStorage.removeItem(FLAVOR_DUPLICATE_STORAGE_KEY);

    try {
      const parsed = JSON.parse(raw) as DuplicateDraft;
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      const nextSlug = typeof parsed.slug === "string" ? parsed.slug : "";
      const nextDescription =
        typeof parsed.description === "string" ? parsed.description : "";
      const nextSteps =
        Array.isArray(parsed.steps) && parsed.steps.length
          ? parsed.steps.map((step) => ({
              description: step.description ?? "",
              llm_temperature: step.llm_temperature ?? "",
              llm_model_id:
                typeof step.llm_model_id === "number"
                  ? step.llm_model_id
                  : initialLookups.llm_models[0]?.id ?? 0,
              llm_input_type_id:
                typeof step.llm_input_type_id === "number"
                  ? step.llm_input_type_id
                  : initialLookups.llm_input_types[0]?.id ?? 0,
              llm_output_type_id:
                typeof step.llm_output_type_id === "number"
                  ? step.llm_output_type_id
                  : initialLookups.llm_output_types[0]?.id ?? 0,
              humor_flavor_step_type_id:
                typeof step.humor_flavor_step_type_id === "number"
                  ? step.humor_flavor_step_type_id
                  : initialLookups.humor_flavor_step_types[0]?.id ?? 0,
              llm_system_prompt: step.llm_system_prompt ?? "",
              llm_user_prompt: step.llm_user_prompt ?? "",
            }))
          : [createDefaultStep(initialLookups)];

      setSlug(nextSlug);
      setDescription(nextDescription);
      setSteps(nextSteps);
      setActiveStepIndex(0);
    } catch {
      return;
    }
  }, [initialLookups, searchParams]);

  function updateStep(index: number, updater: (prev: StepDraft) => StepDraft) {
    setSteps((prev) => prev.map((step, i) => (i === index ? updater(step) : step)));
  }

  function addStep() {
    setSteps((prev) => [...prev, createDefaultStep(initialLookups)]);
    setActiveStepIndex(steps.length);
  }

  function removeStep(index: number) {
    const currentActive = activeStepIndex;
    setSteps((prev) => prev.filter((_item, i) => i !== index));
    if (index < currentActive) {
      setActiveStepIndex(currentActive - 1);
      return;
    }
    if (index === currentActive) {
      setActiveStepIndex(Math.max(0, currentActive - 1));
    }
  }

  const effectiveActiveStepIndex =
    activeStepIndex >= 0 && activeStepIndex < steps.length
      ? activeStepIndex
      : Math.max(0, steps.length - 1);
  const activeStep = steps[effectiveActiveStepIndex] ?? null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }

    if (!hasRequiredLookups) {
      setError("Lookup data is missing. Cannot create steps yet.");
      return;
    }

    if (!steps.length) {
      setError("Add at least one initial step.");
      return;
    }

    setLoading(true);
    try {
      const flavorResponse = await fetch("/api/admin/humor-flavors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          description,
        }),
      });

      const flavorBody = (await flavorResponse.json()) as {
        error?: string;
      } & Partial<CreateFlavorResponse>;

      if (!flavorResponse.ok || !flavorBody.humor_flavor) {
        throw new Error(flavorBody.error || "Failed to create humor flavor");
      }

      for (const step of steps) {
        const response = await fetch(
          `/api/admin/humor-flavors/${flavorBody.humor_flavor.id}/steps`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: step.description,
              llm_temperature: step.llm_temperature
                ? Number(step.llm_temperature)
                : null,
              llm_model_id: step.llm_model_id,
              llm_input_type_id: step.llm_input_type_id,
              llm_output_type_id: step.llm_output_type_id,
              humor_flavor_step_type_id: step.humor_flavor_step_type_id,
              llm_system_prompt: step.llm_system_prompt,
              llm_user_prompt: step.llm_user_prompt,
            }),
          },
        );

        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error || "Failed to create one of the steps");
        }
      }

      setStatus(
        `Created ${flavorBody.humor_flavor.slug} with ${steps.length} initial step${steps.length === 1 ? "" : "s"}. Redirecting...`,
      );
      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unexpected error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <section className="panel new-flavor-panel">
        <h1>Create Humor Flavor</h1>
        <p className="muted">Create the flavor and customize initial steps in one pass.</p>

        {status ? <p className="status-ok">{status}</p> : null}
        {error ? <p className="status-error">{error}</p> : null}

        <form className="stack" onSubmit={onSubmit}>
          <label>
            Slug
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="dry-sarcasm"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="One sentence about this humor flavor"
            />
          </label>

          <div className="row-buttons">
            <h2>Initial Steps</h2>
            <button type="button" onClick={addStep} disabled={!hasRequiredLookups || loading}>
              Add Step
            </button>
          </div>

          {!hasRequiredLookups ? (
            <p className="status-error">LLM lookup tables are empty. Please seed lookup data first.</p>
          ) : null}

          <div className="step-tab-panel">
            <div className="step-tabs">
              {steps.map((_step, index) => (
                <button
                  key={`new-step-tab-${index}`}
                  type="button"
                  className={index === effectiveActiveStepIndex ? "step-tab active" : "step-tab"}
                  onClick={() => setActiveStepIndex(index)}
                >
                  Step {index + 1}
                </button>
              ))}
            </div>

            {activeStep ? (
              <article className="step-card step-editor-card" key={`new-step-${effectiveActiveStepIndex}`}>
              <div className="row-buttons">
                <strong>Step {effectiveActiveStepIndex + 1}</strong>
                <button
                  type="button"
                  className="muted-button"
                  disabled={steps.length === 1 || loading}
                  onClick={() => removeStep(effectiveActiveStepIndex)}
                >
                  Remove
                </button>
              </div>

              <input
                value={activeStep.description}
                placeholder="Step description"
                onChange={(event) =>
                  updateStep(effectiveActiveStepIndex, (prev) => ({ ...prev, description: event.target.value }))
                }
              />

              <div className="step-grid">
                <label>
                  Model
                  <select
                    value={activeStep.llm_model_id}
                    onChange={(event) =>
                      updateStep(effectiveActiveStepIndex, (prev) => ({
                        ...prev,
                        llm_model_id: Number(event.target.value),
                      }))
                    }
                  >
                    {initialLookups.llm_models.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getLookupLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Input Type
                  <select
                    value={activeStep.llm_input_type_id}
                    onChange={(event) =>
                      updateStep(effectiveActiveStepIndex, (prev) => ({
                        ...prev,
                        llm_input_type_id: Number(event.target.value),
                      }))
                    }
                  >
                    {initialLookups.llm_input_types.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getLookupLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Output Type
                  <select
                    value={activeStep.llm_output_type_id}
                    onChange={(event) =>
                      updateStep(effectiveActiveStepIndex, (prev) => ({
                        ...prev,
                        llm_output_type_id: Number(event.target.value),
                      }))
                    }
                  >
                    {initialLookups.llm_output_types.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getLookupLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Step Type
                  <select
                    value={activeStep.humor_flavor_step_type_id}
                    onChange={(event) =>
                      updateStep(effectiveActiveStepIndex, (prev) => ({
                        ...prev,
                        humor_flavor_step_type_id: Number(event.target.value),
                      }))
                    }
                  >
                    {initialLookups.humor_flavor_step_types.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getLookupLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Temperature
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={activeStep.llm_temperature}
                    onChange={(event) =>
                      updateStep(effectiveActiveStepIndex, (prev) => ({
                        ...prev,
                        llm_temperature: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                System Prompt
                <textarea
                  className="prompt-textarea"
                  rows={8}
                  value={activeStep.llm_system_prompt}
                  onChange={(event) =>
                    updateStep(effectiveActiveStepIndex, (prev) => ({
                      ...prev,
                      llm_system_prompt: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                User Prompt Template
                <textarea
                  className="prompt-textarea"
                  rows={8}
                  value={activeStep.llm_user_prompt}
                  onChange={(event) =>
                    updateStep(effectiveActiveStepIndex, (prev) => ({
                      ...prev,
                      llm_user_prompt: event.target.value,
                    }))
                  }
                />
              </label>
              </article>
            ) : (
              <p className="muted">No steps yet. Add a step to get started.</p>
            )}
          </div>

          <div className="row-buttons">
            <button type="submit" disabled={loading || !hasRequiredLookups}>
              {loading ? "Creating..." : "Create Flavor + Steps"}
            </button>
            <Link href="/" className="button-link muted-button">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
