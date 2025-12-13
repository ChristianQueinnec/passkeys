import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'data/users.json');

export const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(content);

    let modified = false;
    for (const user of users) {
        if (user.password && !user.password.includes(':')) {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.scryptSync(user.password, salt, 64).toString('hex');
            user.password = `${salt}:${hash}`;
            modified = true;
            console.log(`Migrated password for user ${user.username}`);
        }
    }

    if (modified) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    return users;
};

export const getUser = (username: string) => {
    const users = getUsers();
    return users.find((u: any) => u.username === username);
};
