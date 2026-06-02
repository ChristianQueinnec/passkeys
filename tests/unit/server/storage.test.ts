import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import lockfile from 'proper-lockfile';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('proper-lockfile', () => ({
    default: { lock: vi.fn() }
}));

import * as storage from '$lib/server/storage';

const DATA_DIR = path.resolve(process.cwd(), 'data');

describe('Storage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    // -------------------------------------------------------------------------
    describe('getUserDir', () => {
        it('returns the resolved path for a valid username', () => {
            const dir = storage.getUserDir('alice');
            expect(dir).toBe(path.resolve(DATA_DIR, 'alice'));
        });

        it('does NOT create the directory on disk', () => {
            storage.getUserDir('alice');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('throws on path traversal attempts', () => {
            expect(() => storage.getUserDir('../etc')).toThrow();
            expect(() => storage.getUserDir('/etc/passwd')).toThrow();
        });

        it('throws for usernames with invalid characters', () => {
            expect(() => storage.getUserDir('user name')).toThrow();
            expect(() => storage.getUserDir('')).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    describe('ensureUserDir', () => {
        it('creates the directory', async () => {
            await storage.ensureUserDir('alice');
            expect(fsp.mkdir).toHaveBeenCalledWith(
                path.resolve(DATA_DIR, 'alice'),
                { recursive: true }
            );
        });

        it('returns the resolved user directory path', async () => {
            const dir = await storage.ensureUserDir('alice');
            expect(dir).toBe(path.resolve(DATA_DIR, 'alice'));
        });
    });

    // -------------------------------------------------------------------------
    describe('listVaults', () => {
        it('returns an empty array when the user directory does not exist', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            const result = await storage.listVaults('alice');
            expect(result).toEqual([]);
        });

        it('does NOT create the directory for a first-time user', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            await storage.listVaults('newuser');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });

        it('returns vaults sorted newest-first', async () => {
            vi.mocked(fsp.access).mockResolvedValue(undefined);
            vi.mocked(fsp.readdir).mockResolvedValue(['old.vault', 'new.vault'] as any);
            vi.mocked(fsp.stat).mockImplementation((p: any) => Promise.resolve({
                size: 100,
                mtime: p.includes('old') ? new Date('2023-01-01') : new Date('2023-01-02'),
            } as any));
            const mockFh = {
                read: vi.fn().mockImplementation(async (buf: Buffer) => { buf[0] = '{'.charCodeAt(0); }),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            const vaults = await storage.listVaults('alice');
            expect(vaults).toHaveLength(2);
            expect(vaults[0].name).toBe('new.vault');
            expect(vaults[1].name).toBe('old.vault');
        });

        it('closes the file handle even if read throws', async () => {
            vi.mocked(fsp.access).mockResolvedValue(undefined);
            vi.mocked(fsp.readdir).mockResolvedValue(['bad.vault'] as any);
            vi.mocked(fsp.stat).mockResolvedValue({ size: 0, mtime: new Date() } as any);
            const mockFh = {
                read: vi.fn().mockRejectedValue(new Error('read error')),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            await expect(storage.listVaults('alice')).rejects.toThrow('read error');
            expect(mockFh.close).toHaveBeenCalledOnce();
        });

        it('marks unciphered vaults correctly', async () => {
            vi.mocked(fsp.access).mockResolvedValue(undefined);
            vi.mocked(fsp.readdir).mockResolvedValue(['plain.vault'] as any);
            vi.mocked(fsp.stat).mockResolvedValue({ size: 50, mtime: new Date() } as any);
            const mockFh = {
                read: vi.fn().mockImplementation(async (buf: Buffer) => { buf[0] = '['.charCodeAt(0); }),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            const [vault] = await storage.listVaults('alice');
            expect(vault.isCiphered).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    describe('saveVault', () => {
        it('creates the user directory and writes content', async () => {
            await storage.saveVault('alice', '{"iv":"x","cipher":"y"}');
            expect(fsp.mkdir).toHaveBeenCalledWith(path.resolve(DATA_DIR, 'alice'), { recursive: true });
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('returns a .vault filename with a random suffix', async () => {
            const filename = await storage.saveVault('alice', '{"iv":"x","cipher":"y"}');
            expect(filename).toMatch(/\.vault$/);
            // Filename should contain timestamp + suffix, e.g. 2024-...-abcd1234.vault
            expect(filename).toMatch(/^[\d-T]+-[0-9a-f]{8}\.vault$/);
        });

        it('two saves in the same millisecond produce different filenames', async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
            const f1 = await storage.saveVault('alice', '{"iv":"a","cipher":"b"}');
            const f2 = await storage.saveVault('alice', '{"iv":"c","cipher":"d"}');
            expect(f1).not.toBe(f2);
            vi.useRealTimers();
        });

        it('releases the lock even if writeFile throws', async () => {
            const releaseMock = vi.fn().mockResolvedValue(undefined);
            vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);
            vi.mocked(fsp.writeFile).mockRejectedValue(new Error('disk full'));

            await expect(storage.saveVault('alice', '{}')).rejects.toThrow('disk full');
            expect(releaseMock).toHaveBeenCalledOnce();
        });
    });

    // -------------------------------------------------------------------------
    describe('getVault', () => {
        it('returns vault content when file exists', async () => {
            vi.mocked(fsp.readFile).mockResolvedValue('vault-content' as any);
            expect(await storage.getVault('alice', 'test.vault')).toBe('vault-content');
        });

        it('returns null when file does not exist', async () => {
            vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            expect(await storage.getVault('alice', 'missing.vault')).toBeNull();
        });

        it('does NOT create the user directory', async () => {
            vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            await storage.getVault('alice', 'any.vault');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    describe('getLatestVault', () => {
        it('returns null when no vaults exist', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            expect(await storage.getLatestVault('alice')).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    describe('deleteVault', () => {
        it('deletes an existing vault', async () => {
            vi.mocked(fsp.unlink).mockResolvedValue(undefined);
            await storage.deleteVault('alice', 'test.vault');
            expect(fsp.unlink).toHaveBeenCalledWith(
                path.join(path.resolve(DATA_DIR, 'alice'), 'test.vault')
            );
        });

        it('does nothing when vault does not exist (ENOENT)', async () => {
            vi.mocked(fsp.unlink).mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' }));
            await expect(storage.deleteVault('alice', 'missing.vault')).resolves.toBeUndefined();
        });

        it('does NOT create the user directory', async () => {
            vi.mocked(fsp.unlink).mockResolvedValue(undefined);
            await storage.deleteVault('alice', 'test.vault');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });

        it('propagates unexpected errors', async () => {
            vi.mocked(fsp.unlink).mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
            await expect(storage.deleteVault('alice', 'test.vault')).rejects.toThrow('Permission denied');
        });
    });
});
