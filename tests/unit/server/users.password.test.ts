import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { updateUserPassword, getUsers } from '$lib/server/users';

vi.mock('fs');

describe('updateUserPassword', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should update password with hashed value', () => {
        const mockUsers = [
            { username: 'testuser', password: 'old:hash' }
        ];

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        updateUserPassword('testuser', 'newPassword');

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
        const writtenUsers = JSON.parse(callArgs[1] as string);
        const updatedUser = writtenUsers.find((u: any) => u.username === 'testuser');

        expect(updatedUser.password).not.toBe('old:hash');
        expect(updatedUser.password).toContain(':');
        const [salt, hash] = updatedUser.password.split(':');
        expect(salt).toBeDefined();
        expect(hash).toBeDefined();
    });

    it('should throw error if user not found', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('[]');

        expect(() => updateUserPassword('unknown', 'pass')).toThrow('User not found');
    });
});
