import { ImageRecord, TestResult } from "../types";

type ImageTestPanelProps = {
    imageSearchTerm: string;
    onImageSearchTermChange: (value: string) => void;
    images?: ImageRecord[];
    selectedImageIds: Set<string>;
    onToggleAllFilteredImages: () => void;
    onToggleImageSelection: (imageId: string) => void;
    selectedFlavorId: number | null;
    loading: boolean;
    imagePage?: number;
    imageTotalPages?: number;
    onPreviousImagePage?: () => void;
    onNextImagePage?: () => void;
    onSelectImagePage?: (page: number) => void;
    onGenerateCaptions: () => void;
    testResults: TestResult[];
    imageById: Map<string, ImageRecord>;
};

export default function ImageTestPanel({
    imageSearchTerm,
    onImageSearchTermChange,
    images = [],
    selectedImageIds,
    onToggleAllFilteredImages,
    onToggleImageSelection,
    selectedFlavorId,
    loading,
    imagePage = 1,
    imageTotalPages = 1,
    onPreviousImagePage = () => {},
    onNextImagePage = () => {},
    onSelectImagePage = () => {},
    onGenerateCaptions,
    testResults,
    imageById,
}: ImageTestPanelProps) {
    const imagePages = Array.from(
        { length: imageTotalPages },
        (_, index) => index + 1,
    );

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
            <div className="image-toolbar">
                <div className="image-toolbar-left">
                    <button
                        type="button"
                        className="muted-button"
                        onClick={onToggleAllFilteredImages}
                    >
                        Toggle Page
                    </button>
                    <span className="image-pill">
                        Selected: {selectedImageIds.size}
                    </span>
                </div>
            </div>
            <div className="image-picker-list">
                {images.map((image) => {
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
                {!images.length && (
                    <p className="muted">No images match your search.</p>
                )}
            </div>
            <div className="image-toolbar-right">
                <span className="muted">
                    Page {imagePage} of {imageTotalPages}
                </span>
                <div className="image-pager">
                    <button
                        type="button"
                        className="muted-button"
                        disabled={imagePage <= 1 || loading}
                        onClick={onPreviousImagePage}
                    >
                        Previous
                    </button>
                    {imagePages.map((page) => (
                        <button
                            key={`image-page-${page}`}
                            type="button"
                            className={
                                page === imagePage
                                    ? "muted-button page-button active"
                                    : "muted-button page-button"
                            }
                            disabled={loading}
                            onClick={() => onSelectImagePage(page)}
                        >
                            {page}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="muted-button"
                        disabled={imagePage >= imageTotalPages || loading}
                        onClick={onNextImagePage}
                    >
                        Next
                    </button>
                </div>
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
