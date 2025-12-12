"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("./auth");
const storage_1 = require("./storage");
exports.router = express_1.default.Router();
exports.router.post('/login', auth_1.login);
exports.router.use(auth_1.authenticate);
exports.router.get('/files', (req, res) => {
    const user = req.user;
    try {
        const files = (0, storage_1.listFiles)(user.username);
        res.json(files);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.post('/files', (req, res) => {
    const user = req.user;
    const { filename, content } = req.body;
    if (!filename || !content) {
        return res.status(400).json({ error: 'Missing filename or content' });
    }
    try {
        (0, storage_1.saveFile)(user.username, filename, content);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.get('/files/:filename', (req, res) => {
    const user = req.user;
    const { filename } = req.params;
    try {
        const content = (0, storage_1.getFile)(user.username, filename);
        if (content === null) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.router.delete('/files/:filename', (req, res) => {
    const user = req.user;
    const { filename } = req.params;
    try {
        (0, storage_1.deleteFile)(user.username, filename);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
