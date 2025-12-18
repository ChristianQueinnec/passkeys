export interface PasswordEntry {
    id: string;
    title: string;
    username: string;
    password: string;
    site: string;
    tags: string[];
    notes: string;
    group?: string; // Optional group from KeePass
    created?: number; // Unix timestamp in seconds
    modified?: number; // Unix timestamp in seconds
}

export interface VaultMetadata {
    date: string;
    data: {
        iv: string;
        cipher: string;
    };
}

export interface HistoryItem {
    name: string;
    size: number;
    mtime: Date;
}
