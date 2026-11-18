import 'dotenv/config';
import express from 'express';
import { apiRouter } from './routes/api.ts';

export const app = express();

app.use(express.json({ limit: '2mb' }));

// Mount API routes under /api and root /
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
