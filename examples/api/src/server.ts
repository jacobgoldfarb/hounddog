import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { houndMiddleware } from '@tailchi/express';
import { mark } from '@tailchi/core';
import { prisma } from './db.js';

const app = express();
app.use(cors({ origin: true, exposedHeaders: ['x-hound-flow'] }));
app.use(houndMiddleware());

app.get('/api/hello', async (_req: Request, res: Response) => {
  await mark('work.start');
  await new Promise((r) => setTimeout(r, 50));
  await mark('work.end');
  res.json({ message: 'Hello from API' });
});

app.get('/api/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({ take: 10 });
  res.json({ users });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
