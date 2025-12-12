"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.getUsers = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const USERS_FILE = path_1.default.join(__dirname, '../../data/users.json');
const getUsers = () => {
    if (!fs_1.default.existsSync(USERS_FILE)) {
        return [];
    }
    const content = fs_1.default.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content);
};
exports.getUsers = getUsers;
const getUser = (username) => {
    const users = (0, exports.getUsers)();
    return users.find((u) => u.username === username);
};
exports.getUser = getUser;
