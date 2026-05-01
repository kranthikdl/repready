# RepReady

Real-time AI coaching demo for SDR readiness. See `replit.md` for the full architecture and feature overview.

## Getting Started

```bash
npm install
npm run dev
```

## Running Tests

This project uses [Vitest](https://vitest.dev) (chosen because the codebase already builds with Vite, giving us zero-config integration with the existing TypeScript path aliases). Tests live alongside source code in `__tests__/` folders or as `*.test.ts` / `*.test.tsx` files inside `client/`, `server/`, and `shared/`. The single `vitest.config.ts` at the repo root drives discovery for all three modules — there is no per-module runner config.

```bash
npm test              # one-shot run (CI mode), exits non-zero on any failure
npm run test:watch    # interactive watch mode for local development
npm run test:coverage # run once and emit text + html + lcov coverage reports
```

The empty / smoke-only suite completes in well under 10 seconds. New tests should be added next to the code they cover so they pick up the same alias resolution (`@/...`, `@shared/...`) as the runtime build.

## Project Layout

- `client/` — React + Vite frontend
- `server/` — Express + WebSocket backend
- `shared/` — Types and Zod schemas shared by client and server
- `shared/__tests__/smoke.test.ts` — proves the runner is wired up
