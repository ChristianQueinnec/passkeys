import { browser } from "$app/environment";
import { settings } from "../useSettings.svelte";
import { untrack } from "svelte";
import type { VaultState } from "./state.svelte";
import type { VaultCrypto } from "./crypto";

export function createVaultActivity(state: VaultState, crypto: VaultCrypto) {
    let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    function resetTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(() => {
            state.encryptionKey.remove();
            state.onLock();
        }, (browser && (window as any).__TESTING__)
            ? settings.current.inactivityTimeoutTest
            : settings.current.inactivityTimeout);
    }

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

    async function copyToClipboard(itemId: string, field: 'username' | 'password') {
        let text = "";
        const dirty = state.dirtySecrets.get(itemId);
        if (dirty) {
            text = dirty[field] || "";
        } else {
            const fullItem = await crypto.getDecryptedItem(itemId);
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

    async function openSite(itemId: string) {
        let url = "";
        const dirty = state.dirtySecrets.get(itemId);
        if (dirty) {
            url = dirty.site || "";
        } else {
            const fullItem = await crypto.getDecryptedItem(itemId);
            if (fullItem) {
                url = fullItem.site || "";
            }
        }

        if (url) {
            window.open(url, '_blank');
        }
    }

    function cleanup() {
        if (clipboardTimeout) {
            clearTimeout(clipboardTimeout);
        }
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
    }

    return { copyToClipboard, openSite, cleanup };
}
