import type { PasswordEntry } from "$lib/types";

export const KEEPASS_CSV_HEADER = ["Group", "Title", "Username", "Password", "URL", "Notes", "TOTP", "Icon", "Last Modified", "Created"];

function csvField(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
}

function isoDate(timestamp?: number): string {
    return timestamp && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : "";
}

export function exportToKeepassCSV(entries: PasswordEntry[]): string {
    const rows = entries.map((entry) => {
        const path = entry.group || (entry.tags || []).join("/");
        const group = path ? `keepass/${path}` : "keepass";
        return [group, entry.title || "", entry.username || "", entry.password || "", entry.site || "", entry.notes || "", "", "", isoDate(entry.modified), isoDate(entry.created)].map(csvField).join(",");
    });
    return [KEEPASS_CSV_HEADER.map(csvField).join(","), ...rows].join("\r\n") + "\r\n";
}
