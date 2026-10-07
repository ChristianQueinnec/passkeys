import fs from 'node:fs';
import path from 'node:path';
import { createHashedEntrySync } from './crypto-utils';
import type { User } from '$lib/types';
import lockfile from 'proper-lockfile';
import logger from '$lib/server/logger';
import settings from './server-settings.json';
import { DATA_DIR } from './data-path';

const USERS_FILE = path.join(DATA_DIR, settings.storage.usersFile);

// Module-level cache.  Populated on first read; invalidated by any write.
// Eliminates the synchronous disk read + JSON parse on every authenticated
// request (getUser → getUsers was hitting disk on every API call).
let usersCache: User[] | null = null;

function invalidateCache(): void {
    usersCache = null;
}

export function resetCacheForTesting(): void {
    usersCache = null;
}

/**
 * Read and parse users.json.  Pure read — no writes, no side-effects.
 * Callers that need to write must acquire the lock themselves before calling.
 */
export const getUsers = (): User[] => {
    if (usersCache !== null) return usersCache;
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
        throw new Error('users.json is malformed: expected an array');
    }
    usersCache = parsed as User[];
    return usersCache;
};

export const getUser = (username: string): User | undefined => {
    return getUsers().find(u => u.username === username);
};

/**
 * One-time startup migration: hash any plain-text passwords found in users.json.
 *
 * This is the *only* place that writes the file outside of updateUserPassword.
 * It acquires the lock before reading so that no concurrent process can also
 * run a migration at the same time.  Designed to be called once, under the
 * once-guard in hooks.server.ts.
 */
export const migrateUsersFile = async (): Promise<void> => {
    if (!fs.existsSync(USERS_FILE)) {
        return;
    }

    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(USERS_FILE, { retries: 5 });
    } catch (e: any) {
        logger.error({ error: e.message }, 'migrateUsersFile: failed to acquire lock');
        throw e;
    }

    try {
        // Re-read inside the lock so we see the committed state, not a
        // potentially stale snapshot from before we acquired it.
        const content = fs.readFileSync(USERS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            throw new Error('users.json is malformed: expected an array');
        }
        const users: User[] = parsed;

        let modified = false;
        for (const user of users) {
            if (user.password && !user.password.includes(':')) {
                user.password = createHashedEntrySync(user.password);
                modified = true;
                logger.info({ username: user.username }, 'Migrated plain-text password');
            }
        }

        if (modified) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            invalidateCache();
            logger.info('users.json migration complete');
        }
    } finally {
        await release!();
    }
};

/**
 * Update a user's password.  Acquires the lock, reads the latest state, writes.
 */
export const updateUserPassword = async (username: string, newPassword: string): Promise<User> => {
    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(USERS_FILE, { retries: 5 });
    } catch (e: any) {
        logger.error({ error: e.message }, 'updateUserPassword: failed to acquire lock');
        throw e;
    }

    try {
        // Read inside the lock to get the latest committed state.
        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            throw new Error(`User not found`);
        }

        users[userIndex].password = createHashedEntrySync(newPassword);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        invalidateCache();
        return users[userIndex];
    } finally {
        await release!();
    }
};
