import { sortPasswordEntries, sanitizeItems, overwriteSensitiveString } from "$lib/vault";
import type { PasswordEntry } from "$lib/types";
import { i18n } from "./useI18n.svelte";
import { settings } from "./useSettings.svelte";
import type { EncryptionKey } from "$lib/vaultkey";

import { VaultState } from "./vault/state.svelte";
import { createVaultCrypto } from "./vault/crypto";
import { createVaultCore } from "./vault/core";
import { createVaultCrud } from "./vault/crud";
import { createVaultHistory } from "./vault/history";
import { createVaultActivity } from "./vault/activity.svelte";
import {
    createEasyUnlockChallenge,
    validateEasyUnlockAnswer,
} from "$lib/vault/easyUnlock";

export function useVault(encryptionKey: EncryptionKey, onLock: () => void) {
    const state = new VaultState(encryptionKey, onLock);
    const crypto = createVaultCrypto(state);
    const core = createVaultCore(state, crypto);
    const crud = createVaultCrud(state, crypto);
    const history = createVaultHistory(state);
    const activity = createVaultActivity(state, crypto);
    let rememberedMasterPassword: string | null = null;
    let easyUnlockTimer: ReturnType<typeof setTimeout> | null = null;

    function clearEasyUnlockState() {
        if (easyUnlockTimer) {
            clearTimeout(easyUnlockTimer);
            easyUnlockTimer = null;
        }
        if (rememberedMasterPassword) {
            rememberedMasterPassword = overwriteSensitiveString(rememberedMasterPassword);
        }
        if (state.easyUnlockChallenge) {
            state.easyUnlockChallenge.answer = overwriteSensitiveString(state.easyUnlockChallenge.answer);
        }
        rememberedMasterPassword = null;
        state.easyUnlockChallenge = null;
    }

    function refreshEasyUnlockTimer() {
        if (!rememberedMasterPassword || !state.easyUnlockChallenge) return;
        if (easyUnlockTimer) clearTimeout(easyUnlockTimer);
        easyUnlockTimer = setTimeout(() => {
            clearEasyUnlockState();
        }, settings.current.quickUnlockTimeout);
    }

    function rememberMasterPassword(masterPassword: string) {
        clearEasyUnlockState();

        const challenge = createEasyUnlockChallenge(masterPassword);
        if (!challenge) {
            return;
        }

        rememberedMasterPassword = masterPassword;
        state.easyUnlockChallenge = challenge;
        easyUnlockTimer = setTimeout(() => {
            clearEasyUnlockState();
        }, settings.current.quickUnlockTimeout);
    }

    async function getUsernameSuggestions(currentId?: string) {
        const entries = await crypto.getDecryptedItems();
        const counts = new Map<string, number>();
        for (const entry of entries) {
            if (entry.id === currentId || !entry.username) continue;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.username)) continue;
            counts.set(entry.username, (counts.get(entry.username) || 0) + 1);
        }
        return [...counts.entries()]
            .filter(([, count]) => count >= settings.current.minEmailCount)
            .map(([email]) => email)
            .sort((a, b) => a.localeCompare(b));
    }

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
        get easyUnlockChallenge() {
            return state.easyUnlockChallenge;
        },
        get clipboardRemainingTime() {
            return state.clipboardRemainingTime;
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
        rememberMasterPassword,
        clearEasyUnlockState,
        refreshEasyUnlockTimer,
        getRememberedMasterPassword() {
            return rememberedMasterPassword;
        },
        validateEasyUnlockAnswer(answer: string) {
            if (!state.easyUnlockChallenge) return false;
            return validateEasyUnlockAnswer(state.easyUnlockChallenge, answer, rememberedMasterPassword ?? undefined);
        },
        lockNow() {
            activity.lockNow();
        },
        resetInactivityTimer: activity.resetInactivityTimer,

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
        exportItems: crypto.getDecryptedItems,
        getUsernameSuggestions,
        cleanup() {
            clearEasyUnlockState();
            activity.cleanup();
        },
        importItems: core.importItems,
    };
}

export type Vault = ReturnType<typeof useVault>;
