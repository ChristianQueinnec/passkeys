import type { PasswordEntry } from './types';

/**
 * Sorts password entries alphabetically by title using French collation.
 */
export function sortPasswordEntries(entries: PasswordEntry[]): PasswordEntry[] {
    return [...entries].sort((a, b) =>
        new Intl.Collator("fr", {
            sensitivity: "base",
            ignorePunctuation: true,
        }).compare(a.title || "", b.title || ""),
    );
}

/**
 * Filters password entries based on a search string across multiple fields.
 */
export function filterPasswordEntries(entries: PasswordEntry[], filter: string): PasswordEntry[] {
    if (!filter) return entries;
    const lowerFilter = filter.toLowerCase();
    return entries.filter((item) => {
        return (
            item.title?.toLowerCase().includes(lowerFilter) ||
            item.username?.toLowerCase().includes(lowerFilter) ||
            item.site?.toLowerCase().includes(lowerFilter) ||
            item.notes?.toLowerCase().includes(lowerFilter) ||
            item.tags?.some((t: string) =>
                t.toLowerCase().includes(lowerFilter),
            )
        );
    });
}

/**
 * Normalizes vault items by ensuring they have an ID and tags.
 */
export function normalizeVaultItems(
    items: Partial<PasswordEntry>[],
): PasswordEntry[] {
    return items.map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        title: item.title || "Untitled",
        tags: item.tags || [],
    } as PasswordEntry));
}
