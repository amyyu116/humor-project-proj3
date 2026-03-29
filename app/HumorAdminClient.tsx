"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FlavorEditor from "./humor-admin/components/FlavorEditor";
import FlavorSidebar from "./humor-admin/components/FlavorSidebar";
import ImageTestPanel from "./humor-admin/components/ImageTestPanel";
import {
    Flavor,
    FlavorStep,
    HumorAdminProps,
    ImageRecord,
    Lookups,
    TestResult,
    ThemeMode,
} from "./humor-admin/types";
import {
    normalizeFlavors,
    PAGE_LENGTH,
    IMAGE_PAGE_LENGTH,
    requestJson,
    THEME_KEY,
    FLAVOR_DUPLICATE_STORAGE_KEY,
} from "./humor-admin/utils";

export default function HumorAdminClient({
    initialFlavors,
    initialLookups,
    initialImages,
    userEmail,
}: HumorAdminProps) {
    const router = useRouter();
    const [flavors, setFlavors] = useState<Flavor[]>(
        normalizeFlavors(initialFlavors),
    );
    const [lookups] = useState<Lookups>(initialLookups);
    const [images] = useState<ImageRecord[]>(initialImages);

    const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(
        initialFlavors[0]?.id ?? null,
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [status, setStatus] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const [imageSearchTerm, setImageSearchTerm] = useState("");
    const [imagePage, setImagePage] = useState(1);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
        new Set(),
    );
    const [testResults, setTestResults] = useState<TestResult[]>([]);

    const [themeMode, setThemeMode] = useState<ThemeMode>("system");

    const selectedFlavor = useMemo(
        () => flavors.find((item) => item.id === selectedFlavorId) ?? null,
        [flavors, selectedFlavorId],
    );

    const filteredFlavors = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return flavors;
        }

        return flavors.filter((flavor) => {
            const slugMatch = flavor.slug.toLowerCase().includes(query);
            const descriptionMatch =
                flavor.description?.toLowerCase().includes(query) ?? false;
            return slugMatch || descriptionMatch;
        });
    }, [flavors, searchTerm]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredFlavors.length / PAGE_LENGTH),
    );

    const paginatedFlavors = useMemo(() => {
        const safePage = Math.min(currentPage, totalPages);
        const start = (safePage - 1) * PAGE_LENGTH;
        return filteredFlavors.slice(start, start + PAGE_LENGTH);
    }, [currentPage, filteredFlavors, totalPages]);

    const filteredImages = useMemo(() => {
        const query = imageSearchTerm.trim().toLowerCase();
        if (!query) {
            return images;
        }

        return images.filter((image) => {
            const idMatch = image.id.toLowerCase().includes(query);
            const urlMatch = image.url?.toLowerCase().includes(query) ?? false;
            const descMatch =
                image.image_description?.toLowerCase().includes(query) ?? false;
            const contextMatch =
                image.additional_context?.toLowerCase().includes(query) ??
                false;
            return idMatch || urlMatch || descMatch || contextMatch;
        });
    }, [imageSearchTerm, images]);

    const imageTotalPages = Math.max(
        1,
        Math.ceil(filteredImages.length / IMAGE_PAGE_LENGTH),
    );

    const paginatedImages = useMemo(() => {
        const safePage = Math.min(imagePage, imageTotalPages);
        const start = (safePage - 1) * IMAGE_PAGE_LENGTH;
        return filteredImages.slice(start, start + IMAGE_PAGE_LENGTH);
    }, [filteredImages, imagePage, imageTotalPages]);

    const imageById = useMemo(
        () => new Map(images.map((image) => [image.id, image])),
        [images],
    );

    useEffect(() => {
        const savedMode = window.localStorage.getItem(
            THEME_KEY,
        ) as ThemeMode | null;
        if (
            savedMode === "light" ||
            savedMode === "dark" ||
            savedMode === "system"
        ) {
            setThemeMode(savedMode);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        const applyMode = (mode: ThemeMode) => {
            if (mode === "system") {
                const prefersDark = window.matchMedia(
                    "(prefers-color-scheme: dark)",
                ).matches;
                root.dataset.theme = prefersDark ? "dark" : "light";
            } else {
                root.dataset.theme = mode;
            }
        };

        applyMode(themeMode);
        window.localStorage.setItem(THEME_KEY, themeMode);

        if (themeMode !== "system") {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => applyMode("system");
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
    }, [themeMode]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setImagePage(1);
    }, [imageSearchTerm]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        if (imagePage > imageTotalPages) {
            setImagePage(imageTotalPages);
        }
    }, [imagePage, imageTotalPages]);

    async function refreshFlavors() {
        const body = await requestJson<{ humor_flavors: Flavor[] }>(
            "/api/admin/humor-flavors",
        );
        const nextFlavors = normalizeFlavors(body.humor_flavors);
        setFlavors(nextFlavors);

        if (!nextFlavors.some((flavor) => flavor.id === selectedFlavorId)) {
            setSelectedFlavorId(nextFlavors[0]?.id ?? null);
        }
    }

    function clearMessages() {
        setStatus("");
        setError("");
    }

    async function withLoading(task: () => Promise<void>) {
        clearMessages();
        setLoading(true);
        try {
            await task();
        } catch (taskError) {
            setError(
                taskError instanceof Error
                    ? taskError.message
                    : "Unexpected error",
            );
        } finally {
            setLoading(false);
        }
    }

    function updateSelectedFlavorLocally(updater: (flavor: Flavor) => Flavor) {
        setFlavors((prev) =>
            prev.map((item) =>
                item.id === selectedFlavorId ? updater(item) : item,
            ),
        );
    }

    async function saveFlavor(
        flavorId: number,
        slug: string,
        description: string,
    ) {
        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavors/${flavorId}`, {
                method: "PATCH",
                body: JSON.stringify({ slug, description }),
            });

            await refreshFlavors();
            setStatus("Humor flavor updated.");
        });
    }

    async function deleteFlavor(flavorId: number) {
        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavors/${flavorId}`, {
                method: "DELETE",
            });

            await refreshFlavors();
            setStatus("Humor flavor deleted.");
        });
    }

    async function createStep(flavorId: number) {
        const defaultModel = lookups.llm_models[0]?.id;
        const defaultInput = lookups.llm_input_types[0]?.id;
        const defaultOutput = lookups.llm_output_types[0]?.id;
        const defaultStepType = lookups.humor_flavor_step_types[0]?.id;

        if (
            !defaultModel ||
            !defaultInput ||
            !defaultOutput ||
            !defaultStepType
        ) {
            setError("Lookup tables are missing data.");
            return;
        }

        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavors/${flavorId}/steps`, {
                method: "POST",
                body: JSON.stringify({
                    description: "",
                    llm_temperature: 0.7,
                    llm_model_id: defaultModel,
                    llm_input_type_id: defaultInput,
                    llm_output_type_id: defaultOutput,
                    humor_flavor_step_type_id: defaultStepType,
                    llm_system_prompt: "",
                    llm_user_prompt: "{{input}}",
                }),
            });

            await refreshFlavors();
            setStatus("Step created.");
        });
    }

    async function saveStep(step: FlavorStep) {
        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavor-steps/${step.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    description: step.description,
                    llm_temperature: step.llm_temperature,
                    llm_model_id: step.llm_model_id,
                    llm_input_type_id: step.llm_input_type_id,
                    llm_output_type_id: step.llm_output_type_id,
                    humor_flavor_step_type_id: step.humor_flavor_step_type_id,
                    llm_system_prompt: step.llm_system_prompt,
                    llm_user_prompt: step.llm_user_prompt,
                }),
            });

            await refreshFlavors();
            setStatus("Step updated.");
        });
    }

    async function deleteStep(stepId: number) {
        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavor-steps/${stepId}`, {
                method: "DELETE",
            });

            await refreshFlavors();
            setStatus("Step deleted.");
        });
    }

    async function moveStep(stepId: number, direction: "up" | "down") {
        await withLoading(async () => {
            await requestJson(`/api/admin/humor-flavor-steps/${stepId}/move`, {
                method: "POST",
                body: JSON.stringify({ direction }),
            });

            await refreshFlavors();
            setStatus("Step order updated.");
        });
    }

    async function runFlavorTest(flavorId: number) {
        const imageIds = Array.from(selectedImageIds);

        if (!imageIds.length) {
            setError("Select at least one image.");
            return;
        }

        await withLoading(async () => {
            const body = await requestJson<{ results: TestResult[] }>(
                `/api/admin/humor-flavors/${flavorId}/test`,
                {
                    method: "POST",
                    body: JSON.stringify({ image_ids: imageIds }),
                },
            );

            setTestResults(body.results);
            setSelectedImageIds(new Set());
            setStatus("Test run finished.");
        });
    }

    function toggleImageSelection(imageId: string) {
        setSelectedImageIds((prev) => {
            const next = new Set(prev);
            if (next.has(imageId)) {
                next.delete(imageId);
            } else {
                next.add(imageId);
            }
            return next;
        });
    }

    function toggleAllFilteredImages() {
        const filteredIds = paginatedImages.map((image) => image.id);
        const allSelected = filteredIds.every((id) => selectedImageIds.has(id));

        setSelectedImageIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                filteredIds.forEach((id) => next.delete(id));
            } else {
                filteredIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }

    function duplicateFlavor(flavor: Flavor) {
        if (typeof window === "undefined") {
            return;
        }

        const sortedSteps = [...flavor.humor_flavor_steps].sort(
            (a, b) => a.order_by - b.order_by,
        );
        const draft = {
            slug: flavor.slug,
            description: flavor.description ?? "",
            steps: sortedSteps.map((step) => ({
                description: step.description ?? "",
                llm_temperature:
                    step.llm_temperature === null
                        ? ""
                        : String(step.llm_temperature),
                llm_model_id: step.llm_model_id,
                llm_input_type_id: step.llm_input_type_id,
                llm_output_type_id: step.llm_output_type_id,
                humor_flavor_step_type_id: step.humor_flavor_step_type_id,
                llm_system_prompt: step.llm_system_prompt ?? "",
                llm_user_prompt: step.llm_user_prompt ?? "",
            })),
        };

        window.sessionStorage.setItem(
            FLAVOR_DUPLICATE_STORAGE_KEY,
            JSON.stringify(draft),
        );
        router.push("/humor-flavors/new?fromDuplicate=1");
    }

    return (
        <main className="admin-shell">
            <header className="top-bar">
                <div>
                    <h1>Humor Prompt Chain Admin</h1>
                    <p className="muted">
                        Signed in as {userEmail ?? "unknown user"}
                    </p>
                </div>
                <div className="top-actions">
                    <label>
                        Theme
                        <select
                            value={themeMode}
                            onChange={(event) =>
                                setThemeMode(event.target.value as ThemeMode)
                            }
                        >
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </label>
                    <form action="/auth/signout" method="post">
                        <button type="submit">Sign out</button>
                    </form>
                </div>
            </header>

            {(status || error) && (
                <section className="status-row">
                    {status ? <p className="status-ok">{status}</p> : null}
                    {error ? <p className="status-error">{error}</p> : null}
                </section>
            )}

            <section className="grid-layout">
                <FlavorSidebar
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    paginatedFlavors={paginatedFlavors}
                    filteredFlavorCount={filteredFlavors.length}
                    selectedFlavorId={selectedFlavorId}
                    onSelectFlavor={setSelectedFlavorId}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPreviousPage={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    onNextPage={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                />

                <section className="panel">
                    {!selectedFlavor && <p>Select a flavor to edit.</p>}
                    {selectedFlavor && (
                        <FlavorEditor
                            key={selectedFlavor.id}
                            flavor={selectedFlavor}
                            lookups={lookups}
                            loading={loading}
                            onSaveFlavor={saveFlavor}
                            onDeleteFlavor={deleteFlavor}
                            onDuplicateFlavor={duplicateFlavor}
                            onCreateStep={createStep}
                            onSaveStep={saveStep}
                            onDeleteStep={deleteStep}
                            onMoveStep={moveStep}
                            onLocalFlavorUpdate={(nextFlavor) =>
                                updateSelectedFlavorLocally(() => nextFlavor)
                            }
                        />
                    )}
                </section>

                <ImageTestPanel
                    imageSearchTerm={imageSearchTerm}
                    onImageSearchTermChange={setImageSearchTerm}
                    images={paginatedImages}
                    selectedImageIds={selectedImageIds}
                    onToggleAllFilteredImages={toggleAllFilteredImages}
                    onToggleImageSelection={toggleImageSelection}
                    selectedFlavorId={selectedFlavorId}
                    loading={loading}
                    imagePage={imagePage}
                    imageTotalPages={imageTotalPages}
                    onPreviousImagePage={() =>
                        setImagePage((prev) => Math.max(1, prev - 1))
                    }
                    onNextImagePage={() =>
                        setImagePage((prev) =>
                            Math.min(imageTotalPages, prev + 1),
                        )
                    }
                    onSelectImagePage={setImagePage}
                    onGenerateCaptions={() =>
                        selectedFlavorId && runFlavorTest(selectedFlavorId)
                    }
                    testResults={testResults}
                    imageById={imageById}
                />
            </section>
        </main>
    );
}
