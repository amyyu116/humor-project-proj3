import { ImageRecord, TestResult } from "../types";

type ImageTestPanelProps = {
    imageSearchTerm: string;
    onImageSearchTermChange: (value: string) => void;
    filteredImages: ImageRecord[];
    selectedImageIds: Set<string>;
    onToggleAllFilteredImages: () => void;
    onToggleImageSelection: (imageId: string) => void;
    selectedFlavorId: number | null;
    loading: boolean;
    onGenerateCaptions: () => void;
    testResults: TestResult[];
    imageById: Map<string, ImageRecord>;
};

export default function ImageTestPanel({
    imageSearchTerm,
    onImageSearchTermChange,
    filteredImages,
    selectedImageIds,
    onToggleAllFilteredImages,
    onToggleImageSelection,
    selectedFlavorId,
    loading,
    onGenerateCaptions,
    testResults,
    imageById,
}: ImageTestPanelProps) {
    return (
        <section className="panel">
            <h2>Flavor Test Set</h2>
            <p className="muted">
                Select images from the `images` table and generate captions.
            </p>
            <input
                placeholder="Search images..."
                value={imageSearchTerm}
                onChange={(event) =>
                    onImageSearchTermChange(event.target.value)
                }
            />
            <div className="row-buttons">
                <button
                    type="button"
                    className="muted-button"
                    onClick={onToggleAllFilteredImages}
                >
                    Toggle All Filtered
                </button>
                <span className="muted">Selected: {selectedImageIds.size}</span>
            </div>
            <div className="image-picker-list">
                {filteredImages.map((image) => {
                    const checked = selectedImageIds.has(image.id);
                    return (
                        <label
                            key={image.id}
                            className={
                                checked
                                    ? "image-picker-item checked"
                                    : "image-picker-item"
                            }
                        >
                            {image.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={image.url}
                                    alt="Image"
                                    className="image-picker-grid-thumb"
                                />
                            ) : (
                                <div className="image-picker-grid-thumb image-picker-empty">
                                    No URL
                                </div>
                            )}
                            <div className="image-picker-checkline">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                        onToggleImageSelection(image.id)
                                    }
                                />
                            </div>
                        </label>
                    );
                })}
                {!filteredImages.length && (
                    <p className="muted">No images match your search.</p>
                )}
            </div>
            <button
                type="button"
                disabled={!selectedFlavorId || loading}
                onClick={onGenerateCaptions}
            >
                Generate Captions
            </button>

            <div className="stack">
                {testResults.map((result) => (
                    <article key={result.image_id} className="result-card">
                        {imageById.get(result.image_id)?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={imageById.get(result.image_id)?.url ?? ""}
                                alt="Selected image"
                                className="image-picker-thumb"
                            />
                        ) : null}
                        {result.error ? (
                            <p className="status-error">{result.error}</p>
                        ) : (
                            <>
                                <p>
                                    <strong>Captions:</strong>
                                </p>
                                <ul>
                                    {(result.captions ?? []).map(
                                        (caption, index) => (
                                            <li
                                                key={`${result.image_id}-${index}`}
                                            >
                                                {caption}
                                            </li>
                                        ),
                                    )}
                                </ul>
                                {/* {result.final_output ? <p className="muted">Raw output: {result.final_output}</p> : null} */}
                            </>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
