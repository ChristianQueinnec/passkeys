import { untrack } from "svelte";
import { decrypt } from "$lib/crypto";
import { sortPasswordEntries } from "$lib/vault";
import type { PasswordEntry, CipheredVaultData } from "$lib/types";
import { browser } from "$app/environment";
import { settings } from "./useSettings.svelte";

import { type Vault } from "./useVault.svelte";

export function useVaultSecurity(
    vault: Vault,
    getEncryptionKey: () => CryptoKey,
    additionalClearCallback?: () => void,
) {

    let isMemoryCleared = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let restorePromise: Promise<void> | null = null;

    function resetTimer() {
        if (isMemoryCleared) {
            restoreSensitiveData();
        }
        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(async () => {
            await clearSensitiveData();
        }, settings.current.inactivityTimeout);
    }

    async function clearSensitiveData() {
        if (vault.isDirty) {
            // Save only in localstore
            await vault.saveVault(false);
        }

        const titlesOnly = vault.items.map((item) => ({
            id: item.id,
            title: item.title,
            group: item.group,
        }));
        vault.setItems(titlesOnly as PasswordEntry[]);

        if (additionalClearCallback) {
            additionalClearCallback();
        }

        isMemoryCleared = true;
    }

    async function restoreSensitiveData() {
        if (!isMemoryCleared) return;
        const key = getEncryptionKey();
        if (!vault.encryptedVaultData || !key) {
            alert("No encrypted vault data or encryption key");
            return;
        }
        try {
            const jsonStr = await decrypt(
                vault.encryptedVaultData.cipher,
                vault.encryptedVaultData.iv,
                key,
            );
            const unsorted = JSON.parse(jsonStr);
            vault.setItems(sortPasswordEntries(unsorted));
            isMemoryCleared = false;
        } catch (e) {
            console.log("Failed to restore vault from memory", e);
            alert("Failed to restore vault from memory");
        }
    }

    // Auto-setup event listeners
    $effect(() => {
        if (!browser) return;

        // Refresh display for these events. Ignore mousemove and scroll
        const events = [
            "keydown",
            "click",
            "touchstart",
        ];
        events.forEach((event) =>
            window.addEventListener(event, resetTimer),
        );

        untrack(() => resetTimer()); // Start initial timer

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, resetTimer),
            );
            if (inactivityTimer) clearTimeout(inactivityTimer);
        };
    });

    return {
        get isMemoryCleared() {
            return isMemoryCleared;
        },
        //resetTimer,
        restoreSensitiveData,
    };
}
