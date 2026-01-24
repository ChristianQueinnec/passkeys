import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { updateUserPassword } from '$lib/server/users';
import type { User } from '$lib/types';
import lockfile from 'proper-lockfile';

vi.mock('fs');
vi.mock('proper-lockfile', () => ({
    default: {
        lock: vi.fn().mockResolvedValue(() => Promise.resolve()),
    }
}));

describe('updateUserPassword', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(lockfile.lock).mockResolvedValue(() => Promise.resolve());
    });

    it('should update password with hashed value', async () => {
        const mockUsers: User[] = [
            { username: 'testuser', password: 'old:hash' }
        ];

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        await updateUserPassword('testuser', 'newPassword');

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
        const writtenUsers: User[] = JSON.parse(callArgs[1] as string);
        const updatedUser = writtenUsers.find(u => u.username === 'testuser');

        expect(updatedUser).toBeDefined();
        expect(updatedUser!.password).not.toBe('old:hash');
        expect(updatedUser!.password).toContain(':');
        const [salt, hash] = updatedUser!.password.split(':');
        expect(salt).toBeDefined();
        expect(hash).toBeDefined();
    });

    it('should throw error if user not found', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('[]');

        await expect(updateUserPassword('unknown', 'pass')).rejects.toThrow('User not found');
    });
});
