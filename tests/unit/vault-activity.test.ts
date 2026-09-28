import { describe, expect, it, vi } from 'vitest';
import { EncryptionKey } from '../../src/lib/vaultkey';
import { VaultState } from '../../src/lib/stores/vault/state.svelte';
import { createVaultActivity } from '../../src/lib/stores/vault/activity.svelte';

describe('Vault activity locking', () => {
    it('clears decrypted entry references when locking', () => {
        const key = new EncryptionKey();
        const onLock = vi.fn();
        const state = new VaultState(key, onLock);
        const entry = {
            id: 'entry-1',
            title: 'Example',
            username: 'user@example.com',
            password: 'secret',
        };
        state.selectedItem = entry;
        state.editingItem = { ...entry };
        state.dirtySecrets.set(entry.id, entry);

        const activity = createVaultActivity(state, {
            getDecryptedItem: async () => entry,
            getDecryptedItems: async () => [entry],
        });

        activity.lockNow();

        expect(state.selectedItem).toBeNull();
        expect(state.editingItem).toBeNull();
        expect(state.dirtySecrets.size).toBe(0);
        expect(key.isSet).toBe(false);
        expect(onLock).toHaveBeenCalledOnce();
    });
});
