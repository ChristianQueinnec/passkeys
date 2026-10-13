import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { sanitizeUsername } from '$lib/server/sanitizer';
import lockfile from 'proper-lockfile';
import settings from './server-settings.json';
import logger from '$lib/server/logger';

const DATA_DIR = path.resolve(process.cwd(), settings.storage.dataDir);

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const getUserDir = (username: string): string => {
    const sanitizedUsername = sanitizeUsername(username);
    const userDir = path.resolve(DATA_DIR, sanitizedUsername);

    if (!userDir.startsWith(DATA_DIR + path.sep) && userDir !== DATA_DIR) {
        logger.error({ username, sanitizedUsername, userDir, DATA_DIR }, 'Path traversal attempt blocked');
        throw new Error('Invalid username: path traversal detected');
    }

    return userDir;
};

export const ensureUserDir = async (username: string): Promise<string> => {
    const userDir = getUserDir(username);
    await fsp.mkdir(userDir, { recursive: true });
    return userDir;
};

export const listVaults = async (username: string) => {
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

export const saveVault = async (username: string, content: string): Promise<string> => {
    const userDir = await ensureUserDir(username);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${crypto.randomBytes(4).toString('hex')}.vault`;
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
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    try {
        return await fsp.readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
};

export const getLatestVault = async (username: string): Promise<string | null> => {
    const vaults = await listVaults(username);
    if (vaults.length === 0) return null;
    return getVault(username, vaults[0].name);
};

export const deleteVault = async (username: string, filename: string): Promise<void> => {
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    try {
        await fsp.unlink(filePath);
    } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
    }
};
