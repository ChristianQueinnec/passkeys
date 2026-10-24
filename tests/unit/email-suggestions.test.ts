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

describe('Email username suggestions (case deduplication and ranking)', () => {
    beforeEach(() => {
        settings.reset();
        decryptedItems.length = 0;
    });

    function createVault(items: PasswordEntry[]) {
        decryptedItems.push(...items);
        return useVault(new EncryptionKey(), () => {});
    }

    it('shows only one email when entries differ only by case, preferring the one without capitals', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'Alice@example.com' },
            { id: '2', title: 'Two', username: 'Alice@example.com' },
            { id: '3', title: 'Three', username: 'alice@example.com' },
        ]);

        await expect(vault.getUsernameSuggestions()).resolves.toEqual(['alice@example.com']);
    });

    it('chooses the variant with fewest capitals when none is entirely lowercase', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'Bob@example.com' },
            { id: '2', title: 'Two', username: 'Bob@example.com' },
            { id: '3', title: 'Three', username: 'BOB@EXAMPLE.COM' },
        ]);

        await expect(vault.getUsernameSuggestions()).resolves.toEqual(['Bob@example.com']);
    });

    it('lists resulting emails in decreasing order of uses', async () => {
        const vault = createVault([
            { id: '1', title: 'Rare 1', username: 'rare@example.com' },
            { id: '2', title: 'Rare 2', username: 'rare@example.com' },
            { id: '3', title: 'Rare 3', username: 'rare@example.com' },
            { id: '4', title: 'Frequent 1', username: 'frequent@example.com' },
            { id: '5', title: 'Frequent 2', username: 'Frequent@example.com' },
            { id: '6', title: 'Frequent 3', username: 'frequent@example.com' },
            { id: '7', title: 'Frequent 4', username: 'FREQUENT@EXAMPLE.COM' },
            { id: '8', title: 'Frequent 5', username: 'frequent@example.com' },
            { id: '9', title: 'Medium 1', username: 'medium@example.com' },
            { id: '10', title: 'Medium 2', username: 'medium@example.com' },
            { id: '11', title: 'Medium 3', username: 'medium@example.com' },
            { id: '12', title: 'Medium 4', username: 'medium@example.com' },
        ]);

        // frequent: 5 uses, medium: 4 uses, rare: 3 uses
        await expect(vault.getUsernameSuggestions()).resolves.toEqual([
            'frequent@example.com',
            'medium@example.com',
            'rare@example.com',
        ]);
    });

    it('breaks ties in use counts using alphabetical order', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'zeta@example.com' },
            { id: '2', title: 'Two', username: 'zeta@example.com' },
            { id: '3', title: 'Three', username: 'zeta@example.com' },
            { id: '4', title: 'Four', username: 'alpha@example.com' },
            { id: '5', title: 'Five', username: 'alpha@example.com' },
            { id: '6', title: 'Six', username: 'alpha@example.com' },
        ]);

        await expect(vault.getUsernameSuggestions()).resolves.toEqual([
            'alpha@example.com',
            'zeta@example.com',
        ]);
    });

    it('aggregates case variants towards the minEmailCount threshold', async () => {
        const vault = createVault([
            { id: '1', title: 'One', username: 'case@example.com' },
            { id: '2', title: 'Two', username: 'Case@example.com' },
            { id: '3', title: 'Three', username: 'CASE@EXAMPLE.COM' },
            { id: '4', title: 'Four', username: 'under@example.com' },
            { id: '5', title: 'Five', username: 'under@example.com' },
        ]);

        // default minEmailCount = 3. 'case@example.com' has 3 uses (combined). 'under@example.com' has 2 uses.
        await expect(vault.getUsernameSuggestions()).resolves.toEqual(['case@example.com']);
    });
});
