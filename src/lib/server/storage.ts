import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { sanitizeUsername } from '$lib/server/sanitizer';
import lockfile from 'proper-lockfile';
import settings from './server-settings.json';
import logger from '$lib/server/logger';
import * as googleDriveStorage from '$lib/server/google-drive-storage';

const DATA_DIR = path.resolve(process.cwd(), settings.storage.dataDir);
const USE_GOOGLE_DRIVE = (process.env.STORAGE_PROVIDER ?? settings.storage.provider) === 'google-drive';

// Ensure DATA_DIR exists at module load time (synchronous — happens once).
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

    if (!userDir.startsWith(DATA_DIR + path.sep) && userDir !== DATA_DIR) {
        logger.error({ username, sanitizedUsername, userDir, DATA_DIR }, 'Path traversal attempt blocked');
        throw new Error('Invalid username: path traversal detected');
    }

    return userDir;
};

/**
 * Ensure the user's vault directory exists, creating it if necessary.
 * Called only from write operations (saveVault).
 */
export const ensureUserDir = async (username: string): Promise<string> => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.ensureUserFolder(username);
    const userDir = getUserDir(username);
    await fsp.mkdir(userDir, { recursive: true });
    return userDir;
};

/**
 * List vault metadata for a user, sorted newest-first.
 */
export const listVaults = async (username: string) => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.listVaults(username);
    const userDir = getUserDir(username);

    try {
        await fsp.access(userDir);
    } catch {
        return [];
    }

    const files = (await fsp.readdir(userDir)).filter(f => f.endsWith('.vault'));

    const entries = await Promise.all(files.map(async file => {
        const filePath = path.join(userDir, file);
        const stats = await fsp.stat(filePath);

        // Read the first byte to detect ciphered ({) vs unciphered ([).
        let isCiphered = true;
        const fh = await fsp.open(filePath, 'r');
        try {
            const buf = Buffer.alloc(1);
            await fh.read(buf, 0, 1, 0);
            isCiphered = buf.toString('utf-8') === '{';
        } finally {
            await fh.close();
        }

        return { name: file, size: stats.size, mtime: stats.mtime, isCiphered };
    }));

    return entries.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};

/**
 * Save vault content.  Uses a random suffix to prevent same-millisecond
 * filename collisions (fixes report finding #17 / N10).
 */
export const saveVault = async (username: string, content: string): Promise<string> => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.saveVault(username, content);
    const userDir = await ensureUserDir(username);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = crypto.randomBytes(4).toString('hex');
    const filename = `${timestamp}-${suffix}.vault`;
    const filePath = path.join(userDir, filename);

    let release: (() => Promise<void>) | undefined;
    try {
        release = await lockfile.lock(filePath, { realpath: false });
        await fsp.writeFile(filePath, content, 'utf-8');
        return filename;
    } finally {
        if (release) await release();
    }
};

export const getVault = async (username: string, filename: string): Promise<string | null> => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.getVault(username, filename);
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    try {
        return await fsp.readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
};

export const getLatestVault = async (username: string): Promise<string | null> => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.getLatestVault(username);
    const vaults = await listVaults(username);
    if (vaults.length === 0) return null;
    return getVault(username, vaults[0].name);
};

export const deleteVault = async (username: string, filename: string): Promise<void> => {
    if (USE_GOOGLE_DRIVE) return googleDriveStorage.deleteVault(username, filename);
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    try {
        await fsp.unlink(filePath);
    } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
        // File already gone — treat as success.
    }
};
