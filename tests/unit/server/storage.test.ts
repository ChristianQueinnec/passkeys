import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import lockfile from 'proper-lockfile';

vi.mock('fs');
vi.mock('proper-lockfile', () => ({
    default: { lock: vi.fn() }
}));

// Let path.resolve / path.join behave normally so the containment check works.
// We only override path.join for predictable DATA_DIR construction in the module.

// We import storage AFTER mocks are in place.
import * as storage from '$lib/server/storage';

// DATA_DIR is process.cwd() + '/data' resolved.  In the test environment
// process.cwd() is the project root, so we reconstruct it the same way.
const DATA_DIR = path.resolve(process.cwd(), 'data');

describe('Storage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    // -------------------------------------------------------------------------
    describe('getUserDir', () => {
        it('returns the resolved path for a valid username', () => {
            const dir = storage.getUserDir('alice');
            expect(dir).toBe(path.resolve(DATA_DIR, 'alice'));
        });

        it('does NOT create the directory on disk', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.getUserDir('alice');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('throws on path traversal that survives sanitisation', () => {
            // The sanitiser rejects '..' directly, but we test the containment
            // assertion as a defence-in-depth check.  We reach it by temporarily
            // pointing DATA_DIR to a path whose resolved child would escape.
            // The easiest way is to pass a username that resolves outside:
            // sanitiseUsername blocks '/' and '..', so we verify the sanitiser
            // itself fires first (the containment check is the second line of
            // defence).
            expect(() => storage.getUserDir('../etc')).toThrow();
            expect(() => storage.getUserDir('/etc/passwd')).toThrow();
        });

        it('throws for usernames with invalid characters', () => {
            expect(() => storage.getUserDir('user name')).toThrow();
            expect(() => storage.getUserDir('')).toThrow();
            expect(() => storage.getUserDir('a'.repeat(51))).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    describe('ensureUserDir', () => {
        it('creates the directory when it does not exist', () => {
            // beforeEach sets the default to true; override just for the
            // ensureUserDir existsSync call (the module-level DATA_DIR check
            // already ran at import time and is not repeated here).
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.ensureUserDir('alice');
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.resolve(DATA_DIR, 'alice'),
                { recursive: true }
            );
        });

        it('does not call mkdirSync when directory already exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            storage.ensureUserDir('alice');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('returns the resolved user directory path', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const dir = storage.ensureUserDir('alice');
            expect(dir).toBe(path.resolve(DATA_DIR, 'alice'));
        });
    });

    // -------------------------------------------------------------------------
    describe('listVaults', () => {
        it('returns an empty array when the user directory does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = storage.listVaults('alice');
            expect(result).toEqual([]);
            expect(fs.readdirSync).not.toHaveBeenCalled();
        });

        it('does NOT create the directory for a first-time user', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.listVaults('newuser');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('returns vaults sorted newest-first', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue(['old.vault', 'new.vault'] as any);
            vi.mocked(fs.statSync).mockImplementation((p: any) => ({
                size: 100,
                mtime: p.includes('old') ? new Date('2023-01-01') : new Date('2023-01-02'),
            } as any));
            vi.mocked(fs.openSync).mockReturnValue(1);
            vi.mocked(fs.readSync).mockImplementation((_fd, buf: any) => {
                buf[0] = '{'.charCodeAt(0);
                return 1;
            });

            const vaults = storage.listVaults('alice');
            expect(vaults).toHaveLength(2);
            expect(vaults[0].name).toBe('new.vault');
            expect(vaults[1].name).toBe('old.vault');
        });

        it('closes the file descriptor even if readSync throws', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue(['bad.vault'] as any);
            vi.mocked(fs.statSync).mockReturnValue({ size: 0, mtime: new Date() } as any);
            vi.mocked(fs.openSync).mockReturnValue(42);
            vi.mocked(fs.readSync).mockImplementation(() => { throw new Error('read error'); });

            expect(() => storage.listVaults('alice')).toThrow('read error');
            expect(fs.closeSync).toHaveBeenCalledWith(42);
        });

        it('marks unciphered vaults correctly', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue(['plain.vault'] as any);
            vi.mocked(fs.statSync).mockReturnValue({ size: 50, mtime: new Date() } as any);
            vi.mocked(fs.openSync).mockReturnValue(1);
            vi.mocked(fs.readSync).mockImplementation((_fd, buf: any) => {
                buf[0] = '['.charCodeAt(0);   // array → unciphered
                return 1;
            });

            const [vault] = storage.listVaults('alice');
            expect(vault.isCiphered).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    describe('saveVault', () => {
        it('creates the user directory if needed (write path only)', async () => {
            // The module-level DATA_DIR check ran at import; only the
            // ensureUserDir existsSync call happens at test time.
            vi.mocked(fs.existsSync).mockReturnValue(false);
            await storage.saveVault('alice', '{"iv":"x","content":"y"}');
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.resolve(DATA_DIR, 'alice'),
                { recursive: true }
            );
        });

        it('writes content and returns a .vault filename', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const filename = await storage.saveVault('alice', '{"iv":"x","content":"y"}');
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(filename).toMatch(/\.vault$/);
        });

        it('releases the lock even if writeFileSync throws', async () => {
            const releaseMock = vi.fn().mockResolvedValue(undefined);
            vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('disk full'); });

            await expect(storage.saveVault('alice', '{}')).rejects.toThrow('disk full');
            expect(releaseMock).toHaveBeenCalledOnce();
        });
    });

    // -------------------------------------------------------------------------
    describe('getVault', () => {
        it('returns vault content when file exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('vault-content');
            expect(storage.getVault('alice', 'test.vault')).toBe('vault-content');
        });

        it('returns null when file does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            expect(storage.getVault('alice', 'missing.vault')).toBeNull();
        });

        it('does NOT create the user directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.getVault('alice', 'any.vault');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    describe('getLatestVault', () => {
        it('returns null when no vaults exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            expect(storage.getLatestVault('alice')).toBeNull();
        });

        it('returns content of the most recent vault', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue(['v1.vault'] as any);
            vi.mocked(fs.statSync).mockReturnValue({ size: 100, mtime: new Date() } as any);
            vi.mocked(fs.openSync).mockReturnValue(1);
            vi.mocked(fs.readSync).mockImplementation((_fd, buf: any) => {
                buf[0] = '{'.charCodeAt(0);
                return 1;
            });
            vi.mocked(fs.readFileSync).mockReturnValue('latest-content');
            expect(storage.getLatestVault('alice')).toBe('latest-content');
        });
    });

    // -------------------------------------------------------------------------
    describe('deleteVault', () => {
        it('deletes an existing vault', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            storage.deleteVault('alice', 'test.vault');
            expect(fs.unlinkSync).toHaveBeenCalledWith(
                path.join(path.resolve(DATA_DIR, 'alice'), 'test.vault')
            );
        });

        it('does nothing when vault does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.deleteVault('alice', 'missing.vault');
            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('does NOT create the user directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            storage.deleteVault('alice', 'test.vault');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it('propagates unexpected errors', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.unlinkSync).mockImplementation(() => { throw new Error('Permission denied'); });
            expect(() => storage.deleteVault('alice', 'test.vault')).toThrow('Permission denied');
        });
    });
});
