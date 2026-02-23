# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NEXUS is an autonomous binary options trading platform (1-minute expiry) with real-time signal generation, risk management, and paper/live execution. It's a Turborepo monorepo with three apps and one shared package.

## Commands

### Development
```bash
npm run dev          # Run all apps concurrently (Turbo)
npm run dev:api      # API only (Fastify + tsx watch, port 3001)
npm run dev:web      # Web only (Next.js, port 3000)
npm run build        # Build all apps
npm run lint         # Lint all apps
npm run clean        # Clean all build outputs
```

### Infrastructure
```bash
docker-compose up -d    # Start PostgreSQL (TimescaleDB:5432) + Redis (6379)
docker-compose down     # Stop services
```

### Signal Engine (Python, separate from Turbo)
```bash
cd apps/signal-engine && python main.py   # FastAPI on port 8000
```

### No test framework is configured yet.

## Architecture

### Monorepo Layout
- **`apps/api`** — Fastify 5 backend (TypeScript, ES modules). Entry: `src/server.ts`
- **`apps/web`** — Next.js 15 frontend (React 19, App Router). Uses `@/*` path alias → `./src/*`
- **`apps/signal-engine`** — FastAPI signal generator (Python 3.10+). Not managed by Turbo/npm.
- **`packages/shared`** — `@nexus/shared`: TypeScript types, Zod validation schemas, risk constants. Consumed by both API and web.

### Data Flow
1. Signal Engine generates signals using ICT confluence analysis (liquidity sweeps, order blocks, EMA, killzone filtering) with confidence threshold >= 90
2. Signals are POSTed to the API (`/signals`) with an API key
3. API stores signals in PostgreSQL and broadcasts via Socket.IO (`signal:new`)
4. Web dashboard receives signals in real-time, displays with countdown timers and audio cues
5. Execution service handles trade placement through broker adapters (mock broker by default)
6. Martingale logic: simplified to 1 recovery step with configurable multiplier on loss

### Key Backend Patterns
- **Auth**: JWT with 15-minute access / 7-day refresh tokens via `@fastify/jwt`
- **Database**: PostgreSQL 16 + TimescaleDB, accessed via Drizzle ORM + `postgres` driver (pool max 20)
- **Schema**: 12+ tables defined in `apps/api/src/db/schema.sql`, initialized by docker-compose
- **Routes**: 7 route modules under `src/routes/` (auth, signals, trades, risk, dashboard, users, broker)
- **Services**: Business logic in `src/services/` (execution, signal, risk, martingale, audit)
- **Brokers**: Adapter pattern in `src/brokers/` — `mock.broker.ts` for dev, `pocketoption.broker.ts` stub
- **WebSocket**: Socket.IO events — `signal:new`, `signal:update`, `trade:update`, `martingale:update`
- **Validation**: Zod schemas in `@nexus/shared` for risk profiles, auth, and signals

### Key Frontend Patterns
- **State**: Zustand store (`src/stores/app.store.ts`) with auth, signals, risk, martingale, trades, audio sections
- **Data fetching**: TanStack React Query for server state
- **Real-time**: Socket.IO client (`src/hooks/use-socket.ts`) for live signal/trade updates
- **Charts**: Lightweight Charts (candlesticks), Recharts (equity curves)
- **Audio**: Web Audio API for win/loss cues, toggled via store
- **Styling**: Tailwind CSS 4 with dark mode default

### Risk Management System
Risk profiles are user-configurable with hard guardrails defined in `packages/shared/src/constants/risk.ts`:
- Daily halt on consecutive losses (default 2)
- Weekly drawdown limit (default 15%)
- Max concurrent exposure (default 20%)
- Correlated position limits using 5 correlation groups
- Kill switches for latency (500ms) and spread (3x multiplier)
- News blackout windows (15min before / 5min after)
- Three presets: Conservative (1%), Moderate (3%), Aggressive (5% base risk)

### Environment
Copy `.env.example` to `.env`. Key variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SIGNAL_ENGINE_URL`, `SIGNAL_ENGINE_API_KEY`. The web app uses `NEXT_PUBLIC_` prefixed vars for client-side API/WS URLs.

## Tech Stack
| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React 19, Zustand, TanStack Query, Tailwind CSS 4 |
| Backend | Fastify 5, TypeScript 5.8, Drizzle ORM, Node 20+ |
| Database | PostgreSQL 16 + TimescaleDB, Redis 7 + BullMQ |
| Signal Engine | FastAPI, Pydantic 2, Python 3.10+ |
| Monorepo | Turborepo 2.5, npm workspaces |
| Real-time | Socket.IO |
