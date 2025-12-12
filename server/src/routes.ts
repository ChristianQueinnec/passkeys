import express from 'express';
import { login, authenticate } from './auth';
import { saveVault, listVaults, getVault, getLatestVault, deleteVault } from './storage';

export const router = express.Router();

router.post('/login', login);

router.use(authenticate);

// Get the latest vault version
router.get('/vault', (req, res) => {
    const user = (req as any).user;
    try {
        const content = getLatestVault(user.username);
        if (content === null) {
            // New user or no vault yet, return empty or specific code
            // Returning 404 might be interpreted as error, let's return null content
            return res.json({ content: null });
        }
        res.json({ content });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Save a new vault version
router.post('/vault', (req, res) => {
    const user = (req as any).user;
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Missing content' });
    }
    // Content is expected to be a JSON string containing { date, data }
    try {
        const filename = saveVault(user.username, content);
        res.json({ success: true, filename });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List vault history
router.get('/vault/history', (req, res) => {
    const user = (req as any).user;
    try {
        const files = listVaults(user.username);
        res.json(files);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get specific version (optional but good for history)
router.get('/vault/history/:filename', (req, res) => {
    const user = (req as any).user;
    const { filename } = req.params;
    try {
        const content = getVault(user.username, filename);
        if (content === null) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ content });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
