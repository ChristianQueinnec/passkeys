import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import lockfile from 'proper-lockfile';
import { migrateUsersFile } from '$lib/server/users';
import type { User } from '$lib/types';

vi.mock('fs');
vi.mock('proper-lockfile', () => ({
    default: {
        lock: vi.fn().mockResolvedValue(() => Promise.resolve()),
    }
}));

describe('migrateUsersFile', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    it('does nothing when users.json does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        await migrateUsersFile();

        expect(lockfile.lock).not.toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('acquires the lock before reading or writing', async () => {
        const mockUsers: User[] = [{ username: 'alice', password: 'plaintext' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await migrateUsersFile();

        expect(lockfile.lock).toHaveBeenCalledWith(expect.stringContaining('users.json'),
            expect.objectContaining({ retries: 5 }));
        // lock must be called before the write
        const lockOrder = vi.mocked(lockfile.lock).mock.invocationCallOrder[0];
        const writeOrder = vi.mocked(fs.writeFileSync).mock.invocationCallOrder[0];
        expect(lockOrder).toBeLessThan(writeOrder);
    });

    it('hashes plain-text passwords and writes the file', async () => {
        const mockUsers: User[] = [
            { username: 'alice', password: 'plaintext' },
            { username: 'bob',   password: 'anotherplain' },
        ];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await migrateUsersFile();

        expect(fs.writeFileSync).toHaveBeenCalledOnce();
        const written: User[] = JSON.parse(
            vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
        );

        for (const user of written) {
            expect(user.password).toContain(':');        // salt:hash format
            expect(user.password).not.toBe('plaintext');
            expect(user.password).not.toBe('anotherplain');
            const [salt, hash] = user.password.split(':');
            expect(salt.length).toBeGreaterThan(0);
            expect(hash.length).toBeGreaterThan(0);
        }
    });

    it('does not write the file when all passwords are already hashed', async () => {
        const mockUsers: User[] = [
            { username: 'alice', password: 'abcdef1234:hashedvalue' },
        ];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await migrateUsersFile();

        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('leaves already-hashed passwords untouched', async () => {
        const existing = 'abcdef1234:hashedvalue';
        const mockUsers: User[] = [
            { username: 'alice', password: existing },
            { username: 'bob',   password: 'plaintext' },
        ];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await migrateUsersFile();

        const written: User[] = JSON.parse(
            vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
        );
        const alice = written.find(u => u.username === 'alice');
        expect(alice!.password).toBe(existing);          // unchanged

        const bob = written.find(u => u.username === 'bob');
        expect(bob!.password).toContain(':');
        expect(bob!.password).not.toBe('plaintext');
    });

    it('two concurrent calls share the same Promise and lock only once', async () => {
        const mockUsers: User[] = [{ username: 'alice', password: 'plaintext' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        // Simulate the once-guard in hooks.server.ts: call migrateUsersFile via
        // a shared promise wrapper, as hooks.server.ts does.
        let promise: Promise<void> | null = null;
        const runOnce = () => {
            if (!promise) promise = migrateUsersFile();
            return promise;
        };

        await Promise.all([runOnce(), runOnce(), runOnce()]);

        // The underlying migrateUsersFile was called once → lock acquired once
        expect(lockfile.lock).toHaveBeenCalledTimes(1);
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('releases the lock even if writeFileSync throws', async () => {
        const mockUsers: User[] = [{ username: 'alice', password: 'plaintext' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));
        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('disk full'); });

        const releaseMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);

        await expect(migrateUsersFile()).rejects.toThrow('disk full');

        expect(releaseMock).toHaveBeenCalledOnce();
    });
});
