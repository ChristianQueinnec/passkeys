import { api } from "$lib/api";
import { decrypt, encrypt } from "$lib/crypto";
import { sortPasswordEntries, normalizeVaultItems } from "$lib/vault";
import type { PasswordEntry, HistoryItem, CipheredVaultData } from "$lib/types";
import { browser } from "$app/environment";
import { settings } from "./useSettings.svelte";

export function useVault(
    getEncryptionKey: () => CryptoKey,
) {

    // State
    let items = $state<PasswordEntry[]>([]);
    let selectedItem = $state<PasswordEntry | null>(null);
    let editingItem = $state<PasswordEntry | null>(null);
    let isCreating = $state(false);

    let isDirty = $state(false);
    let lastSavedDate = $state<string | null>(null);
    let offlineMode = $state(false);

    let isLoading = false;
    let isSyncing = $state(false);

    let encryptedVaultData = $state<CipheredVaultData | null>(null);
    let newerVersionAvailable = $state(false);

    // History state
    let showHistoryModal = $state(false);
    let historyFiles = $state<HistoryItem[]>([]);

    let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;

    // Vault Operations
    async function loadVault() {
        isLoading = true;
        let unsortedItems: PasswordEntry[] = [];
        let vaultContent = null;
        try {
            const start = Date.now();
            vaultContent = await api.getLatestVault();
            if (vaultContent) {
                offlineMode = false;
                if (!Array.isArray(vaultContent)) {
                    localStorage.setItem(
                        "offline_vault",
                        JSON.stringify(vaultContent),
                    );
                }
                console.log(
                    `Vault loaded from server in ${Date.now() - start}ms`,
                );
                newerVersionAvailable = false;
            }
        } catch (e) {
            console.log("Failed to load vault from server", e);
            const offline = localStorage.getItem("offline_vault");
            if (offline) {
                vaultContent = JSON.parse(offline);
                offlineMode = true;
            } else {
                alert("Failed to decrypt vault and no offline copy found.");
                isLoading = false;
                return;
            }
        }

        let success = false;
        try {
            unsortedItems = [];
            if (vaultContent) {
                if (Array.isArray(vaultContent)) {
                    unsortedItems = normalizeVaultItems(vaultContent);
                    isDirty = true;
                    success = true;
                } else {
                    try {
                        const parsed = vaultContent;

                        let encryptedData;
                        if (parsed.date && parsed.data) {
                            lastSavedDate = parsed.date;
                            encryptedData = parsed.data;
                        } else {
                            encryptedData = parsed;
                        }

                        encryptedVaultData = encryptedData;

                        const jsonStr = await decrypt(
                            encryptedData.cipher,
                            encryptedData.iv,
                            getEncryptionKey(),
                        );
                        unsortedItems = JSON.parse(jsonStr);
                        isDirty = false;
                        success = true;
                    } catch (e) {
                        alert("Failed to decrypt vault.");
                        success = false;
                    }
                }
            } else {
                // No existing vault? Initialize an empty one.
                unsortedItems = [];
                isDirty = true;
                success = true;
            }
        } finally {
            items = sortPasswordEntries(unsortedItems);
            isLoading = false;
        }
        return success;
    }

    async function saveVault(both = true) {
        if (isLoading) return;
        const jsonStr = JSON.stringify(items);
        const encrypted = await encrypt(jsonStr, getEncryptionKey());

        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        try {
            if (both) {
                await api.saveVault(JSON.stringify(payload));
                lastSavedDate = payload.date;
                isDirty = false;
                offlineMode = false;
            }

            encryptedVaultData = payload.data;
            localStorage.setItem("offline_vault", JSON.stringify(payload));
        } catch (e) {
            alert("Failed to save vault to server. Please check connection.");
        }
    }

    async function synchronizeVault() {
        if (isDirty) {
            if (
                !confirm(
                    "You have unsaved changes. Synchronizing will discard them. Continue?",
                )
            ) {
                return;
            }
        }

        isSyncing = true;
        try {
            if (await loadVault()) {
                alert("Vault synchronized successfully!");
            }
        } catch (e) {
            alert("Failed to synchronize vault. Please try again.");
            console.error("Sync error:", e);
        } finally {
            isSyncing = false;
        }
    }

    // History Functions
    async function openHistory() {
        try {
            historyFiles = await api.getVaultHistory();
            showHistoryModal = true;
        } catch (e) {
            alert("Failed to load history.");
        }
    }

    async function deleteHistoryItem(filename: string) {
        if (!confirm(`Delete version ${filename}?`)) return;
        try {
            await api.deleteVault(filename);
            historyFiles = await api.getVaultHistory();
        } catch (e) {
            alert("Failed to delete item.");
        }
    }

    // CRUD Operations
    async function selectItem(item: PasswordEntry) {
        selectedItem = item;
    }

    function startCreate(initialData?: Partial<PasswordEntry>) {
        editingItem = {
            id: crypto.randomUUID(),
            title: "",
            username: "",
            password: "",
            site: "",
            tags: [],
            notes: "",
            ...initialData,
        };
        isCreating = true;
    }

    function startEdit(item: PasswordEntry) {
        editingItem = JSON.parse(JSON.stringify(item));
        isCreating = false;
        selectedItem = null;
    }

    async function handleSave(updatedItem: PasswordEntry) {
        let newItems;
        if (isCreating) {
            newItems = [...items, updatedItem];
        } else {
            const index = items.findIndex((i) => i.id === updatedItem.id);
            if (index !== -1) {
                newItems = [...items];
                newItems[index] = updatedItem;
            } else {
                newItems = [...items, updatedItem];
            }
        }
        items = sortPasswordEntries(newItems);
        isCreating = false;
        editingItem = null;
        isDirty = true;
    }

    async function handleDelete(item: PasswordEntry) {
        if (confirm("Delete " + item.title + "?")) {
            items = items.filter((i) => i.id !== item.id);
            selectedItem = null;
            isDirty = true;
        }
    }

    function closeModals() {
        selectedItem = null;
        editingItem = null;
        showHistoryModal = false;
    }

    async function copyToClipboard(text: string) {
        await navigator.clipboard.writeText(text);
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        clipboardTimeout = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText("");
            } catch {
                // Mask that exception:
                // Uncaught (in promise) DOMException: Clipboard write was blocked due to lack of user activation.
            }
            clipboardTimeout = null;
        }, (window as any).__TESTING__
            ? 1000 // Short for tests, but long enough for reliability
            : settings.current.clipboardTimeout);
    }

    // Cleanup function
    function cleanup() {
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
    }

    // Import
    function importItems(newItems: PasswordEntry[]) {
        try {
            const normalized = normalizeVaultItems(newItems);
            // Append? or Replace? For now, let's assume valid JSON vault file replaces (or merges if we wanted, but replace is safer for "Import Vault" usually, or maybe merge?)
            // The requirement says "submit an initial unciphered vault".
            // Let's TREAT it as "loading" a new vault state.
            // But maybe we should merge if checking for duplicates?
            // "respecting the structure of a vault" implies it's a full vault export.
            // We will replace current items with imported ones, but we might want to keep existing ones if meaningful?
            // If it is "initial", maybe we replace.
            // Let's simpler: Add them to current items. Users can delete if they want.
            // Actually, if I import a vault, I probably want to ADD to my existing passwords.

            // Let's implement MERGE logic: add unique by ID, or if ID collision, overwrite?
            // Safer: Just add them. If IDs collide, `normalizeVaultItems` might need care? 
            // `normalizeVaultItems` generates IDs if missing.
            // If we import an existing vault, it has IDs.
            // If IDs exist in current vault, we update?

            // Let's concat and sort.

            // However, to avoid ID conflicts if user imports same file twice, we should check IDs.
            const currentIds = new Set(items.map(i => i.id));
            const distinctNew = normalized.filter(i => !currentIds.has(i.id));

            // If we really want to support 'submit an initial unciphered vault', user probably has empty vault or wants to populate it.
            // Let's just append for now and sort.

            items = sortPasswordEntries([...items, ...distinctNew]);
            isDirty = true;
            return true;
        } catch (e) {
            console.error("Import error", e);
            return false;
        }
    }

    // Public API
    return {
        // State getters
        get items() {
            return items;
        },
        get selectedItem() {
            return selectedItem;
        },
        get editingItem() {
            return editingItem;
        },
        get isCreating() {
            return isCreating;
        },
        get isDirty() {
            return isDirty;
        },
        get lastSavedDate() {
            return lastSavedDate;
        },
        get offlineMode() {
            return offlineMode;
        },
        get isLoading() {
            return isLoading;
        },
        get isSyncing() {
            return isSyncing;
        },
        get encryptedVaultData() {
            return encryptedVaultData;
        },
        get newerVersionAvailable() {
            return newerVersionAvailable;
        },
        get showHistoryModal() {
            return showHistoryModal;
        },
        get historyFiles() {
            return historyFiles;
        },

        // Setters (for use by other composables)
        setItems: (newItems: PasswordEntry[]) => {
            items = newItems;
        },
        setOfflineMode: (offline: boolean) => {
            offlineMode = offline;
        },
        setNewerVersionAvailable: (available: boolean) => {
            newerVersionAvailable = available;
        },

        // Methods
        loadVault,
        saveVault,
        synchronizeVault,
        openHistory,
        deleteHistoryItem,
        selectItem,
        startCreate,
        startEdit,
        handleSave,
        handleDelete,
        closeModals,
        copyToClipboard,
        cleanup,
        importItems,
    };
}

export type Vault = ReturnType<typeof useVault>;
