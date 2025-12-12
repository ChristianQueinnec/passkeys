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

export const listFiles = (username: string) => {
    const userDir = getUserDir(username);
    return fs.readdirSync(userDir).map(file => {
        const stats = fs.statSync(path.join(userDir, file));
        return {
            name: file,
            size: stats.size,
            mtime: stats.mtime
        };
    });
};

export const saveFile = (username: string, filename: string, content: string) => {
    const userDir = getUserDir(username);
    fs.writeFileSync(path.join(userDir, filename), content);
};

export const getFile = (username: string, filename: string) => {
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
};

export const deleteFile = (username: string, filename: string) => {
    const userDir = getUserDir(username);
    const filePath = path.join(userDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};
