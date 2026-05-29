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
        try {
            const metadata = await api.getLatestVaultMetadata();
            console.log("Polling success, server mtime:", metadata.mtime, "local lastSavedDate:", $state.snapshot(vault.lastSavedDate));
            vault.setOfflineMode(false);
            if (metadata.mtime && vault.lastSavedDate) {
                const serverTime = new Date(metadata.mtime).getTime();
                const localTime = new Date(vault.lastSavedDate).getTime();
                console.log("Comparing times:", serverTime, localTime, "serverTime > localTime:", serverTime > localTime);
                if (serverTime > localTime + 1000) {
                    console.log("Newer version available!");
                    vault.setNewerVersionAvailable(true);
                }
            }
        } catch (e) {
            console.log("Polling failed (server unreachable?)", e);
            vault.setOfflineMode(true);
        }
    }

    // Auto-start polling and handle offline events
    $effect(() => {
        const handleOffline = () => vault.setOfflineMode(true);
        const handleOnline = () => {
            vault.setOfflineMode(false);
            pollForUpdates(); // Trigger immediate update when back online
        };

        if (browser) {
            window.addEventListener('offline', handleOffline);
            window.addEventListener('online', handleOnline);
            // Initial check
            if (!navigator.onLine) handleOffline();
        }

        if (isActiveGetter()) {
            startPolling();
        } else {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
        }

        return () => {
            if (pollTimer) clearInterval(pollTimer);
            if (browser) {
                window.removeEventListener('offline', handleOffline);
                window.removeEventListener('online', handleOnline);
            }
        };
    });

    return {
        startPolling,
        pollForUpdates,
    };
}
