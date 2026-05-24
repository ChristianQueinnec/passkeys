import { sortPasswordEntries, sanitizeItems } from "$lib/vault";
import type { PasswordEntry } from "$lib/types";
import { i18n } from "./useI18n.svelte";
import type { EncryptionKey } from "$lib/vaultkey";

import { VaultState } from "./vault/state.svelte";
import { createVaultCrypto } from "./vault/crypto";
import { createVaultCore } from "./vault/core";
import { createVaultCrud } from "./vault/crud";
import { createVaultHistory } from "./vault/history";
import { createVaultActivity } from "./vault/activity.svelte";

export function useVault(encryptionKey: EncryptionKey, onLock: () => void) {
    const state = new VaultState(encryptionKey, onLock);
    const crypto = createVaultCrypto(state);
    const core = createVaultCore(state, crypto);
    const crud = createVaultCrud(state, crypto);
    const history = createVaultHistory(state);
    const activity = createVaultActivity(state, crypto);

    return {
        // State getters
        get items() {
            return sortPasswordEntries(state._items, i18n.language);
        },
        get selectedItem() {
            return state.selectedItem;
        },
        get editingItem() {
            return state.editingItem;
        },
        get isCreating() {
            return state.isCreating;
        },
        get isDirty() {
            return state.isDirty;
        },
        get lastSavedDate() {
            return state.lastSavedDate;
        },
        get offlineMode() {
            return state.offlineMode;
        },
        get isLoading() {
            return state.isLoading;
        },
        get isSyncing() {
            return state.isSyncing;
        },
        get encryptedVaultData() {
            return state.encryptedVaultData;
        },
        get newerVersionAvailable() {
            return state.newerVersionAvailable;
        },
        get showHistoryModal() {
            return state.showHistoryModal;
        },
        get historyFiles() {
            return state.historyFiles;
        },

        // Setters
        setItems: (newItems: PasswordEntry[]) => {
            state._items = sanitizeItems(newItems);
        },
        setOfflineMode: (offline: boolean) => {
            state.offlineMode = offline;
        },
        setNewerVersionAvailable: (available: boolean) => {
            state.newerVersionAvailable = available;
        },

        // Methods
        loadVault: core.loadVault,
        saveVault: core.saveVault,
        synchronizeVault: core.synchronizeVault,
        openHistory: history.openHistory,
        deleteHistoryItem: history.deleteHistoryItem,
        selectItem: crud.selectItem,
        startCreate: crud.startCreate,
        startEdit: crud.startEdit,
        handleSave: crud.handleSave,
        handleDelete: crud.handleDelete,
        closeModals: crud.closeModals,
        copyToClipboard: activity.copyToClipboard,
        openSite: activity.openSite,
        cleanup: activity.cleanup,
        importItems: core.importItems,
    };
}

export type Vault = ReturnType<typeof useVault>;
