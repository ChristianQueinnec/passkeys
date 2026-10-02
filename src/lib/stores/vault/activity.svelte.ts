import { browser } from "$app/environment";
import { settings } from "../useSettings.svelte";
import { untrack } from "svelte";
import type { VaultState } from "./state.svelte";
import type { VaultCrypto } from "./crypto";
import { overwriteSensitiveEntry } from "$lib/vault";

export function createVaultActivity(state: VaultState, crypto: VaultCrypto) {
    let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;
    let clipboardInterval: ReturnType<typeof setInterval> | null = null;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

    function lockNow() {
        if (clipboardInterval) {
            clearInterval(clipboardInterval);
            clipboardInterval = null;
        }
        state.clipboardRemainingTime = null;
        // Randomize decrypted entry fields before removing their references.
        const entriesToWipe = new Set([
            state.selectedItem,
            state.editingItem,
            ...state.dirtySecrets.values(),
        ]);
        for (const entry of entriesToWipe) {
            if (entry) overwriteSensitiveEntry(entry);
        }
        state.selectedItem = null;
        state.editingItem = null;
        state.dirtySecrets.clear();
        state.encryptionKey.remove();
        state.onLock();
    }

    function resetTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(() => {
            lockNow();
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
            if (clipboardInterval) clearInterval(clipboardInterval);
        };
    });

    async function copyTextToClipboard(text: string) {
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
        if (clipboardInterval) {
            clearInterval(clipboardInterval);
        }

        const duration = (window as any).__TESTING__
            ? 1000
            : settings.current.clipboardTimeout;

        state.clipboardRemainingTime = duration;
        const startTime = Date.now();

        clipboardInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            state.clipboardRemainingTime = Math.max(0, duration - elapsed);
            if (state.clipboardRemainingTime === 0) {
                if (clipboardInterval) {
                    clearInterval(clipboardInterval);
                    clipboardInterval = null;
                }
            }
        }, 100);

        clipboardTimeout = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText("");
            } catch (e) {
                console.error("Failed to clear clipboard", e);
            }
            clipboardTimeout = null;
            state.clipboardRemainingTime = null;
            if (clipboardInterval) {
                clearInterval(clipboardInterval);
                clipboardInterval = null;
            }
        }, duration);
    }

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

        await copyTextToClipboard(text);
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

    return { copyToClipboard, copyTextToClipboard, openSite, cleanup, lockNow, resetInactivityTimer: resetTimer };
}
