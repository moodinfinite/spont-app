---
name: spont-dev-server
description: Use when asked to start, stop, or check the Spont dev server (Next.js app at localhost:3000) — starts it safely in the background and verifies it's actually up, avoiding the foreground-blocking mistake that has stalled sessions in this repo before.
---

# Spont Dev Server

Starting `npm run dev` in the foreground blocks forever — it has stalled
multiple prior sessions in this repo, including ones that got killed by
a watchdog after 10 minutes with an orphaned server process left running.
Always use the background approach below.

## Starting the server

1. From the repository root, confirm `.env` exists (`cp .env.example
   .env` if not) and Postgres is reachable — either via `docker compose up -d`
   (if Docker is available) or an already-running local Postgres
   matching `DATABASE_URL` in `.env` (see
   `docs/knowledge-base/references.md` for why a local Postgres
   substitute was used during this repo's initial build, in
   environments without Docker).
2. Start the dev server as a background process (use your tool's
   background-execution option — never run it as a plain blocking
   foreground command):
   ```bash
   npm run dev
   ```
3. Poll `http://localhost:3000` with `curl -sI http://localhost:3000`
   every few seconds until it responds (usually 3-8 seconds). Don't
   guess a fixed sleep and assume it's ready.
4. Report the server is up and give the contributor the URL.

## Stopping the server

```bash
lsof -ti tcp:3000 | xargs kill
```

Confirm it's actually gone before finishing anything that depended on
it:

```bash
lsof -ti tcp:3000   # should print nothing
ps aux | grep -E "next dev|next-server" | grep -v grep   # should print nothing
```

Don't just claim it's stopped — show the confirming output.
