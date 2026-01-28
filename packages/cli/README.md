# @tailchi/cli

CLI for tailing tailchi flows in real-time.

## Installation

```bash
npm install -g @tailchi/cli
```

## Usage

```bash
# Tail the default events file
tailchi tail

# Tail a specific file
tailchi tail .hounddog/events.jsonl

# Tail from the beginning
tailchi tail --from-start

# Custom clock daemon port
tailchi tail --clock-port 8888
```

## Output

```
🥋 tailchi
clock daemon: http://localhost:9999/clock
watching: .hounddog/events.jsonl

┌──────────────────────────────────────────────────────────┐
│ Flow get-users started                                   │
├──────────────────────────────────────────────────────────┤
│ 👤 usr.button.click                              +0ms
│ 📤 out.http.sent url=http://localhost:4000/api   +3ms
│ 📥 in.http.received GET path=/api/users          +5ms
│ 💾 db.findMany table=User                        +0ms
│ 💾 db.findMany.done table=User (12ms)           +12ms
│ 📤 out.http.responded 200 (15ms)                 +3ms
│ 📥 in.http.response 200 (23ms)                   +5ms
└──────────────────────────────────────────────────────────┘
```

## Clock Daemon

The CLI automatically starts a clock daemon on port 9999. Services can sync to this for accurate cross-service timing:

```typescript
configureHounddog({
  service: 'api',
  clockDaemon: 'http://localhost:9999',
});
```

## Icons

| Icon | Label | Meaning |
|------|-------|---------|
| 👤 | usr | User interaction |
| 📤 | out | Outgoing HTTP |
| 📥 | in | Incoming HTTP |
| 💾 | db | Database |
| 🔧 | wrk | Generic work |
| 📬 | que | Queue/Job |
| 📦 | cch | Cache |
| 🔐 | ath | Auth |
| ❌ | err | Error |
| 💬 | inf | Info |
