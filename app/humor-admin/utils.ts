import { Flavor, LookupItem } from "./types";

export const THEME_KEY = "humor_admin_theme";
export const PAGE_LENGTH = 8;

export function getLookupLabel(item: LookupItem): string {
  return item.name || item.label || item.slug || item.description || `ID ${item.id}`;
}

export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }

  return body as T;
}

export function normalizeFlavors(flavors: Flavor[]) {
  return flavors.map((flavor) => ({
    ...flavor,
    humor_flavor_steps: [...flavor.humor_flavor_steps].sort(
      (a, b) => a.order_by - b.order_by,
    ),
  }));
}
