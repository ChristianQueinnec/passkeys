import { api } from "$lib/api";
import { browser } from "$app/environment";
import { settings } from "./useSettings.svelte";

import { type Vault } from "./useVault.svelte";

export function useVaultSync(
    vault: Vault,
    isActiveGetter: () => boolean,
) {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        const interval = browser && (window as any).__TESTING__
            ? settings.current.pollForUpdatesIntervalTest
            : settings.current.pollForUpdatesInterval;
        pollTimer = setInterval(pollForUpdates, interval);
    }

    async function pollForUpdates() {
        if (!api.token) return;
        try {
            const metadata = await api.getLatestVaultMetadata();
            vault.setOfflineMode(false);
            if (metadata.mtime && vault.lastSavedDate) {
                const serverTime = new Date(metadata.mtime).getTime();
                const localTime = new Date(vault.lastSavedDate).getTime();
                if (serverTime > localTime + 1000) {
                    vault.setNewerVersionAvailable(true);
                }
            }
        } catch (e) {
            console.log("Polling failed (server unreachable?)");
            vault.setOfflineMode(true);
        }
    }

    // Auto-start polling
    $effect(() => {
        if (isActiveGetter()) {
            startPolling();
        } else {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
        }
        return () => {
            if (pollTimer) clearInterval(pollTimer);
        };
    });

    return {
        startPolling,
        pollForUpdates,
    };
}
