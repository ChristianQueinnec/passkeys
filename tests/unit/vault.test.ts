import { describe, it, expect } from 'vitest';
import { sortPasswordEntries, filterPasswordEntries, normalizeVaultItems, overwriteSensitiveEntry } from '../../src/lib/vault';
import type { PasswordEntry } from '../../src/lib/types';

describe('Vault Utilities', () => {
    const mockItems: PasswordEntry[] = [
        { id: '1', title: 'Zebra', username: 'u1', password: 'p1', site: 's1', tags: [], notes: '' },
        { id: '2', title: 'Apple', username: 'u2', password: 'p2', site: 's2', tags: ['work'], notes: 'important' },
        { id: '3', title: 'banana', username: 'u3', password: 'p3', site: 's3', tags: [], notes: '' },
    ];

    describe('sortPasswordEntries', () => {
        it('should sort entries alphabetically by title, case-insensitive', () => {
            const sorted = sortPasswordEntries(mockItems);
            expect(sorted[0].title).toBe('Apple');
            expect(sorted[1].title).toBe('banana');
            expect(sorted[2].title).toBe('Zebra');
        });

        it('should handle missing titles gracefully', () => {
            const itemsWithMissingTitle = [
                ...mockItems,
                { id: '4', title: '', username: 'u4', password: 'p4', site: 's4', tags: [], notes: '' }
            ] as PasswordEntry[];
            const sorted = sortPasswordEntries(itemsWithMissingTitle);
            expect(sorted[0].title).toBe('');
        });
    });

    describe('filterPasswordEntries', () => {
        it('should return all items if filter is empty', () => {
            const filtered = filterPasswordEntries(mockItems, '');
            expect(filtered.length).toBe(3);
        });

        it('should filter by title', () => {
            const filtered = filterPasswordEntries(mockItems, 'apple');
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('2');
        });

        it('should filter by username', () => {
            const filtered = filterPasswordEntries(mockItems, 'u3');
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('3');
        });

        it('should filter by tags', () => {
            const filtered = filterPasswordEntries(mockItems, 'work');
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('2');
        });

        it('should filter by notes', () => {
            const filtered = filterPasswordEntries(mockItems, 'important');
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('2');
        });

        it('should be case-insensitive', () => {
            const filtered = filterPasswordEntries(mockItems, 'BANANA');
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('3');
        });
    });

    describe('normalizeVaultItems', () => {
        it('should ensure all items have an ID', () => {
            const rawItems = [
                { title: 'NoID', username: 'u', password: 'p', site: 's' }
            ];
            const normalized = normalizeVaultItems(rawItems);
            expect(normalized[0].id).toBeDefined();
            expect(typeof normalized[0].id).toBe('string');
        });

        it('should preserve existing IDs', () => {
            const rawItems = [
                { id: 'existing-id', title: 'WithID', username: 'u', password: 'p', site: 's' }
            ];
            const normalized = normalizeVaultItems(rawItems);
            expect(normalized[0].id).toBe('existing-id');
        });

        it('should ensure tags is always an array', () => {
            const rawItems = [
                { title: 'NoTags', username: 'u', password: 'p', site: 's' }
            ];
            const normalized = normalizeVaultItems(rawItems);
            expect(Array.isArray(normalized[0].tags)).toBe(true);
            expect(normalized[0].tags?.length).toBe(0);
        });

        it('should default missing title to "Untitled"', () => {
            const rawItems = [
                { username: 'u', password: 'p' }
            ];
            const normalized = normalizeVaultItems(rawItems);
            expect(normalized[0].title).toBe('Untitled');
        });
    });

    describe('overwriteSensitiveEntry', () => {
        it('replaces plaintext entry fields with random data', () => {
            const entry: PasswordEntry = {
                id: '1', title: 'Title', username: 'user@example.com', password: 'secret',
                site: 'https://example.com', group: 'Private', tags: ['tag'], notes: 'note',
            };

            overwriteSensitiveEntry(entry);

            expect(entry.id).toBe('1');
            expect(entry.title).not.toBe('Title');
            expect(entry.username).not.toBe('user@example.com');
            expect(entry.password).not.toBe('secret');
            expect(entry.site).not.toBe('https://example.com');
            expect(entry.group).not.toBe('Private');
            expect(entry.tags?.[0]).not.toBe('tag');
            expect(entry.notes).not.toBe('note');
        });
    });
});
