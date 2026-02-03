import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { houndMiddleware } from '@tailchi/express';
import { configureHounddog, mark } from '@tailchi/core';
import { prisma } from './db.js';

configureHounddog({
  service: 'api',
  sink: {
    kind: 'jsonl',
    filePath: '.tailchi/events.jsonl',
  },
});

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

app.get('/api/slow', async (_req: Request, res: Response) => {
  await mark('slow.start');
  await new Promise((r) => setTimeout(r, 800));
  await mark('slow.checkpoint', { progress: '25%' });
  await new Promise((r) => setTimeout(r, 800));
  await mark('slow.checkpoint', { progress: '50%' });
  await new Promise((r) => setTimeout(r, 800));
  await mark('slow.checkpoint', { progress: '75%' });
  await new Promise((r) => setTimeout(r, 800));
  await mark('slow.end');
  res.json({ message: 'Slow operation complete', duration: '3.2s' });
});

app.get('/api/parallel', async (_req: Request, res: Response) => {
  await mark('parallel.start');
  const [users, posts, stats] = await Promise.all([
    (async () => {
      await mark('parallel.users.start');
      const result = await prisma.user.count();
      await mark('parallel.users.end');
      return result;
    })(),
    (async () => {
      await mark('parallel.posts.start');
      await new Promise((r) => setTimeout(r, 150));
      await mark('parallel.posts.end');
      return 42;
    })(),
    (async () => {
      await mark('parallel.stats.start');
      await new Promise((r) => setTimeout(r, 200));
      await mark('parallel.stats.end');
      return { views: 1000, clicks: 50 };
    })(),
  ]);
  await mark('parallel.end');
  res.json({ users, posts, stats });
});

app.get('/api/error', async (_req: Request, res: Response) => {
  await mark('error.attempt');
  await new Promise((r) => setTimeout(r, 100));
  await mark('error.fail', { reason: 'simulated failure' });
  res.status(500).json({ error: 'Something went wrong' });
});

app.get('/api/retry', async (_req: Request, res: Response) => {
  for (let i = 1; i <= 3; i++) {
    await mark('retry.attempt', { attempt: i });
    await new Promise((r) => setTimeout(r, 200));
    if (i < 3) {
      await mark('retry.failed', { attempt: i });
    }
  }
  await mark('retry.success');
  res.json({ message: 'Succeeded after 3 attempts' });
});

app.get('/api/nested', async (_req: Request, res: Response) => {
  await mark('nested.start');
  await mark('nested.auth.check');
  await new Promise((r) => setTimeout(r, 50));
  await mark('nested.cache.miss');
  const users = await prisma.user.findMany({ take: 5 });
  await mark('nested.db.fetched', { count: users.length });
  await new Promise((r) => setTimeout(r, 30));
  await mark('nested.transform');
  await new Promise((r) => setTimeout(r, 20));
  await mark('nested.cache.set');
  await mark('nested.end');
  res.json({ users, cached: false });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
