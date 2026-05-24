import { decrypt } from "$lib/crypto";
import type { PasswordEntry } from "$lib/types";
import type { VaultState } from "./state.svelte";

export function createVaultCrypto(state: VaultState) {
    async function getDecryptedItem(id: string): Promise<PasswordEntry | undefined> {
        if (!state.encryptedVaultData) return undefined;
        try {
            const jsonStr = await decrypt(
                state.encryptedVaultData.cipher,
                state.encryptedVaultData.iv,
                state.encryptionKey.get,
            );
            const allItems: PasswordEntry[] = JSON.parse(jsonStr);
            return allItems.find(i => i.id === id);
        } catch (e) {
            console.error("Failed to decrypt item", e);
            return undefined;
        }
    }

    return { getDecryptedItem };
}

export type VaultCrypto = ReturnType<typeof createVaultCrypto>;
