import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storage from '$lib/server/storage';
import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';

vi.mock('fs');
vi.mock('proper-lockfile', () => ({
    default: {
        lock: vi.fn(),
    }
}));
vi.mock('path', async () => {
    const actual = await vi.importActual('path');
    return {
        ...actual,
        join: (...args: string[]) => args.join('/'),
    };
});

describe('Storage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Mock default behaviors
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    it('should create user directory if it does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        storage.getUserDir('testuser');
        expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should list vaults sorted by date (newest first)', () => {
        const mockFiles = ['old.vault', 'new.vault'];
        vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any);

        vi.mocked(fs.statSync).mockImplementation((path: any) => {
            if (path.includes('old.vault')) return { size: 100, mtime: new Date('2023-01-01') } as any;
            if (path.includes('new.vault')) return { size: 200, mtime: new Date('2023-01-02') } as any;
            return {} as any;
        });

        // Mock openSync/readSync/closeSync for isCiphered check
        vi.mocked(fs.openSync).mockReturnValue(1);
        vi.mocked(fs.readSync).mockImplementation((fd, buffer: any) => {
            if (buffer instanceof Buffer || buffer instanceof Uint8Array) {
                buffer[0] = '['.charCodeAt(0); // Unciphered
            }
            return 1;
        });

        const vaults = storage.listVaults('testuser');
        expect(vaults).toHaveLength(2);
        expect(vaults[0].name).toBe('new.vault');
        expect(vaults[1].name).toBe('old.vault');
    });

    it('should save a vault', async () => {
        const filename = await storage.saveVault('testuser', 'content');
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(filename).toMatch(/\.vault$/);
    });

    it('should get a specific vault', () => {
        vi.mocked(fs.readFileSync).mockReturnValue('vault-content');
        const content = storage.getVault('testuser', 'test.vault');
        expect(content).toBe('vault-content');
    });

    it('should return null if vault does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const content = storage.getVault('testuser', 'missing.vault');
        expect(content).toBeNull();
    });

    it('should get latest vault', () => {
        // Mock listVaults behavior by mocking fs calls
        const mockFiles = ['v1.vault'];
        vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any);
        vi.mocked(fs.statSync).mockReturnValue({ size: 100, mtime: new Date() } as any);
        vi.mocked(fs.readFileSync).mockReturnValue('latest-content');

        const content = storage.getLatestVault('testuser');
        expect(content).toBe('latest-content');
    });

    it('should delete a vault', () => {
        storage.deleteVault('testuser', 'test.vault');
        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not delete if vault does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        storage.deleteVault('testuser', 'missing.vault');
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', () => {
        vi.mocked(fs.unlinkSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        expect(() => storage.deleteVault('testuser', 'test.vault')).toThrow('Permission denied');
    });

    it('should delete vault with special characters in filename', () => {
        const specialFilename = 'vault-2024-01-15T10-30-45.123Z.vault';
        storage.deleteVault('testuser', specialFilename);
        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle multiple vault deletions', () => {
        storage.deleteVault('testuser', 'vault1.vault');
        storage.deleteVault('testuser', 'vault2.vault');
        storage.deleteVault('testuser', 'vault3.vault');
        expect(fs.unlinkSync).toHaveBeenCalledTimes(3);
    });
});
