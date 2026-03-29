import { useMemo, useState } from "react";
import { Flavor, FlavorStep, Lookups, LookupItem } from "../types";
import { getLookupLabel } from "../utils";

type FlavorEditorProps = {
  flavor: Flavor;
  lookups: Lookups;
  loading: boolean;
  onSaveFlavor: (flavorId: number, slug: string, description: string) => Promise<void>;
  onDeleteFlavor: (flavorId: number) => Promise<void>;
  onDuplicateFlavor: (flavor: Flavor) => void;
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
  onDuplicateFlavor,
  onCreateStep,
  onSaveStep,
  onDeleteStep,
  onMoveStep,
  onLocalFlavorUpdate,
}: FlavorEditorProps) {
  const [slug, setSlug] = useState(flavor.slug);
  const [description, setDescription] = useState(flavor.description || "");
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<Flavor | null>(null);
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

  function startEditing() {
    setSnapshot({
      ...flavor,
      humor_flavor_steps: flavor.humor_flavor_steps.map((step) => ({ ...step })),
    });
    setIsEditing(true);
  }

  function cancelEditing() {
    if (snapshot) {
      onLocalFlavorUpdate({
        ...snapshot,
        humor_flavor_steps: snapshot.humor_flavor_steps.map((step) => ({ ...step })),
      });
      setSlug(snapshot.slug);
      setDescription(snapshot.description || "");
    }
    setIsEditing(false);
  }

  const originalStepsById = useMemo(() => {
    if (!snapshot) {
      return new Map<number, FlavorStep>();
    }
    return new Map(snapshot.humor_flavor_steps.map((step) => [step.id, step]));
  }, [snapshot]);

  function lookupLabel(items: LookupItem[], id: number) {
    const item = items.find((entry) => entry.id === id);
    return item ? getLookupLabel(item) : `ID ${id}`;
  }

  function hasStepChanged(step: FlavorStep) {
    const original = originalStepsById.get(step.id);
    if (!original) {
      return true;
    }

    return (
      step.order_by !== original.order_by ||
      step.llm_temperature !== original.llm_temperature ||
      step.llm_input_type_id !== original.llm_input_type_id ||
      step.llm_output_type_id !== original.llm_output_type_id ||
      step.llm_model_id !== original.llm_model_id ||
      step.humor_flavor_step_type_id !== original.humor_flavor_step_type_id ||
      (step.llm_system_prompt || "") !== (original.llm_system_prompt || "") ||
      (step.llm_user_prompt || "") !== (original.llm_user_prompt || "") ||
      (step.description || "") !== (original.description || "")
    );
  }

  async function saveAllChanges() {
    await onSaveFlavor(flavor.id, slug, description);

    for (const step of flavor.humor_flavor_steps) {
      if (hasStepChanged(step)) {
        await onSaveStep(step);
      }
    }

    setIsEditing(false);
  }

  return (
    <div className="stack">
      <div className="editor-header">
        <h2>Flavor Details</h2>
        {!isEditing ? (
          <div className="row-buttons">
            <button type="button" disabled={loading} onClick={startEditing}>
              Edit Flavor
            </button>
            <button
              type="button"
              className="muted-button"
              disabled={loading}
              onClick={() => onDuplicateFlavor(flavor)}
            >
              Duplicate Flavor
            </button>
          </div>
        ) : (
          <div className="row-buttons">
            <button type="button" disabled={loading} onClick={saveAllChanges}>
              Save Changes
            </button>
            <button type="button" className="muted-button" disabled={loading} onClick={cancelEditing}>
              Cancel
            </button>
          </div>
        )}
      </div>
      <section className="flavor-description">
        <div className="flavor-description-header">
          <h3>Slug</h3>
        </div>
        {isEditing ? (
          <input value={slug} onChange={(event) => setSlug(event.target.value)} />
        ) : (
          <p className="flavor-description-text">{slug}</p>
        )}
      </section>
      <section className="flavor-description">
        <div className="flavor-description-header">
          <h3>Description</h3>
        </div>
        {isEditing ? (
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        ) : description.trim() ? (
          <p className="flavor-description-text">{description}</p>
        ) : (
          <p className="muted">No description yet.</p>
        )}
      </section>
      {isEditing ? (
        <div className="row-buttons">
          <button type="button" disabled={loading} onClick={() => onCreateStep(flavor.id)}>
            Add Step
          </button>
        </div>
      ) : null}

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
        ) : isEditing ? (
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
              <button type="button" disabled={loading} onClick={() => onDeleteStep(activeStep.id)}>
                Delete Step
              </button>
            </div>
          </article>
        ) : (
          <article className="step-card step-editor-card">
            <p>
              <strong>Step {sortedSteps.findIndex((s) => s.id === activeStep.id) + 1}</strong>
            </p>
            <p className="flavor-description-text">
              {activeStep.description || "No description provided."}
            </p>
            <div className="step-readonly-grid">
              <div>
                <p className="muted">Model</p>
                <p>{lookupLabel(lookups.llm_models, activeStep.llm_model_id)}</p>
              </div>
              <div>
                <p className="muted">Input Type</p>
                <p>{lookupLabel(lookups.llm_input_types, activeStep.llm_input_type_id)}</p>
              </div>
              <div>
                <p className="muted">Output Type</p>
                <p>{lookupLabel(lookups.llm_output_types, activeStep.llm_output_type_id)}</p>
              </div>
              <div>
                <p className="muted">Step Type</p>
                <p>{lookupLabel(lookups.humor_flavor_step_types, activeStep.humor_flavor_step_type_id)}</p>
              </div>
              <div>
                <p className="muted">Temperature</p>
                <p>{activeStep.llm_temperature ?? "Not set"}</p>
              </div>
            </div>
            <div>
              <p className="muted">System Prompt</p>
              <pre className="prompt-readonly">{activeStep.llm_system_prompt || "Not set."}</pre>
            </div>
            <div>
              <p className="muted">User Prompt Template</p>
              <pre className="prompt-readonly">{activeStep.llm_user_prompt || "Not set."}</pre>
            </div>
          </article>
        )}
      </div>
      {isEditing ? (
        <div className="editor-footer">
          <button type="button" disabled={loading} onClick={() => onDeleteFlavor(flavor.id)}>
            Delete Flavor
          </button>
        </div>
      ) : null}
    </div>
  );
}
