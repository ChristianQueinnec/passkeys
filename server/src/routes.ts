import express from 'express';
import { login, authenticate } from './auth';
import { saveFile, listFiles, getFile, deleteFile } from './storage';

export const router = express.Router();

router.post('/login', login);

router.use(authenticate);

router.get('/files', (req, res) => {
    const user = (req as any).user;
    try {
        const files = listFiles(user.username);
        res.json(files);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/files', (req, res) => {
    const user = (req as any).user;
    const { filename, content } = req.body;
    if (!filename || !content) {
        return res.status(400).json({ error: 'Missing filename or content' });
    }
    try {
        saveFile(user.username, filename, content);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/files/:filename', (req, res) => {
    const user = (req as any).user;
    const { filename } = req.params;
    try {
        const content = getFile(user.username, filename);
        if (content === null) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ content });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/files/:filename', (req, res) => {
    const user = (req as any).user;
    const { filename } = req.params;
    try {
        deleteFile(user.username, filename);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
