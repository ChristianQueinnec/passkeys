"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVault = exports.getLatestVault = exports.getVault = exports.saveVault = exports.listVaults = exports.getUserDir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(__dirname, '../../data');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
const getUserDir = (username) => {
    const userDir = path_1.default.join(DATA_DIR, username);
    if (!fs_1.default.existsSync(userDir)) {
        fs_1.default.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
};
exports.getUserDir = getUserDir;
// Returns sorted list of vault filenames (newest first)
const listVaults = (username) => {
    const userDir = (0, exports.getUserDir)(username);
    return fs_1.default.readdirSync(userDir)
        .filter(f => f.endsWith('.vault')) // Filter for vault files
        .map(file => {
        const stats = fs_1.default.statSync(path_1.default.join(userDir, file));
        return {
            name: file,
            size: stats.size,
            mtime: stats.mtime
        };
    })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};
exports.listVaults = listVaults;
const saveVault = (username, content) => {
    const userDir = (0, exports.getUserDir)(username);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.vault`;
    fs_1.default.writeFileSync(path_1.default.join(userDir, filename), content);
    return filename;
};
exports.saveVault = saveVault;
const getVault = (username, filename) => {
    const userDir = (0, exports.getUserDir)(username);
    const filePath = path_1.default.join(userDir, filename);
    if (!fs_1.default.existsSync(filePath))
        return null;
    return fs_1.default.readFileSync(filePath, 'utf-8');
};
exports.getVault = getVault;
const getLatestVault = (username) => {
    const vaults = (0, exports.listVaults)(username);
    if (vaults.length === 0)
        return null;
    return (0, exports.getVault)(username, vaults[0].name);
};
exports.getLatestVault = getLatestVault;
const deleteVault = (username, filename) => {
    const userDir = (0, exports.getUserDir)(username);
    const filePath = path_1.default.join(userDir, filename);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
};
exports.deleteVault = deleteVault;
