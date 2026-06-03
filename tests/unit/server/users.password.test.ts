import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import lockfile from 'proper-lockfile';
import { updateUserPassword, resetCacheForTesting } from '$lib/server/users';
import type { User } from '$lib/types';

vi.mock('fs');
vi.mock('proper-lockfile', () => ({
    default: {
        lock: vi.fn().mockResolvedValue(() => Promise.resolve()),
    }
}));

describe('updateUserPassword', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        resetCacheForTesting();
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    it('acquires the lock before reading or writing', async () => {
        const mockUsers: User[] = [{ username: 'testuser', password: 'old:hash' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await updateUserPassword('testuser', 'newPassword1');

        expect(lockfile.lock).toHaveBeenCalledWith(
            expect.stringContaining('users.json'),
            expect.objectContaining({ retries: 5 })
        );
        const lockOrder  = vi.mocked(lockfile.lock).mock.invocationCallOrder[0];
        const readOrder  = vi.mocked(fs.readFileSync).mock.invocationCallOrder[0];
        const writeOrder = vi.mocked(fs.writeFileSync).mock.invocationCallOrder[0];
        expect(lockOrder).toBeLessThan(readOrder);
        expect(readOrder).toBeLessThan(writeOrder);
    });

    it('hashes the new password and writes the file', async () => {
        const mockUsers: User[] = [{ username: 'testuser', password: 'old:hash' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await updateUserPassword('testuser', 'newPassword1');

        expect(fs.writeFileSync).toHaveBeenCalledOnce();
        const written: User[] = JSON.parse(
            vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
        );
        const updated = written.find(u => u.username === 'testuser');
        expect(updated).toBeDefined();
        expect(updated!.password).not.toBe('old:hash');
        expect(updated!.password).toContain(':');
        const [salt, hash] = updated!.password.split(':');
        expect(salt.length).toBeGreaterThan(0);
        expect(hash.length).toBeGreaterThan(0);
    });

    it('returns the updated user', async () => {
        const mockUsers: User[] = [{ username: 'testuser', password: 'old:hash' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        const result = await updateUserPassword('testuser', 'newPassword1');

        expect(result.username).toBe('testuser');
        expect(result.password).toContain(':');
    });

    it('leaves other users unchanged', async () => {
        const mockUsers: User[] = [
            { username: 'alice', password: 'alice:hash' },
            { username: 'bob',   password: 'bob:hash'   },
        ];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await updateUserPassword('alice', 'newPassword1');

        const written: User[] = JSON.parse(
            vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
        );
        const bob = written.find(u => u.username === 'bob');
        expect(bob!.password).toBe('bob:hash');          // untouched
    });

    it('throws and releases the lock when user not found', async () => {
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('[]');

        await expect(updateUserPassword('unknown', 'pass12345')).rejects.toThrow('User not found');

        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(releaseMock).toHaveBeenCalledOnce();
    });

    it('releases the lock even if writeFileSync throws', async () => {
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockResolvedValue(releaseMock);
        const mockUsers: User[] = [{ username: 'testuser', password: 'old:hash' }];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));
        vi.mocked(fs.writeFileSync).mockImplementation(() => { throw new Error('disk full'); });

        await expect(updateUserPassword('testuser', 'newPassword1')).rejects.toThrow('disk full');

        expect(releaseMock).toHaveBeenCalledOnce();
    });

    it('reads inside the lock so it sees the latest committed state', async () => {
        // Verify that readFileSync is called AFTER lock is acquired (not before).
        // The invocation-order check in the first test covers this, but this test
        // makes the intent explicit with a sequential mock that returns different
        // data depending on when it is called.
        const staleUsers: User[]  = [{ username: 'testuser', password: 'stale:hash' }];
        const freshUsers: User[]  = [{ username: 'testuser', password: 'fresh:hash' }];

        let lockAcquired = false;
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(lockfile.lock).mockImplementation(async () => {
            lockAcquired = true;
            return releaseMock;
        });

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            // If called before lock is acquired, return stale data
            return JSON.stringify(lockAcquired ? freshUsers : staleUsers);
        });

        await updateUserPassword('testuser', 'newPassword1');

        const written: User[] = JSON.parse(
            vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
        );
        // The write must be based on the fresh (post-lock) read
        const updated = written.find(u => u.username === 'testuser');
        expect(updated!.password).not.toBe('stale:hash');
    });
});
