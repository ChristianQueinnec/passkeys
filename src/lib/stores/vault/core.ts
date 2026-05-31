import { api } from "$lib/api";
import { encrypt, decrypt } from "$lib/crypto";
import { normalizeVaultItems, sanitizeItems } from "$lib/vault";
import { i18n } from "../useI18n.svelte";
import { toasts } from "../useToasts.svelte";
import { browser } from "$app/environment";
import type { PasswordEntry } from "$lib/types";
import type { VaultState } from "./state.svelte";
import type { VaultCrypto } from "./crypto";

export function createVaultCore(state: VaultState, crypto: VaultCrypto) {
    async function loadVault() {
        state.isLoading = true;
        let unsortedItems: PasswordEntry[] = [];
        let vaultContent = null;
        try {
            const start = Date.now();
            vaultContent = await api.getLatestVault();
            if (vaultContent) {
                state.offlineMode = false;
                if (!Array.isArray(vaultContent)) {
                    try {
                        api.storage?.setItem(
                            "offline_vault",
                            JSON.stringify(vaultContent),
                        );
                    } catch (e) {
                        console.warn("Failed to save vault to offline storage", e);
                    }
                }
                console.log(
                    `Vault loaded from server in ${Date.now() - start}ms`,
                    `items count:`, state._items.length,
                    `isDirty:`, state.isDirty,
                );
                state.newerVersionAvailable = false;
            }
        } catch (e) {
            console.log("Failed to load vault from server", e);
            const offline = api.storage?.getItem("offline_vault") ||
                (browser ? window.localStorage.getItem("offline_vault") : null);
            if (offline) {
                try {
                    vaultContent = JSON.parse(offline);
                    state.offlineMode = true;
                } catch (e) {
                    console.error("Failed to parse offline vault", e);
                    toasts.error(i18n.t("vault.load_offline_error"));
                    state.isLoading = false;
                    return;
                }
            } else {
                toasts.error(i18n.t("vault.load_offline_error"));
                state.isLoading = false;
                return;
            }
        }

        let success = false;
        try {
            unsortedItems = [];
            if (vaultContent) {
                if (Array.isArray(vaultContent)) {
                    unsortedItems = normalizeVaultItems(vaultContent);
                    state.isDirty = true;
                    success = true;
                } else {
                    try {
                        const parsed = vaultContent;

                        let encryptedData;
                        if (parsed.date && parsed.data) {
                            state.lastSavedDate = parsed.date;
                            encryptedData = parsed.data;
                        } else {
                            encryptedData = parsed;
                        }

                        state.encryptedVaultData = encryptedData;

                        const jsonStr = await decrypt(
                            encryptedData.cipher,
                            encryptedData.iv,
                            state.encryptionKey.get,
                        );
                        const allItems = JSON.parse(jsonStr);
                        unsortedItems = sanitizeItems(allItems);
                        state.isDirty = false;
                        success = true;
                    } catch (e) {
                        toasts.error(i18n.t("vault.decrypt_error"));
                        success = false;
                    }
                }
            } else {
                unsortedItems = [];
                state.isDirty = true;
                success = true;
            }
        } finally {
            state._items = unsortedItems;
            state.isLoading = false;
        }
        return success;
    }

    async function saveVault(both = true) {
        if (state.isLoading) return;

        let fullItemsToSave: PasswordEntry[] = [];
        let oldFullItems: PasswordEntry[] = [];

        if (state.encryptedVaultData) {
            try {
                const jsonStr = await decrypt(
                    state.encryptedVaultData.cipher,
                    state.encryptedVaultData.iv,
                    state.encryptionKey.get,
                );
                oldFullItems = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to decrypt for saving", e);
                toasts.error(i18n.t("vault.save_decrypt_error"));
                return;
            }
        }

        for (const item of state._items) {
            if (state.dirtySecrets.has(item.id)) {
                fullItemsToSave.push(state.dirtySecrets.get(item.id)!);
            } else {
                const oldItem = oldFullItems.find(i => i.id === item.id);
                if (oldItem) {
                    fullItemsToSave.push(oldItem);
                } else {
                    console.warn(`Item ${item.id} found in list but not in secrets map or old vault.`);
                    fullItemsToSave.push(item);
                }
            }
        }

        const jsonStr = JSON.stringify(fullItemsToSave);
        const encrypted = await encrypt(jsonStr, state.encryptionKey.get);

        const payload = {
            date: new Date().toISOString(),
            data: encrypted,
        };

        try {
            if (both && !state.offlineMode) {
                await api.saveVault(JSON.stringify(payload));
                state.lastSavedDate = payload.date;
                state.isDirty = false;
                state.dirtySecrets.clear();
            } else if (both && state.offlineMode) {
                console.log("Offline: saving vault locally only.");
                state.dirtySecrets.clear();
            }

            state.encryptedVaultData = payload.data;
            try {
                api.storage?.setItem("offline_vault", JSON.stringify(payload));
            } catch (e) {
                console.warn("Failed to update offline storage", e);
            }
        } catch (e) {
            if (!state.offlineMode) {
                toasts.error(i18n.t("vault.save_error"));
            }
        }
    }

    async function synchronizeVault() {
        if (state.isDirty) {
            if (!confirm(i18n.t("vault.sync_discard_confirm"))) {
                return;
            }
        }

        state.isSyncing = true;
        try {
            if (await loadVault()) {
                toasts.success(i18n.t("vault.sync_success"));
            }
        } catch (e) {
            toasts.error(i18n.t("vault.sync_error"));
            console.error("Sync error:", e);
        } finally {
            state.isSyncing = false;
        }
    }

    function importItems(newItems: PasswordEntry[]) {
        try {
            const normalized = normalizeVaultItems(newItems);
            const sanitizedNew = sanitizeItems(normalized);

            const currentIds = new Set(state._items.map(i => i.id));
            const distinctNew: PasswordEntry[] = [];

            normalized.forEach((item, index) => {
                if (!currentIds.has(item.id)) {
                    distinctNew.push(sanitizedNew[index]);
                    state.dirtySecrets.set(item.id, item);
                }
            });

            state._items = [...state._items, ...distinctNew];
            state.isDirty = true;
            return true;
        } catch (e) {
            console.error("Import error", e);
            return false;
        }
    }

    return { loadVault, saveVault, synchronizeVault, importItems };
}
