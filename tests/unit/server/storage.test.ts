import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

// ── Mocks must be declared before any imports that load the module under test ──

vi.mock('node:fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync:  vi.fn(),
    }
}));

vi.mock('node:fs/promises', () => ({
    default: {
        mkdir:    vi.fn().mockResolvedValue(undefined),
        access:   vi.fn().mockResolvedValue(undefined),
        readdir:  vi.fn().mockResolvedValue([]),
        stat:     vi.fn(),
        open:     vi.fn(),
        readFile: vi.fn(),
        writeFile:vi.fn().mockResolvedValue(undefined),
        unlink:   vi.fn().mockResolvedValue(undefined),
    }
}));

vi.mock('proper-lockfile', () => ({
    default: { lock: vi.fn().mockResolvedValue(() => Promise.resolve()) }
}));

// ── Imports after mocks ──
import fs  from 'node:fs';
import fsp from 'node:fs/promises';
import lockfile from 'proper-lockfile';
import * as storage from '$lib/server/storage';

const DATA_DIR = path.resolve(process.cwd(), 'data');

describe('Storage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Restore safe defaults after resetAllMocks wipes everything.
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fsp.mkdir).mockResolvedValue(undefined);
        vi.mocked(fsp.access).mockResolvedValue(undefined);
        vi.mocked(fsp.readdir).mockResolvedValue([]);
        vi.mocked(fsp.writeFile).mockResolvedValue(undefined);
        vi.mocked(fsp.unlink).mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    // -------------------------------------------------------------------------
    describe('getUserDir', () => {
        it('returns the resolved path for a valid username', () => {
            expect(storage.getUserDir('alice')).toBe(path.resolve(DATA_DIR, 'alice'));
        });

        it('does NOT create the directory on disk', () => {
            storage.getUserDir('alice');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });

        it('throws on path traversal attempts', () => {
            expect(() => storage.getUserDir('../etc')).toThrow();
            expect(() => storage.getUserDir('/etc/passwd')).toThrow();
        });

        it('throws for invalid usernames', () => {
            expect(() => storage.getUserDir('user name')).toThrow();
            expect(() => storage.getUserDir('')).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    describe('ensureUserDir', () => {
        it('calls fsp.mkdir with the correct path and recursive:true', async () => {
            await storage.ensureUserDir('alice');
            expect(fsp.mkdir).toHaveBeenCalledWith(
                path.resolve(DATA_DIR, 'alice'),
                { recursive: true }
            );
        });

        it('returns the resolved user directory path', async () => {
            expect(await storage.ensureUserDir('alice')).toBe(path.resolve(DATA_DIR, 'alice'));
        });
    });

    // -------------------------------------------------------------------------
    describe('listVaults', () => {
        it('returns an empty array when the user directory does not exist', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            expect(await storage.listVaults('alice')).toEqual([]);
        });

        it('does NOT call fsp.mkdir for a first-time user', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            await storage.listVaults('newuser');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });

        it('returns vaults sorted newest-first', async () => {
            vi.mocked(fsp.readdir).mockResolvedValue(['old.vault', 'new.vault'] as any);
            vi.mocked(fsp.stat).mockImplementation((p: any) => Promise.resolve({
                size: 100,
                mtime: String(p).includes('old') ? new Date('2023-01-01') : new Date('2023-01-02'),
            } as any));
            const mockFh = {
                read:  vi.fn().mockImplementation((buf: Buffer) => { buf[0] = '{'.charCodeAt(0); return Promise.resolve({ bytesRead: 1 }); }),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            const vaults = await storage.listVaults('alice');
            expect(vaults).toHaveLength(2);
            expect(vaults[0].name).toBe('new.vault');
            expect(vaults[1].name).toBe('old.vault');
        });

        it('closes the file handle even if fh.read throws', async () => {
            vi.mocked(fsp.readdir).mockResolvedValue(['bad.vault'] as any);
            vi.mocked(fsp.stat).mockResolvedValue({ size: 0, mtime: new Date() } as any);
            const mockFh = {
                read:  vi.fn().mockRejectedValue(new Error('read error')),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            await expect(storage.listVaults('alice')).rejects.toThrow('read error');
            expect(mockFh.close).toHaveBeenCalledOnce();
        });

        it('marks unciphered vaults (starting with [) correctly', async () => {
            vi.mocked(fsp.readdir).mockResolvedValue(['plain.vault'] as any);
            vi.mocked(fsp.stat).mockResolvedValue({ size: 50, mtime: new Date() } as any);
            const mockFh = {
                read:  vi.fn().mockImplementation((buf: Buffer) => { buf[0] = '['.charCodeAt(0); return Promise.resolve({ bytesRead: 1 }); }),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            const [vault] = await storage.listVaults('alice');
            expect(vault.isCiphered).toBe(false);
        });

        it('marks ciphered vaults (starting with {) correctly', async () => {
            vi.mocked(fsp.readdir).mockResolvedValue(['ciphered.vault'] as any);
            vi.mocked(fsp.stat).mockResolvedValue({ size: 100, mtime: new Date() } as any);
            const mockFh = {
                read:  vi.fn().mockImplementation((buf: Buffer) => { buf[0] = '{'.charCodeAt(0); return Promise.resolve({ bytesRead: 1 }); }),
                close: vi.fn().mockResolvedValue(undefined),
            };
            vi.mocked(fsp.open).mockResolvedValue(mockFh as any);

            const [vault] = await storage.listVaults('alice');
            expect(vault.isCiphered).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    describe('saveVault', () => {
        it('creates the user directory and writes content', async () => {
            await storage.saveVault('alice', '{"iv":"x","cipher":"y"}');
            expect(fsp.mkdir).toHaveBeenCalledWith(path.resolve(DATA_DIR, 'alice'), { recursive: true });
            expect(fsp.writeFile).toHaveBeenCalled();
        });

        it('returns a .vault filename with timestamp and 8-char hex suffix', async () => {
            const filename = await storage.saveVault('alice', '{"iv":"x","cipher":"y"}');
            expect(filename).toMatch(/\.vault$/);
            // Format: 2026-06-03T06-22-50-705Z-eb679731.vault
            // toISOString() with colons and dots replaced by dashes, then -<8 hex chars>.vault
            expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}\.vault$/);
        });

        it('two saves at the same millisecond produce different filenames', async () => {
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
            vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            expect(await storage.getVault('alice', 'missing.vault')).toBeNull();
        });

        it('returns null for any read error', async () => {
            vi.mocked(fsp.readFile).mockRejectedValue(new Error('Permission denied'));
            expect(await storage.getVault('alice', 'any.vault')).toBeNull();
        });

        it('does NOT call fsp.mkdir', async () => {
            vi.mocked(fsp.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            await storage.getVault('alice', 'any.vault');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    describe('getLatestVault', () => {
        it('returns null when no vaults exist', async () => {
            vi.mocked(fsp.access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            expect(await storage.getLatestVault('alice')).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    describe('deleteVault', () => {
        it('deletes an existing vault', async () => {
            await storage.deleteVault('alice', 'test.vault');
            expect(fsp.unlink).toHaveBeenCalledWith(
                path.join(path.resolve(DATA_DIR, 'alice'), 'test.vault')
            );
        });

        it('resolves successfully when vault does not exist (ENOENT)', async () => {
            vi.mocked(fsp.unlink).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            await expect(storage.deleteVault('alice', 'missing.vault')).resolves.toBeUndefined();
        });

        it('does NOT call fsp.mkdir', async () => {
            await storage.deleteVault('alice', 'test.vault');
            expect(fsp.mkdir).not.toHaveBeenCalled();
        });

        it('propagates non-ENOENT errors', async () => {
            vi.mocked(fsp.unlink).mockRejectedValue(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));
            await expect(storage.deleteVault('alice', 'test.vault')).rejects.toThrow('Permission denied');
        });
    });
});
