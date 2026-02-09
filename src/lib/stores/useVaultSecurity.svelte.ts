import { untrack } from "svelte";
import type { PasswordEntry } from "$lib/types";
import { browser } from "$app/environment";
import { settings } from "./useSettings.svelte";

export function useVaultSecurity(
    callbacks: { onLock?: () => void },
    isActive?: () => boolean,
) {
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let vault = callbacks; // Alias for minimal refactor of existing code using 'vault'

    function resetTimer() {
        if (isActive && !isActive()) {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            return;
        }

        if (inactivityTimer) clearTimeout(inactivityTimer);

        inactivityTimer = setTimeout(async () => {
            // Trigger a reload/re-auth flow or simply lock the UI
            // In the "always ciphered" model, we don't have "plaintext" data to clear
            // But we might want to ensure the vault is "locked" requiring master password again
            // effectively clearing the stored key from memory (if we were storing it).
            // Since we rely on `getEncryptionKey` callback in `useVault`, we can signal
            // that the session is expired.

            // However, the prompt implies "Deciphering the vault is fast so always keep the vault ciphered"
            // This means `items` in memory should be sanitized.
            // If the user inactivity timeout is reached, we probably just want to
            // ensure the UI reflects a "locked" state or similar.
            // The previous logic cleared the items from memory.
            // But now items ARE cleared by default.

            // Maybe we just want to signal "locked" state to force re-entry of master password
            // for ANY action (decrypt, etc).
            // But the previous `isMemoryCleared` was about hiding the list.
            // Now the list shows titles.

            // Let's assume the inactivity timeout should still "lock" the vault
            // preventing access to even titles? Or just ensuring next access requires key?

            // Re-reading: "Deciphering the vault is fast so always keep the vault ciphered and decipher it only when copying username, password or opening site url."
            // This sounds like the "inactivity" timeout is less about hiding titles and more about
            // maybe clearing the key if we cached it?
            // But `useVault` takes `getEncryptionKey`.

            // The prompt "Delete the deciphered copy of the vault as soon as possible"
            // suggests we never keep the full deciphered vault in state.
            // So `items` state in `useVault` is ALWAYS sanitized.

            // So what does "Security Timeout" mean now?
            // "should clear decrypted data after 2s inactivity" test expects a lock screen or similar?
            // The test expects `expect(page.getByText(/security timeout/i)).toBeVisible();`
            // and the `PasswordList` showed that message if `isMemoryCleared`.

            // If the vault is always ciphered, `isMemoryCleared` is effectively always true regarding content,
            // but we likely still want a "Session Timeout" that clears the encryption key
            // or forces re-login.

            // IMPORTANT: The user request "Deciphering the vault is fast so always keep the vault ciphered"
            // implies we don't need to "clear" it after timeout because it's never fully there.
            // BUT, the test `should clear decrypted data after 2s inactivity` implies a behavior change.
            // If we always show titles, that test might fail if it expects the list to disappear.

            // Let's assume for now we still want a "Lock" feature that hides even titles after timeout.
            // So we can keep `isLocked` state?

            // Actually, the previous `isMemoryCleared` *hid* the items.
            // The new requirement says "keep the vault ciphered".
            // References "Delete the deciphered copy... as soon as possible".
            // This implies the *deciphered* data (usernames/passwords) should not be in memory.
            // Titles are needed for the list.

            // I will implement `sanitizeItems` to strip sensitive data.
            // And `useVaultSecurity` will manage a `isLocked` state that hides everything if timeout occurs?
            // Or maybe `useVaultSecurity` is less relevant if data is always sanitized?
            // The `pwa-offline.spec.ts` test `should clear decrypted data...` checks for "security timeout".
            // If I change the model, I might need to update the test or the behavior.
            // If the user wants "Always keep vault ciphered", they probably are fine with titles being visible?
            // Or maybe they want titles hidden too on timeout?
            // Let's stick to the prompt: "Deciphering... is fast... decipher it only when copying..."
            // This implies the *default* state is "Ciphered (Sanitized)".
            // The "Inactivity Timeout" might still be useful to lock the whole UI.

            // I will refactor `useVaultSecurity` to expose `isLocked` and handle the timeout
            // by calling a simpler `lockVault` method that might clear the sanitized items too?
            // Or just set a flag.

            if (vault.onLock) {
                vault.onLock();
            }
        }, (browser && (window as any).__TESTING__) ? settings.current.inactivityTimeoutTest : settings.current.inactivityTimeout);
    }

    // Auto-setup event listeners
    $effect(() => {
        if (!browser) return;
        if (isActive) isActive();

        const events = [
            "keydown",
            "click",
            "touchstart",
        ];
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

    return {
        stopTimer: () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
        },
        resetTimer
    };
}

export function sanitizeItems(items: PasswordEntry[]): PasswordEntry[] {
    return items.map(item => ({
        id: item.id,
        title: item.title,
        group: item.group,
        tags: item.tags,
        created: item.created,
        modified: item.modified,
        hasUsername: !!item.username,
        hasPassword: !!item.password,
        hasSite: !!item.site,
        // Strip sensitive data
        username: undefined,
        password: undefined,
        site: undefined,
        notes: undefined,
    }));
}
