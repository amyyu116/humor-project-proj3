import { useState } from "react";
import { Flavor, FlavorStep, Lookups } from "../types";
import { getLookupLabel } from "../utils";

type FlavorEditorProps = {
  flavor: Flavor;
  lookups: Lookups;
  loading: boolean;
  onSaveFlavor: (flavorId: number, slug: string, description: string) => Promise<void>;
  onDeleteFlavor: (flavorId: number) => Promise<void>;
  onCreateStep: (flavorId: number) => Promise<void>;
  onSaveStep: (step: FlavorStep) => Promise<void>;
  onDeleteStep: (stepId: number) => Promise<void>;
  onMoveStep: (stepId: number, direction: "up" | "down") => Promise<void>;
  onLocalFlavorUpdate: (flavor: Flavor) => void;
};

export default function FlavorEditor({
  flavor,
  lookups,
  loading,
  onSaveFlavor,
  onDeleteFlavor,
  onCreateStep,
  onSaveStep,
  onDeleteStep,
  onMoveStep,
  onLocalFlavorUpdate,
}: FlavorEditorProps) {
  const [slug, setSlug] = useState(flavor.slug);
  const [description, setDescription] = useState(flavor.description || "");
  const sortedSteps = [...flavor.humor_flavor_steps].sort((a, b) => a.order_by - b.order_by);
  const [activeStepId, setActiveStepId] = useState<number | null>(sortedSteps[0]?.id ?? null);

  const effectiveActiveStepId = sortedSteps.some((step) => step.id === activeStepId)
    ? activeStepId
    : sortedSteps[0]?.id ?? null;
  const activeStep = sortedSteps.find((step) => step.id === effectiveActiveStepId) ?? null;

  function updateStepLocally(stepId: number, updater: (step: FlavorStep) => FlavorStep) {
    onLocalFlavorUpdate({
      ...flavor,
      humor_flavor_steps: flavor.humor_flavor_steps.map((step) =>
        step.id === stepId ? updater(step) : step,
      ),
    });
  }

  return (
    <div className="stack">
      <h2>Flavor Editor</h2>
      <label>
        Slug
        <input value={slug} onChange={(event) => setSlug(event.target.value)} />
      </label>
      <label>
        Description
        <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="row-buttons">
        <button type="button" disabled={loading} onClick={() => onSaveFlavor(flavor.id, slug, description)}>
          Save Flavor
        </button>
        <button type="button" disabled={loading} onClick={() => onDeleteFlavor(flavor.id)}>
          Delete Flavor
        </button>
        <button type="button" disabled={loading} onClick={() => onCreateStep(flavor.id)}>
          Add Step
        </button>
      </div>

      <h3>Steps</h3>
      <div className="step-tab-panel">
        <div className="step-tabs">
          {sortedSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={step.id === effectiveActiveStepId ? "step-tab active" : "step-tab"}
              onClick={() => setActiveStepId(step.id)}
            >
              Step {index + 1}
            </button>
          ))}
        </div>

        {!activeStep ? (
          <p className="muted">No steps yet. Add a step to get started.</p>
        ) : (
          <article className="step-card step-editor-card">
            <p>
              <strong>Step {sortedSteps.findIndex((s) => s.id === activeStep.id) + 1}</strong>
            </p>
            <input
              value={activeStep.description || ""}
              placeholder="Step description"
              onChange={(event) =>
                updateStepLocally(activeStep.id, (prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />

            <div className="step-grid">
              <label>
                Model
                <select
                  value={activeStep.llm_model_id}
                  onChange={(event) =>
                    updateStepLocally(activeStep.id, (prev) => ({
                      ...prev,
                      llm_model_id: Number(event.target.value),
                    }))
                  }
                >
                  {lookups.llm_models.map((item) => (
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
                    updateStepLocally(activeStep.id, (prev) => ({
                      ...prev,
                      llm_input_type_id: Number(event.target.value),
                    }))
                  }
                >
                  {lookups.llm_input_types.map((item) => (
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
                    updateStepLocally(activeStep.id, (prev) => ({
                      ...prev,
                      llm_output_type_id: Number(event.target.value),
                    }))
                  }
                >
                  {lookups.llm_output_types.map((item) => (
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
                    updateStepLocally(activeStep.id, (prev) => ({
                      ...prev,
                      humor_flavor_step_type_id: Number(event.target.value),
                    }))
                  }
                >
                  {lookups.humor_flavor_step_types.map((item) => (
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
                  value={activeStep.llm_temperature ?? ""}
                  onChange={(event) =>
                    updateStepLocally(activeStep.id, (prev) => ({
                      ...prev,
                      llm_temperature: event.target.value ? Number(event.target.value) : null,
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
                value={activeStep.llm_system_prompt || ""}
                onChange={(event) =>
                  updateStepLocally(activeStep.id, (prev) => ({
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
                value={activeStep.llm_user_prompt || ""}
                onChange={(event) =>
                  updateStepLocally(activeStep.id, (prev) => ({
                    ...prev,
                    llm_user_prompt: event.target.value,
                  }))
                }
              />
            </label>

            <div className="row-buttons">
              <button type="button" disabled={loading} onClick={() => onMoveStep(activeStep.id, "up")}>
                Move Up
              </button>
              <button type="button" disabled={loading} onClick={() => onMoveStep(activeStep.id, "down")}>
                Move Down
              </button>
              <button type="button" disabled={loading} onClick={() => onSaveStep(activeStep)}>
                Save Step
              </button>
              <button type="button" disabled={loading} onClick={() => onDeleteStep(activeStep.id)}>
                Delete Step
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
