import fs from 'fs';
import { createHashedEntrySync } from '../src/lib/server/crypto-utils';
import type { User } from '../src/lib/types';

const USERS_FILE = 'data/users.json';

const addUsers = () => {
    let users: User[] = [];
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }

    const startUserCount = users.length;

    // User 'q' for Vault/History operations (stable password 'q')
    if (!users.find(u => u.username === 'q')) {
        users.push({ username: 'q', password: createHashedEntrySync('q') });
        console.log('User q added.');
    }

    // User 'auth_test' for Auth operations (password will be changed)
    if (!users.find(u => u.username === 'auth_test')) {
        users.push({ username: 'auth_test', password: createHashedEntrySync('q') }); // Initial pass 'q'
        console.log('User auth_test added.');
    } else {
        // Reset auth_test password to 'q' to ensure test start state
        const idx = users.findIndex(u => u.username === 'auth_test');
        users[idx].password = createHashedEntrySync('q');
        console.log('User auth_test reset.');
    }

    // User 'history_test' for History operations
    if (!users.find(u => u.username === 'history_test')) {
        users.push({ username: 'history_test', password: createHashedEntrySync('q') });
        console.log('User history_test added.');
    }

    // User 'deletion_test' for Vault Deletion operations
    if (!users.find(u => u.username === 'deletion_test')) {
        users.push({ username: 'deletion_test', password: createHashedEntrySync('password') });
        console.log('User deletion_test added.');
    }

    if (!users.find(u => u.username === 'admin')) {
        users.push({ username: 'admin', password: createHashedEntrySync('password') });
        console.log('User admin added.');
    }

    if (users.length > startUserCount || true) { // Always save to ensure reset
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
};

addUsers();
