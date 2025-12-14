import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { getUsers } from '$lib/server/users';

vi.mock('fs');

describe('getUsers migration', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should migrate plain text passwords correctly', () => {
        const mockUsers = [
            { username: 'testuser', password: 'plainPassword' }
        ];

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockUsers));

        getUsers();

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
        const writtenContent = JSON.parse(callArgs[1] as string);

        // Verification
        // Check that password is now hashed (contains colon) and is not the original
        expect(writtenContent[0].password).not.toBe('plainPassword');
        expect(writtenContent[0].password).toContain(':');

        // Ensure it's not [object Promise] or similar (basic sanity check for sync)
        expect(typeof writtenContent[0].password).toBe('string');
        const [salt, hash] = writtenContent[0].password.split(':');
        expect(salt).toBeDefined();
        expect(hash).toBeDefined();
        expect(salt.length).toBeGreaterThan(0);
        expect(hash.length).toBeGreaterThan(0);
    });
});
