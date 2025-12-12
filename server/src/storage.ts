import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const getUserDir = (username: string) => {
    const userDir = path.join(DATA_DIR, username);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
};

// Returns sorted list of vault filenames (newest first)
export const listVaults = (username: string) => {
    const userDir = getUserDir(username);
    return fs.readdirSync(userDir)
        .filter(f => f.endsWith('.vault')) // Filter for vault files
        .map(file => {
            const stats = fs.statSync(path.join(userDir, file));
            return {
                name: file,
                size: stats.size,
                mtime: stats.mtime
            };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};

export const saveVault = (username: string, content: string): string => {
    const userDir = getUserDir(username);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.vault`;
    fs.writeFileSync(path.join(userDir, filename), content);
    return filename;
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
