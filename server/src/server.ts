import express from 'express';
import cors from 'cors';
import { router } from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/api', router);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
