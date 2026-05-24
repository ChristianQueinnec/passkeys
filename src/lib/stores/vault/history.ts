import { api } from "$lib/api";
import { i18n } from "../useI18n.svelte";
import { toasts } from "../useToasts.svelte";
import type { VaultState } from "./state.svelte";

export function createVaultHistory(state: VaultState) {
    async function openHistory() {
        try {
            state.historyFiles = await api.getVaultHistory();
            state.showHistoryModal = true;
        } catch (e) {
            toasts.error(i18n.t("vault.history_error"));
        }
    }

    async function deleteHistoryItem(filename: string) {
        if (!confirm(i18n.t("vault.history.delete_confirm", { filename }))) return;
        try {
            await api.deleteVault(filename);
            state.historyFiles = await api.getVaultHistory();
        } catch (e) {
            toasts.error(i18n.t("vault.delete_error"));
        }
    }

    return { openHistory, deleteHistoryItem };
}
