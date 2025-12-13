import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data/users.json');

export const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content);
};

export const getUser = (username: string) => {
    const users = getUsers();
    return users.find((u: any) => u.username === username);
};
