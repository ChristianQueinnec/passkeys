"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.getFile = exports.saveFile = exports.listFiles = exports.getUserDir = void 0;
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
const listFiles = (username) => {
    const userDir = (0, exports.getUserDir)(username);
    return fs_1.default.readdirSync(userDir).map(file => {
        const stats = fs_1.default.statSync(path_1.default.join(userDir, file));
        return {
            name: file,
            size: stats.size,
            mtime: stats.mtime
        };
    });
};
exports.listFiles = listFiles;
const saveFile = (username, filename, content) => {
    const userDir = (0, exports.getUserDir)(username);
    fs_1.default.writeFileSync(path_1.default.join(userDir, filename), content);
};
exports.saveFile = saveFile;
const getFile = (username, filename) => {
    const userDir = (0, exports.getUserDir)(username);
    const filePath = path_1.default.join(userDir, filename);
    if (!fs_1.default.existsSync(filePath))
        return null;
    return fs_1.default.readFileSync(filePath, 'utf-8');
};
exports.getFile = getFile;
const deleteFile = (username, filename) => {
    const userDir = (0, exports.getUserDir)(username);
    const filePath = path_1.default.join(userDir, filename);
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
};
exports.deleteFile = deleteFile;
