import { decrypt } from "$lib/crypto";
import { sortPasswordEntries } from "$lib/vault";
import type { PasswordEntry, CipheredVaultData } from "$lib/types";
import { browser } from "$app/environment";

export function useVaultSecurity(
    vault: {
        items: PasswordEntry[];
        setItems: (items: PasswordEntry[]) => void;
        encryptedVaultData: CipheredVaultData | null;
    },
    encryptionKey: CryptoKey,
    additionalClearCallback?: () => void,
) {
    let isMemoryCleared = $state(false);
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let restorePromise: Promise<void> | null = null;

    function resetTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        if (isMemoryCleared) {
            if (!restorePromise) {
                restorePromise = restoreSensitiveData().finally(() => {
                    restorePromise = null;
                });
            }
        }

        inactivityTimer = setTimeout(() => {
            clearSensitiveData();
        }, 60000); // 1 minute
    }

    function clearSensitiveData() {
        const titlesOnly = vault.items.map((item) => ({
            id: item.id,
            title: item.title,
        }));
        vault.setItems(titlesOnly as PasswordEntry[]);
        
        if (additionalClearCallback) {
            additionalClearCallback();
        }
        
        isMemoryCleared = true;
    }

    async function restoreSensitiveData() {
        if (!isMemoryCleared) return;
        if (!vault.encryptedVaultData || !encryptionKey) {
            alert("No encrypted vault data or encryption key");
            return;
        }
        try {
            const jsonStr = await decrypt(
                vault.encryptedVaultData.cipher,
                vault.encryptedVaultData.iv,
                encryptionKey,
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

        const events = [
            "mousemove",
            "keydown",
            "click",
            "scroll",
            "touchstart",
        ];
        events.forEach((event) =>
            window.addEventListener(event, resetTimer),
        );

        resetTimer(); // Start initial timer

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
        resetTimer,
        restoreSensitiveData,
    };
}
