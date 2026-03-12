# Kani — Automated Liquidity Bot for CLMM & DLMM

<p align="center">
  <img src="https://r2.kanibot.xyz/protocols/solana.png" width="96" alt="Kani" />
</p>

<p align="center">
  Amplify capital efficiency with ultra-thin ranges and a smart exit engine powered by CEX + oracle insights.<br />
  Built with NestJS; supports <strong>Sui</strong> (Cetus, Turbos, Momentum, FlowX) and <strong>Solana</strong> (Raydium, Orca, Meteora).
</p>

---

## Contents

- [Overview](#overview)
- [Applications (Monorepo)](#applications-monorepo)
- [Codebase structure](#codebase-structure)
- [Installation & quick start](#installation--quick-start)
- [Environment configuration](#environment-configuration)
- [Related documents](#related-documents)

---

## Overview

Kani is an automated liquidity bot that opens and maintains **CLMM** (Concentrated Liquidity Market Maker) and **DLMM** (Dynamic Liquidity Market Maker) positions with ultra-thin ranges to maximize APR. It uses multi-source data (CEX order books, on-chain data, oracles) to detect market moves and exit positions before DEX price fully adjusts.

**Highlights**

- Ultra-thin ranges with low-latency updates.
- Pool scoring (liquidity depth, volatility, yield stability).
- Risk logic with CEX leads, oracle deltas, and swap pressure.
- Modular DEX adapters per chain; CEX feeds (Binance, Gate, Bybit) and oracles (Pyth, CoinGecko, CoinMarketCap).

---

## Applications (Monorepo)

Applications live under `apps/` and share `src/modules` and `src/features`:

| App | Description |
|-----|-------------|
| **kani-executor** | Runs bots: open/close position workers, reconcile balance, withdraw. Subscribes to CLMM/DLMM sync events (NATS), enqueues BullMQ jobs. |
| **kani-coordinator** | Orchestrates executors (e.g. Kubernetes), load balancing, event fan-out. Uses NATS, Redis, MongoDB. |
| **kani-interface** | User-facing API: GraphQL (Apollo), REST, auth (Passport, Privy, TOTP). Manages bots, pools, keypairs. |
| **kani-observer** | Observability and monitoring. |
| **kani-inspector** | Inspection and debugging utilities. |
| **kani-algorithm-tests** | Algorithm and math tests (CLMM/DLMM, RPC). |

Default ports (overridable via env): **Interface** 3001, **Coordinator** 3002, **Executor** 3003.

---

## Codebase structure

```
kani/
├── apps/                    # NestJS applications
│   ├── kani-executor/       # Bot runtime (workers, runtimes, handlers)
│   ├── kani-coordinator/    # Executor orchestration, K8s
│   ├── kani-interface/      # GraphQL + REST API
│   ├── kani-cli/            # CLI (db, keys)
│   └── ...
├── src/
│   ├── modules/             # Shared modules
│   │   ├── blockchains/     # DEX adapters, balance, signers, formulas, price-feeds, tx-builder
│   │   ├── databases/       # MongoDB (primary), schemas, enums (DexId, TokenId, …)
│   │   ├── event/           # Event emitter + NATS
│   │   ├── env/             # Runtime config (envConfig)
│   │   ├── winston/         # Logging (Loki, levels, message types)
│   │   ├── bullmq/          # Queues (open-position, close-position, reconcile-balance, withdraw)
│   │   └── ...
│   └── features/            # Feature domains
│       ├── executor/        # Loaders, runtimes (handle open/close/not-synced), workers
│       ├── coordinator/     # Loaders, runtimes, K8s integration
│       ├── interface/       # GraphQL resolvers, REST, auth
│       └── cli/             # Commands (database, key)
├── scripts/                 # Shell/PowerShell scripts
├── .containers/             # Container / K8s manifests
└── package.json
```

**DEX adapters** (`src/modules/blockchains/dexes/`): Cetus, Turbos, Momentum, FlowX (Sui); Raydium, Orca, Meteora (Solana). Wired via `DexesModule` and `DexId` in `src/modules/databases/mongodb/primary/enums/ids.ts`.

**Executor flow**: Diagnostics sync CLMM/DLMM pools → events (e.g. `ClmmLiquidityPoolsSynced`) → runtimes (e.g. `HandleOpenPositionService`) → BullMQ (open/close position, reconcile balance) → workers execute on-chain actions.

---

## Installation & quick start

**Requirements:** Node.js 18+, npm/pnpm, **MongoDB**, **Redis** (cache, BullMQ, lock authority), **NATS** (coordinator/executor events). RPC endpoints for Sui and/or Solana as needed.

```bash
# Install dependencies (project root)
npm install

# Development (single app, e.g. executor)
npx nest start kani-executor --watch

# Or build and run production
npm run build
node dist/apps/kani-executor/main    # or kani-coordinator, kani-interface

# CLI (e.g. database seed)
npm run cli
```

**Lint & tests**

```bash
npm run lint
npm run test
npm run test:e2e
```

---

## Environment configuration

Configuration is built from environment variables in `src/modules/env/config.ts` (via `envConfig()`). Main areas:

- **Ports:** `KANI_INTERFACE_PORT` (3001), `KANI_COORDINATOR_PORT` (3002), `KANI_EXECUTOR_PORT` (3003).
- **Databases:** MongoDB primary (connection, seed, in-memory storage flags).
- **Redis:** Cache, BullMQ, lock authority, throttler (instance keys in config).
- **NATS:** Servers (e.g. `nats://localhost:4222`), subjects (e.g. `ClmmLiquidityPoolsSynced`, `DlmmLiquidityPoolsSynced`), reconnect, ping.
- **Executor:** `executor.id` for instance identity, runtime/operation cooldowns (e.g. reconcile balance rescan).
- **RPC / CEX / Oracles:** Per-module (blockchains, cexes, price-feeds) timeouts, retries, API keys (prefer env/secrets, not hardcoded).

See `src/modules/env/` for the full schema and defaults.

---

## Related documents

- **README.Docker.md** — Building and running with Docker.
- **.containers/** — Kubernetes/manifest examples for deployment.
