Run the API example (Express + Hounddog + Prisma)

Prereqs:

- Install deps at repo root (to link workspaces)
- Node 18+
- PostgreSQL running locally

Steps:

1. From repo root: `pnpm install`
2. Set up the database:
   ```
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hounddog_demo"
   cd examples/api
   npx prisma db push
   ```
3. Run the server: `pnpm --filter hounddog-example-api dev`
4. Hit the endpoints:
   - `curl http://localhost:4000/api/hello`
   - `curl http://localhost:4000/api/users`
5. Inspect flows: `cat .hounddog/events.jsonl`

What it does:

- The Express middleware creates/propagates a flow, emitting http.received/responded.
- The /api/hello route marks simple work spans.
- The /api/users route queries the database with instrumented Prisma, emitting db.* events.
