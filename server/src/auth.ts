import { Request, Response, NextFunction } from 'express';
import { getUser } from './users';
import { verifyPassword } from './crypto-utils';

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user = getUser(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const [salt, hash] = user.password.split(':');
        const isValid = await verifyPassword(password, hash, salt);

        if (isValid) {
            // Simple token for MVP (base64 of username:password(hash)) - maintaining same token structure for simplicity
            // In real app, issue JWT. Here we stick to basic token.
            const token = Buffer.from(`${username}:${user.password}`).toString('base64');
            return res.json({ token, username });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (e) {
        return res.status(500).json({ error: 'Internal Error' });
    }
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, ...rest] = decoded.split(':');
        const passwordHash = rest.join(':'); // Rejoin in case hash has colons (unlikely with hex)

        const user = getUser(username);

        if (user && user.password === passwordHash) {
            (req as any).user = user;
            next();
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
};
