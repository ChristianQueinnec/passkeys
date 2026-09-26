import { describe, it, expect, beforeEach, vi } from 'vitest';

const { decryptedItems } = vi.hoisted(() => ({
    decryptedItems: [] as PasswordEntry[],
}));

vi.mock('$lib/stores/vault/crypto', () => ({
    createVaultCrypto: () => ({
        getDecryptedItems: async () => decryptedItems,
        getDecryptedItem: async () => undefined,
    }),
}));

import { useVault } from '../../src/lib/stores/useVault.svelte';
import { settings } from '../../src/lib/stores/useSettings.svelte';
import { EncryptionKey } from '../../src/lib/vaultkey';
import type { PasswordEntry } from '../../src/lib/types';

describe('Vault username suggestions', () => {
    beforeEach(() => {
        settings.reset();
        decryptedItems.length = 0;
    });

    function createVault(items: PasswordEntry[]) {
        decryptedItems.push(...items);
        const vault = useVault(new EncryptionKey(), () => {});
        return vault;
    }

    it('suggests valid email addresses used at least minEmailCount times', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'shared@example.com' },
            { id: '2', title: 'Two', username: 'shared@example.com' },
            { id: '3', title: 'Three', username: 'shared@example.com' },
            { id: '4', title: 'Four', username: 'only-once@example.com' },
            { id: '5', title: 'Five', username: 'not-an-email' },
        ]);

        await expect(vault.getUsernameSuggestions()).resolves.toEqual(['shared@example.com']);
    });

    it('excludes the entry being edited when counting duplicate usernames', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'shared@example.com' },
            { id: '2', title: 'Two', username: 'shared@example.com' },
            { id: '3', title: 'Three', username: 'shared@example.com' },
        ]);

        await expect(vault.getUsernameSuggestions('1')).resolves.toEqual([]);
    });

    it('sorts suggestions alphabetically and applies a configured threshold', async () => {
        const response = {
            ok: true,
            json: () => Promise.resolve({ minEmailCount: 2 }),
        };
        globalThis.fetch = async () => response as Response;
        await settings.load();

        const vault = createVault([
            { id: '1', title: 'One', username: 'z@example.com' },
            { id: '2', title: 'Two', username: 'z@example.com' },
            { id: '3', title: 'Three', username: 'a@example.com' },
            { id: '4', title: 'Four', username: 'a@example.com' },
        ]);

        await expect(vault.getUsernameSuggestions()).resolves.toEqual([
            'a@example.com',
            'z@example.com',
        ]);
    });
});
