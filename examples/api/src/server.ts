import express, { type Request, type Response } from 'express';
import { houndMiddleware } from '@hounddog/express';
import { mark } from '@hounddog/core';

const app = express();
app.use(houndMiddleware());

app.get('/api/hello', async (_req: Request, res: Response) => {
  await mark('BE.work.start');
  await new Promise((r) => setTimeout(r, 50));
  await mark('BE.work.end');
  res.json({ message: 'Hello from API' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
