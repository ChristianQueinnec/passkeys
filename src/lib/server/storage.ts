import fs from 'node:fs';
import path from 'node:path';
import { sanitizeUsername } from '$lib/server/sanitizer';
import lockfile from 'proper-lockfile';
import settings from './server-settings.json';
import logger from '$lib/server/logger';

const DATA_DIR = path.resolve(process.cwd(), settings.storage.dataDir);

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Resolve the directory path for a user's vaults.
 *
 * Pure resolver — never creates anything on disk.  Every storage function
 * calls this first so they all benefit from the containment check.
 *
 * @throws if the resolved path would escape DATA_DIR (path traversal guard).
 */
export const getUserDir = (username: string): string => {
    const sanitizedUsername = sanitizeUsername(username);
    const userDir = path.resolve(DATA_DIR, sanitizedUsername);

    // Hard containment assertion: the resolved path must sit strictly inside
    // DATA_DIR.  path.resolve expands symlinks and '..' segments, so this
    // catches any traversal that survives the username regex.
    if (!userDir.startsWith(DATA_DIR + path.sep) && userDir !== DATA_DIR) {
        logger.error({ username, sanitizedUsername, userDir, DATA_DIR }, 'Path traversal attempt blocked');
        throw new Error('Invalid username: path traversal detected');
    }

    return userDir;
};

/**
 * Ensure the user's vault directory exists, creating it if necessary.
 *
 * Called only from write operations (saveVault) — read-only paths must
 * never have the side-effect of creating directories.
 */
export const ensureUserDir = (username: string): string => {
    const userDir = getUserDir(username);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
};

// Returns sorted list of vault metadata (newest first)
export const listVaults = (username: string) => {
    const userDir = getUserDir(username);   // read-only — no dir creation
    if (!fs.existsSync(userDir)) return [];

    return fs.readdirSync(userDir)
        .filter((f: string) => f.endsWith('.vault'))
        .map(file => {
            const filePath = path.join(userDir, file);
            const stats = fs.statSync(filePath);

            // Read first character to detect ciphered ({) vs plain array ([)
            let isCiphered = true;
            const fd = fs.openSync(filePath, 'r');
            try {
                const buffer = Buffer.alloc(1);
                fs.readSync(fd, buffer, 0, 1, 0);
                isCiphered = buffer.toString('utf-8') === '{';
            } finally {
                fs.closeSync(fd);
            }

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
    const userDir = ensureUserDir(username);    // write path — create dir if needed
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.vault`;
    const filePath = path.join(userDir, filename);

    let release;
    try {
        release = await lockfile.lock(filePath, { realpath: false });
        fs.writeFileSync(filePath, content);
        return filename;
    } finally {
        if (release) await release();
    }
};

export const getVault = (username: string, filename: string) => {
    const userDir = getUserDir(username);   // read-only
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
    const userDir = getUserDir(username);   // read-only resolution
    const filePath = path.join(userDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};
