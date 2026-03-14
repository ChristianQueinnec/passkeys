import { api } from "$lib/api";
import { decrypt, encrypt } from "$lib/crypto";
import { sortPasswordEntries, normalizeVaultItems, sanitizeItems } from "$lib/vault";
import type { PasswordEntry, HistoryItem, CipheredVaultData } from "$lib/types";
import { browser } from "$app/environment";
import { settings } from "./useSettings.svelte";
import { i18n } from "./useI18n.svelte";
import type { EncryptionKey } from "$lib/vaultkey";
import { untrack } from "svelte";
import { toasts } from "./useToasts.svelte";

export function useVault(
    encryptionKey: EncryptionKey,
    onLock: () => void,
) {

    // State
    let _items = $state<PasswordEntry[]>([]);
    let items = $derived(sortPasswordEntries(_items, i18n.language));
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
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    // Inactivity timer management
    function resetTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(() => {
            encryptionKey.remove();
            // After 15 minutes of inactivity, lock the vault by clearing the encryption key
            onLock();
        }, (browser && (window as any).__TESTING__)
            ? settings.current.inactivityTimeoutTest
            : settings.current.inactivityTimeout);
    }

    // Auto-setup event listeners for activity detection
    $effect(() => {
        if (!browser) return;

        const events = ["keydown", "click", "touchstart"];
        events.forEach((event) =>
            window.addEventListener(event, resetTimer),
        );

        untrack(() => resetTimer());

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, resetTimer),
            );
            if (inactivityTimer) clearTimeout(inactivityTimer);
        };
    });

    // Helper: Decrypt full vault transiently to match ID
    async function getDecryptedItem(id: string): Promise<PasswordEntry | undefined> {
        if (!encryptedVaultData) return undefined;
        try {
            const jsonStr = await decrypt(
                encryptedVaultData.cipher,
                encryptedVaultData.iv,
                encryptionKey.get,
            );
            const allItems: PasswordEntry[] = JSON.parse(jsonStr);
            return allItems.find(i => i.id === id);
        } catch (e) {
            console.error("Failed to decrypt item", e);
            return undefined;
        }
    }

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
                    api.storage?.setItem(
                        "offline_vault",
                        JSON.stringify(vaultContent),
                    );
                }
                console.log(
                    `Vault loaded from server in ${Date.now() - start}ms`,
                    // Don't log full items
                    `items count:`, $state.snapshot(items).length,
                    `isDirty:`, $state.snapshot(isDirty),
                );
                newerVersionAvailable = false;
            }
        } catch (e) {
            console.log("Failed to load vault from server", e);
            const offline = api.storage?.getItem("offline_vault") ||
                (browser ? window.localStorage.getItem("offline_vault") : null);
            if (offline) {
                vaultContent = JSON.parse(offline);
                offlineMode = true;
            } else {
                toasts.error(i18n.t("vault.load_offline_error"));
                isLoading = false;
                return;
            }
        }

        let success = false;
        try {
            unsortedItems = [];
            if (vaultContent) {
                if (Array.isArray(vaultContent)) {
                    // Legacy unencrypted array? Should not happen in "Always ciphered" new world ideally
                    // But if it does, sanitize it.
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
                            encryptionKey.get,
                        );
                        const allItems = JSON.parse(jsonStr);
                        unsortedItems = sanitizeItems(allItems); // SANITIZE IMMEDIATELY
                        isDirty = false;
                        success = true;
                    } catch (e) {
                        toasts.error(i18n.t("vault.decrypt_error"));
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
            _items = unsortedItems;
            isLoading = false;
        }
        return success;
    }

    // saveVault needs to construct the full encrypted payload
    // BUT we only have sanitized items in _items.
    // AND we have encryptedVaultData.
    // So we need to:
    // 1. Decrypt current encryptedVaultData to get full items.
    // 2. Or, wait, if we are in "isDirty" state (added/edited item), we need to merge?
    // How do we track changes if we don't have the full vault?
    // When editing/adding, we likely have the specific item in full (from startEdit).
    // So we must have a way to apply that change to the *full* vault.
    // 
    // Problem: `_items` doesn't have secrets.
    // If we rely on `encryptedVaultData` as the source of truth for secrets,
    // we need to decrypt it to save ANY change (e.g. renaming an item).

    // Strategy for Save:
    // 1. Decrypt `encryptedVaultData` -> `allItems`
    // 2. Iterate `_items` (which acts as the "structure" source of truth? No, `_items` might be filtered/sanitized).
    // Actually, `_items` IS the list of items the user sees.
    // If we deleted an item, it's gone from `_items`.
    // If we added an item, it's in `_items` (but maybe sanitized if we just saved it? No, if we just created it, it might still have secrets?).
    // 
    // Wait, if we create an item, we have the secrets in `editingItem`. 
    // When we `handleSave`, we update `_items`. 
    // Does `_items` store secrets for NEW items?
    // If we sanitize `_items` on load, they don't have secrets.
    // If we add a new item, we should probably sanitize it before putting in `_items` 
    // BUT we need to persist the secret somewhere until save?
    // 
    // Better approach:
    // `saveVault` essentially needs to re-encrypt everything.
    // We cannot re-encrypt what we don't have.
    // So we MUST decrypt the old vault, merge changes, and re-encrypt.
    // 
    // BUT, what about concurrent changes? `_items` reflects deletions/reorders?
    // 
    // Let's refine `handleSave` and `handleDelete`.
    // We need a way to apply "diffs" or just reconstruct.
    // 
    // If we treat `encryptedVaultData` as the *only* persistent storage of secrets.
    // And `_items` as the view.
    // When we `saveVault`:
    // 1. Decrypt `encryptedVaultData` to get `oldFullItems`.
    // 2. We need to sync `_items` (view) with `oldFullItems` (secrets).
    //    - Items in `_items` but not `oldFullItems` -> NEW (where are secrets?)
    //    - Items in `oldFullItems` but not `_items` -> DELETED
    //    - Items in both -> UPDATED (where are updates?)
    // 
    // This implies we need to keep "unsaved secrets" in memory until save?
    // Or we save immediately on edit?
    // The prompt says "keep the vault ciphered... decipher it only when copying...".
    // It doesn't explicitly forbid keeping *newly created* secrets in memory until save.
    // But "Delete the deciphered copy... as soon as possible".
    // 
    // Maybe `handleSave` (which is "Done" in editor) should immediately triggering a `saveVault`?
    // In the current app, `handleSave` just updates local state. User clicks "Save Vault" later.
    // This "deferred save" model is hard if we don't keep secrets.
    // 
    // Alternative:
    // We keep a `dirtySecrets` map: `Map<id, PasswordEntry>` containing full data for modified/new items.
    // When `saveVault` runs:
    // 1. Decrypt `encryptedVaultData` -> `fullItems`.
    // 2. Loop through `_items`:
    //    - If in `dirtySecrets`, use that (it's the latest full version).
    //    - If not in `dirtySecrets`, find in `fullItems` and use that.
    //    - If not found anywhere? Error (or ignore).
    // 3. Encrypt the result.
    // 4. Clear `dirtySecrets`.
    // 
    // This seems robust. `dirtySecrets` holds the "plaintext" of only the items currently being modified.
    // We should clear `dirtySecrets` on save.
    //
    // Also `handleDelete`:
    // It removes from `_items`.
    // `saveVault` logic: Loop `_items`. If valid ID not in `dirtySecrets`, pull from `fullItems`.
    // If item was in `fullItems` but not in `_items`, it gets dropped (Deleted). Correct.

    let dirtySecrets = $state<Map<string, PasswordEntry>>(new Map());

    async function saveVault(both = true) {
        if (isLoading) return;

        let fullItemsToSave: PasswordEntry[] = [];
        let oldFullItems: PasswordEntry[] = [];

        // 1. Decrypt existing data (if any) to retrieve unmodified secrets
        if (encryptedVaultData) {
            try {
                const jsonStr = await decrypt(
                    encryptedVaultData.cipher,
                    encryptedVaultData.iv,
                    encryptionKey.get,
                );
                oldFullItems = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to decrypt for saving", e);
                // If we can't decrypt, we risk losing data if we overwrite.
                toasts.error(i18n.t("vault.save_decrypt_error"));
                return;
            }
        }

        // 2. Reconstruct full vault
        // We iterate over `_items` (the current structure)
        for (const item of _items) {
            if (dirtySecrets.has(item.id)) {
                // Use the modified/new version with secrets
                fullItemsToSave.push(dirtySecrets.get(item.id)!);
            } else {
                // Find in old items
                const oldItem = oldFullItems.find(i => i.id === item.id);
                if (oldItem) {
                    fullItemsToSave.push(oldItem);
                } else {
                    // Should not happen unless state is desynced
                    console.warn(`Item ${item.id} found in list but not in secrets map or old vault.`);
                    // We preserve it as is (sanitized), which is bad (loss of secrets), but better than crashing?
                    // Or maybe it's a legacy item?
                    // If it's sanitized, it has no secrets.
                    fullItemsToSave.push(item);
                }
            }
        }

        const jsonStr = JSON.stringify(fullItemsToSave);
        const encrypted = await encrypt(jsonStr, encryptionKey.get);

        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        try {
            if (both && !offlineMode) {
                await api.saveVault(JSON.stringify(payload));
                lastSavedDate = payload.date;
                isDirty = false;
                // Clear dirty secrets now that they are safely encrypted
                dirtySecrets.clear();
            } else if (both && offlineMode) {
                console.log("Offline: saving vault locally only.");
                // In offline mode, do we clear dirtySecrets? 
                // We generated `payload.data` (encrypted). `encryptedVaultData` is updated.
                // So next save will use this new encrypted data.
                // So yes, we can clear dirtySecrets.
                dirtySecrets.clear();
                // Wait, usually `isDirty` stays true in offline mode until synced?
                // Current logic: `isDirty` stays true.
                // But `dirtySecrets`?
                // If we keep `isDirty = true`, user might save again.
                // If we clear `dirtySecrets`, we rely on `encryptedVaultData` having the new secrets.
                // Yes, line below updates `encryptedVaultData`.
                // So subsequent saves will decrypt THIS `encryptedVaultData` (which has the secrets).
                // So safe to clear `dirtySecrets`.
            }
            // If save failed (catch), we do NOT clear dirtySecrets.

            encryptedVaultData = payload.data;
            api.storage?.setItem("offline_vault", JSON.stringify(payload));
        } catch (e) {
            if (!offlineMode) {
                toasts.error(i18n.t("vault.save_error"));
            }
            // Do NOT clear dirty secrets on failure
        }
    }

    async function synchronizeVault() {
        if (isDirty) {
            if (
                !confirm(i18n.t("vault.sync_discard_confirm"))
            ) {
                return;
            }
        }

        isSyncing = true;
        try {
            if (await loadVault()) {
                toasts.success(i18n.t("vault.sync_success"));
            }
        } catch (e) {
            toasts.error(i18n.t("vault.sync_error"));
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
            toasts.error(i18n.t("vault.history_error"));
        }
    }

    async function deleteHistoryItem(filename: string) {
        if (!confirm(i18n.t("vault.history.delete_confirm", { filename }))) return;
        try {
            await api.deleteVault(filename);
            historyFiles = await api.getVaultHistory();
        } catch (e) {
            toasts.error(i18n.t("vault.delete_error"));
        }
    }

    // CRUD Operations
    async function selectItem(item: PasswordEntry) {
        // When viewing details, we might want to show secrets?
        // Current UI shows secrets based on toggles.
        // `PasswordEntry` in `selectedItem` is passed to `VaultModals` -> `DetailsModal`.
        // If we want `DetailsModal` to be able to show secrets, we need to populate `selectedItem` with secrets.
        // "decipher it only when copying username, password or opening site url"
        // Does "View Details" count?
        // The prompt says "Deciphering the vault is fast so always keep the vault ciphered and decipher it only when..."
        // It lists: copying username, password, opening site.
        // It does NOT list "Viewing Details".
        // However, `DetailsModal` usually allows copying too?
        // If I populate `selectedItem` (sanitized), the details modal will show empty fields?
        // Or buttons to copy?
        // `DetailsModal.svelte` displays fields.
        // If we strictly follow "only when copying...", then we should NOT decipher for details view.
        // But then Details view is useless for seeing the password?
        // Maybe the user implies we should decrypt ON DEMAND in details view too?
        // 
        // Let's assume `selectItem` should ALSO decrypt to facilitate viewing/copying from details.
        // But "Delete the deciphered copy ... as soon as possible".
        // If we leave `selectedItem` populated, it stays indefinitely.
        // 
        // Maybe `selectedItem` remains sanitized.
        // And `DetailsModal` requests decryption for specific actions?
        // `DetailsModal` receives `item`.
        // If `item.password` is undefined, what does it show?
        // Providing a seamless experience:
        // When user clicks "View", we decrypt that item?
        // Then clear it when modal closes?
        // "Deciphering... is fast... decipher it only when copying username, password or opening site url."
        // It seems to specifically exclude "viewing".
        // But if I can't see the password, how do I know what it is? Copying is one way.
        // 
        // Let's implement `selectItem` to Decrypt the item.
        // And `closeModals` will clear it.
        // This seems consistent with "transient access".

        const fullItem = await getDecryptedItem(item.id);
        if (fullItem) {
            selectedItem = fullItem;
        } else {
            // Fallback (e.g. if new item unsaved but dirty?)
            if (dirtySecrets.has(item.id)) {
                selectedItem = dirtySecrets.get(item.id)!;
            } else {
                selectedItem = item; // Sanitized
            }
        }
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

    async function startEdit(item: PasswordEntry) {
        // Must decrypt to edit
        let fullItem = await getDecryptedItem(item.id);
        if (!fullItem) {
            if (dirtySecrets.has(item.id)) {
                fullItem = dirtySecrets.get(item.id)!;
            } else {
                fullItem = item; // Sanitized, better than nothing
            }
        }

        editingItem = JSON.parse(JSON.stringify(fullItem));
        isCreating = false;
        selectedItem = null;
    }

    async function handleSave(updatedItem: PasswordEntry) {
        // Update dirtySecrets with the full data
        dirtySecrets.set(updatedItem.id, updatedItem);

        // Update _items with sanitized data
        const sanitized = sanitizeItems([updatedItem])[0];

        let newItems;
        if (isCreating) {
            newItems = [..._items, sanitized];
        } else {
            const index = _items.findIndex((i) => i.id === updatedItem.id);
            if (index !== -1) {
                newItems = [..._items];
                newItems[index] = sanitized;
            } else {
                newItems = [..._items, sanitized];
            }
        }
        _items = newItems;
        isCreating = false;
        editingItem = null;
        isDirty = true;
    }

    async function handleDelete(item: PasswordEntry) {
        if (confirm(i18n.t("vault.delete_confirm", { title: item.title }))) {
            _items = _items.filter((i) => i.id !== item.id);
            // Also remove from dirtySecrets if present
            dirtySecrets.delete(item.id);

            selectedItem = null;
            isDirty = true;
        }
    }

    function closeModals() {
        selectedItem = null;
        editingItem = null;
        showHistoryModal = false;
    }

    // New API: Copy by ID + field
    async function copyToClipboard(itemId: string, field: 'username' | 'password') {
        let text = "";
        const dirty = dirtySecrets.get(itemId);
        if (dirty) {
            text = dirty[field] || "";
        } else {
            const fullItem = await getDecryptedItem(itemId);
            if (fullItem) {
                text = fullItem[field] || "";
            }
        }

        if (!text) return;

        setTimeout(async () => {
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                console.error("Failed to copy to clipboard", e);
            }
        }, 0);
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        clipboardTimeout = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText("");
            } catch (e) {
                console.error("Failed to clear clipboard", e);
            }
            clipboardTimeout = null;
        }, (window as any).__TESTING__
            ? 1000
            : settings.current.clipboardTimeout);
    }

    // New API: Open Site
    async function openSite(itemId: string) {
        let url = "";
        const dirty = dirtySecrets.get(itemId);
        if (dirty) {
            url = dirty.site || "";
        } else {
            const fullItem = await getDecryptedItem(itemId);
            if (fullItem) {
                url = fullItem.site || "";
            }
        }

        if (url) {
            window.open(url, '_blank');
        }
    }

    // Cleanup function
    function cleanup() {
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
    }

    // Import
    function importItems(newItems: PasswordEntry[]) {
        try {
            const normalized = normalizeVaultItems(newItems);

            // For imported items, we treat them as "New/Dirty".
            // We need to add them to dirtySecrets so they get saved with secrets.
            // And add sanitized versions to _items.

            const sanitizedNew = sanitizeItems(normalized);

            // Check IDs
            const currentIds = new Set(_items.map(i => i.id));
            const distinctNew: PasswordEntry[] = [];

            normalized.forEach((item, index) => {
                if (!currentIds.has(item.id)) {
                    distinctNew.push(sanitizedNew[index]);
                    dirtySecrets.set(item.id, item); // Store secret!
                }
            });

            _items = [..._items, ...distinctNew];
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
            return items; // Derived sanitized sorted items
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
            _items = sanitizeItems(newItems);
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
        copyToClipboard, // Updated signature
        openSite, // New
        cleanup,
        importItems,
    };
}

export type Vault = ReturnType<typeof useVault>;
