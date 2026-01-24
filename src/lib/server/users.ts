import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createHashedEntry, createHashedEntrySync } from './crypto-utils';
import type { User } from '$lib/types';
import lockfile from 'proper-lockfile';
import logger from '$lib/server/logger';

const USERS_FILE = path.join(process.cwd(), 'data/users.json');

export const getUsers = (): User[] => {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    const users: User[] = JSON.parse(content);

    let modified = false;
    for (const user of users) {
        if (user.password && !user.password.includes(':')) {
            user.password = createHashedEntrySync(user.password)
            modified = true;
            logger.info({ username: user.username }, 'Migrated password for user');
        }
    }

    if (modified) {
        // Hope that this is atomic!
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    return users;
};

export const getUser = (username: string): User | undefined => {
    const users = getUsers();
    return users.find(u => u.username === username);
};

export const updateUserPassword = async (username: string, newPassword: string): Promise<User> => {
    const release = await lockfile.lock(USERS_FILE);
    try {
        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            throw new Error(`User not found`);
        }

        users[userIndex].password = createHashedEntrySync(newPassword);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return users[userIndex];
    } finally {
        await release();
    }
};
