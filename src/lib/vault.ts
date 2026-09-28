import type { PasswordEntry } from './types';

/**
 * Replace a sensitive string with random data before dropping the reference.
 * JavaScript strings are immutable, so this is best-effort protection only;
 * it cannot guarantee that an older string copy was erased by the runtime.
 */
export function overwriteSensitiveString(value: string): string {
    if (!value) return value;
    const bytes = new Uint8Array(value.length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => String.fromCharCode(byte)).join('');
}

/** Overwrite plaintext entry fields before the entry is discarded. */
export function overwriteSensitiveEntry(entry: PasswordEntry): void {
    entry.title = overwriteSensitiveString(entry.title);
    entry.username = entry.username === undefined ? undefined : overwriteSensitiveString(entry.username);
    entry.password = entry.password === undefined ? undefined : overwriteSensitiveString(entry.password);
    entry.site = entry.site === undefined ? undefined : overwriteSensitiveString(entry.site);
    entry.notes = entry.notes === undefined ? undefined : overwriteSensitiveString(entry.notes);
    entry.group = entry.group === undefined ? undefined : overwriteSensitiveString(entry.group);
    entry.tags = entry.tags?.map(tag => overwriteSensitiveString(tag));
}

/**
 * Sorts password entries alphabetically by title using the provided locale's collation.
 */
export function sortPasswordEntries(entries: PasswordEntry[], locale = "en"): PasswordEntry[] {
    return [...entries].sort((a, b) =>
        new Intl.Collator(locale, {
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

/**
 * Sanitizes password entries by removing sensitive data (passwords, usernames, etc.)
 * while preserving metadata for display purposes.
 */
export function sanitizeItems(items: PasswordEntry[]): PasswordEntry[] {
    return items.map(item => ({
        id: item.id,
        title: item.title,
        group: item.group,
        tags: item.tags,
        created: item.created,
        modified: item.modified,
        hasUsername: !!item.username,
        hasPassword: !!item.password,
        hasSite: !!item.site,
        // Strip sensitive data
        username: undefined,
        password: undefined,
        site: undefined,
        notes: undefined,
    }));
}
