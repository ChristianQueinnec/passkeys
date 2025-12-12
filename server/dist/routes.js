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
// Get the latest vault version
exports.router.get('/vault', (req, res) => {
    const user = req.user;
    try {
        const content = (0, storage_1.getLatestVault)(user.username);
        if (content === null) {
            // New user or no vault yet, return empty or specific code
            // Returning 404 might be interpreted as error, let's return null content
            return res.json({ content: null });
        }
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Save a new vault version
exports.router.post('/vault', (req, res) => {
    const user = req.user;
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Missing content' });
    }
    try {
        const filename = (0, storage_1.saveVault)(user.username, content);
        res.json({ success: true, filename });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// List vault history
exports.router.get('/vault/history', (req, res) => {
    const user = req.user;
    try {
        const files = (0, storage_1.listVaults)(user.username);
        res.json(files);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get specific version (optional but good for history)
exports.router.get('/vault/history/:filename', (req, res) => {
    const user = req.user;
    const { filename } = req.params;
    try {
        const content = (0, storage_1.getVault)(user.username, filename);
        if (content === null) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
