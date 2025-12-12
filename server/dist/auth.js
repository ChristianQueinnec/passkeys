"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.login = void 0;
const users_1 = require("./users");
const login = (req, res) => {
    const { username, password } = req.body;
    const user = (0, users_1.getUser)(username);
    if (user && user.password === password) {
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
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        const user = (0, users_1.getUser)(username);
        if (user && user.password === password) {
            req.user = user;
            next();
        }
        else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    catch (e) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
};
exports.authenticate = authenticate;
