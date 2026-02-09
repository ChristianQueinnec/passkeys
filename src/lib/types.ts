export interface PasswordEntry {
    id: string;
    title: string;
    username?: string;
    password?: string;
    site?: string;
    tags?: string[];
    notes?: string;
    group?: string; // Optional group from KeePass
    created?: number; // Unix timestamp in seconds
    modified?: number; // Unix timestamp in seconds

    // Metadata flags for always-ciphered mode
    hasUsername?: boolean;
    hasPassword?: boolean;
    hasSite?: boolean;
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
    isCiphered: boolean;
}

export interface CipheredVaultData {
    iv: string;
    cipher: string;
}

export interface FolderNode {
    name: string;
    fullPath: string;
    isOpen: boolean;
    children: FolderNode[];
    entries: PasswordEntry[];
}

export type User = {
    username: string;
    password: string;
};