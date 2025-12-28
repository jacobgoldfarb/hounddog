Run the API example (Express + Hounddog)

Prereqs:

- Install deps at repo root (to link workspaces)
- Node 18+

Steps:

1. From repo root:
   - pnpm install (or npm install)
2. In one terminal:
   - pnpm --filter hounddog-example-api dev
     or: npm run dev --workspace=hounddog-example-api
3. Hit the endpoint:
   - curl http://localhost:4000/api/hello
4. Inspect flows:
   - cat .hounddog/events.jsonl

What it does:

- The Express middleware creates/propagates a flow, emitting BE.http.start/end.
- The route marks simple work spans to demonstrate intra-request events.
