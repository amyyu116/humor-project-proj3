import Link from "next/link";
import { Flavor } from "../types";

type FlavorSidebarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  paginatedFlavors: Flavor[];
  filteredFlavorCount: number;
  selectedFlavorId: number | null;
  onSelectFlavor: (flavorId: number) => void;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export default function FlavorSidebar({
  searchTerm,
  onSearchTermChange,
  paginatedFlavors,
  filteredFlavorCount,
  selectedFlavorId,
  onSelectFlavor,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: FlavorSidebarProps) {
  return (
    <aside className="panel">
      <h2>Humor Flavors</h2>
      <Link href="/humor-flavors/new" className="button-link">
        Create New Flavor
      </Link>
      <input
        placeholder="Search flavors..."
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
      />
      <p className="muted">
        Showing {paginatedFlavors.length} of {filteredFlavorCount} matching flavors
      </p>

      <div className="stack">
        {paginatedFlavors.map((flavor) => (
          <button
            key={flavor.id}
            className={flavor.id === selectedFlavorId ? "list-item active" : "list-item"}
            onClick={() => onSelectFlavor(flavor.id)}
            type="button"
          >
            <strong>{flavor.slug}</strong>
            <span className="muted">{flavor.description || "No description"}</span>
          </button>
        ))}
        {!paginatedFlavors.length && <p className="muted">No flavors found.</p>}
      </div>

      <div className="pagination-controls">
        <button type="button" disabled={currentPage <= 1} onClick={onPreviousPage}>
          Previous
        </button>
        <span className="muted">
          Page {currentPage} of {totalPages}
        </span>
        <button type="button" disabled={currentPage >= totalPages} onClick={onNextPage}>
          Next
        </button>
      </div>
    </aside>
  );
}
