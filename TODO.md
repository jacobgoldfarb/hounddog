# TODO — Hound Dog 🐕

Hounddog is a request-monitoring tool for local development.

---

## 0) Repo + Packaging Skeleton

- [ ] Create monorepo layout
  - [ ] `packages/core`
  - [ ] `packages/express`
  - [ ] `packages/fetch`
  - [ ] `packages/prisma`
  - [ ] `packages/cli`
  - [ ] `examples/` (minimal FE+BE demo)
- [ ] Decide build tooling (tsup / rollup / tsc) and publish setup
- [ ] Set up lint/format/test baseline (eslint, prettier, vitest/jest)

---

## 1) Lock the Contracts (Do Not Build Adapters Before This)

- [ ] Define event model (JSON schema-ish)
  - [ ] required fields: `flowId`, `type`, `ts`, `service`, `subsystem`
  - [ ] optional: `durationMs`, `status`, `attrs`, `spanId`, `parentSpanId`
  - [ ] naming conventions for `type` and `attrs`
- [ ] Define flow lifecycle rules
  - [ ] what constitutes START/END for each flow root (UI action, HTTP request, job, manual run)
  - [ ] partial flows (crash / abort) and how they’re represented
- [ ] Define propagation rules
  - [ ] header name(s): `x-hound-flow` (and future-proofing for spans)
  - [ ] how to handle missing/invalid incoming flow IDs
- [ ] Define redaction + safety defaults (PII avoidance)
  - [ ] “never log bodies/params by default”
  - [ ] URL query stripping default behavior

---

## 2) Core Runtime (Minimal Public API, Internal Plumbing)

- [ ] Implement `@hounddog/core`
  - [ ] Public API:
    - [ ] `mark(name, attrs?)`
    - [ ] `span(name, fn, attrs?)`
    - [ ] `run(name, fn, attrs?)` (flow root for cron/CLI/tests)
    - [ ] `getFlowId()`
  - [ ] Internal adapter API:
    - [ ] `withFlow(ctx, fn)` (AsyncLocalStorage bridge in Node; best-effort in browser)
    - [ ] `emit(event)` (append-only event emission)
    - [ ] `makeFlowId()` (fast, collision-safe)
- [ ] Implement sinks (start with local JSONL)
  - [ ] file sink writer (append-only)
  - [ ] concurrency strategy (multi-process): simple + safe
  - [ ] rotation/retention strategy (basic defaults)
- [ ] Config system
  - [ ] enabled/disabled
  - [ ] service name
  - [ ] redaction options
  - [ ] orphan mark behavior (default: drop/no-op + warn once)

---

## 3) Frontend Root: UI Actions (Answer “button kicked off flow”)

- [ ] Add `hound.action(name, fn, attrs?)` (alias of `run` with subsystem metadata)
- [ ] React helper(s) (optional but useful)
  - [ ] `useHoundAction(name, fn)` returning stable callback
- [ ] Decide minimal UI metadata captured (safe defaults)
  - [ ] action name
  - [ ] route/path (optional)
  - [ ] avoid element text capture by default

---

## 4) Fetch Interface Adapter (FE → BE boundary)

- [ ] Implement `@hounddog/fetch`
  - [ ] `houndFetch(baseFetch)` returns instrumented fetch
  - [ ] header injection (`x-hound-flow`)
  - [ ] `FE.http.start/end` events with duration + status
  - [ ] URL normalization + query stripping default
- [ ] Optional dev-only convenience
  - [ ] `patchFetch()` to replace `globalThis.fetch` (opt-in)

---

## 5) Express Interface Adapter (BE HTTP boundary)

- [ ] Implement `@hounddog/express`
  - [ ] middleware extracts/creates `flowId`
  - [ ] enters ALS context for request lifetime
  - [ ] emits `BE.http.start/end` with duration + status
  - [ ] sets response header `x-hound-flow` (opt-in, default on in dev)
  - [ ] handles `finish/close/error` reliably
- [ ] Route naming strategy (optional)
  - [ ] best-effort route pattern support (`/users/:id`) without heavy hooks

---

## 6) Prisma Interface Adapter (BE → DB boundary)

- [ ] Implement `@hounddog/prisma`
  - [ ] Prisma `$use` middleware emits `DB.query.start/end`
  - [ ] default attrs: `model`, `action`, `durationMs`
  - [ ] safe options:
    - [ ] `includeArgs` default false
    - [ ] redactor hook
- [ ] Optional advanced mode (explicit opt-in)
  - [ ] Prisma `$on('query')` integration (query text) behind a flag with strong warnings

---

## 7) CLI (Make It Feel Like the Product)

- [ ] Implement `@hounddog/cli`
  - [ ] `hound flows last [-n]`
  - [ ] `hound flows show <flowId>`
  - [ ] `hound flows search --marker <name>`
- [ ] Implement rendering format
  - [ ] bordered boxes per flow
  - [ ] per-line: short name, `+Δms since last hop`, START/END markers
  - [ ] ordering rules:
    - [ ] events ordered within a flow
    - [ ] flows not globally ordered (explicitly state this)
- [ ] Flow assembly logic
  - [ ] parse JSONL events
  - [ ] group by `flowId`
  - [ ] compute hop deltas
  - [ ] handle partial flows (missing END)

---

## 8) Example App + “Demo-ability”

- [ ] `examples/web` (React)
  - [ ] button wrapped in `hound.action(...)`
  - [ ] uses instrumented fetch
- [ ] `examples/api` (Express + Prisma)
  - [ ] express middleware
  - [ ] prisma adapter
- [ ] One script that runs both and prints “try clicking checkout”

---

## 9) Tests + Reliability (Don’t Ship a Liar)

- [ ] Core invariants
  - [ ] mark/span attach to correct flow under concurrency (Node)
  - [ ] spans close on error paths
- [ ] Adapter behavior tests
  - [ ] Express emits end on `finish` and on `close`
  - [ ] Fetch wrapper sets headers correctly for `Request` vs string URL
  - [ ] Prisma adapter emits expected model/action timing
- [ ] CLI golden output tests (snapshot-like)
- [ ] Performance sanity checks (overhead baseline)

---

## 10) Docs (Anti-HN, Honest, Clear)

- [ ] README (Anti-HN version)
- [ ] “How it works” page (flow model + boundaries)
- [ ] “Browser limitations” page (best-effort, no monkeypatching)
- [ ] “PII + redaction” guidance
- [ ] Copy/paste integration snippets for each adapter

---

## 11) Post-MVP (Only After MVP Is Loved)

- [ ] Queue adapter (BullMQ or generic)
- [ ] Node outbound HTTP client adapter (server-to-third-party)
- [ ] Optional OTLP export
- [ ] Flow diff tooling (compare two flows)
- [ ] Smarter grouping/search
