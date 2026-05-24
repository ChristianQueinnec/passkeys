import { sanitizeItems } from "$lib/vault";
import { i18n } from "../useI18n.svelte";
import type { PasswordEntry } from "$lib/types";
import type { VaultState } from "./state.svelte";
import type { VaultCrypto } from "./crypto";

export function createVaultCrud(state: VaultState, crypto: VaultCrypto) {
    async function selectItem(item: PasswordEntry) {
        const fullItem = await crypto.getDecryptedItem(item.id);
        if (fullItem) {
            state.selectedItem = fullItem;
        } else {
            if (state.dirtySecrets.has(item.id)) {
                state.selectedItem = state.dirtySecrets.get(item.id)!;
            } else {
                state.selectedItem = item;
            }
        }
    }

    function startCreate(initialData?: Partial<PasswordEntry>) {
        state.editingItem = {
            id: globalThis.crypto.randomUUID(),
            title: "",
            username: "",
            password: "",
            site: "",
            tags: [],
            notes: "",
            ...initialData,
        };
        state.isCreating = true;
    }

    async function startEdit(item: PasswordEntry) {
        let fullItem = await crypto.getDecryptedItem(item.id);
        if (!fullItem) {
            if (state.dirtySecrets.has(item.id)) {
                fullItem = state.dirtySecrets.get(item.id)!;
            } else {
                fullItem = item;
            }
        }

        state.editingItem = JSON.parse(JSON.stringify(fullItem));
        state.isCreating = false;
        state.selectedItem = null;
    }

    async function handleSave(updatedItem: PasswordEntry) {
        state.dirtySecrets.set(updatedItem.id, updatedItem);

        const sanitized = sanitizeItems([updatedItem])[0];

        let newItems;
        if (state.isCreating) {
            newItems = [...state._items, sanitized];
        } else {
            const index = state._items.findIndex((i) => i.id === updatedItem.id);
            if (index !== -1) {
                newItems = [...state._items];
                newItems[index] = sanitized;
            } else {
                newItems = [...state._items, sanitized];
            }
        }
        state._items = newItems;
        state.isCreating = false;
        state.editingItem = null;
        state.isDirty = true;
    }

    async function handleDelete(item: PasswordEntry) {
        if (confirm(i18n.t("vault.delete_confirm", { title: item.title }))) {
            state._items = state._items.filter((i) => i.id !== item.id);
            state.dirtySecrets.delete(item.id);

            state.selectedItem = null;
            state.isDirty = true;
        }
    }

    function closeModals() {
        state.selectedItem = null;
        state.editingItem = null;
        state.showHistoryModal = false;
    }

    return { selectItem, startCreate, startEdit, handleSave, handleDelete, closeModals };
}
