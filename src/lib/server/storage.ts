import fs from 'node:fs';
import path from 'node:path';
import { sanitizeUsername } from '$lib/server/sanitizer';
import lockfile from 'proper-lockfile';
import settings from './server-settings.json';

const DATA_DIR = path.join(process.cwd(), settings.storage.dataDir);

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const getUserDir = (username: string) => {
    // Throw error if not sanitizable:
    let sanitizedUsername = sanitizeUsername(username);
    const userDir = path.join(DATA_DIR, sanitizedUsername);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
};

// Returns sorted list of vault filenames (newest first)
export const listVaults = (username: string) => {
    const userDir = getUserDir(username);
    return fs.readdirSync(userDir)
        .filter((f: string) => f.endsWith('.vault')) // Filter for vault files
        .map(file => {
            const filePath = path.join(userDir, file);
            const stats = fs.statSync(filePath);

            // Read first character to detect if it's a ciphered object ({) or an array ([)
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(1);
            fs.readSync(fd, buffer, 0, 1, 0);
            fs.closeSync(fd);
            const firstChar = buffer.toString('utf-8');
            const isCiphered = firstChar === '{';

            return {
                name: file,
                size: stats.size,
                mtime: stats.mtime,
                isCiphered
            };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};

export const saveVault = async (username: string, content: string): Promise<string> => {
    let release;
    try {
        const userDir = getUserDir(username);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}.vault`;
        const filePath = path.join(userDir, filename);
        release = await lockfile.lock(filePath, { realpath: false });
        fs.writeFileSync(filePath, content);
        return filename;
    } finally {
        if (release) await release();
    }
};

export const getVault = (username: string, filename: string) => {
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
};

export const getLatestVault = (username: string) => {
    const vaults = listVaults(username);
    if (vaults.length === 0) return null;
    return getVault(username, vaults[0].name);
};

export const deleteVault = (username: string, filename: string) => {
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};
