"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.login = void 0;
// For MVP, we use a hardcoded user
const MOCK_USER = {
    username: 'admin',
    password: 'password' // In a real app, this should be hashed
};
const login = (req, res) => {
    const { username, password } = req.body;
    if (username === MOCK_USER.username && password === MOCK_USER.password) {
        // Simple token for MVP (base64 of username:password)
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return res.json({ token, username });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
};
exports.login = login;
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (token === Buffer.from(`${MOCK_USER.username}:${MOCK_USER.password}`).toString('base64')) {
        req.user = MOCK_USER;
        next();
    }
    else {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
