import { Request, Response, NextFunction } from 'express';
import { getUser } from './users';

export const login = (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = getUser(username);

    if (user && user.password === password) {
        // Simple token for MVP (base64 of username:password)
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return res.json({ token, username });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');
        const user = getUser(username);

        if (user && user.password === password) {
            (req as any).user = user;
            next();
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
};
