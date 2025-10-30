<p align="center">
  <img src="https://r2.starci.net/protocols/solana.png" width="96" alt="Kani" />
</p>

<h2 align="center">Kani — Automated Liquidity Bot for Ultra-Thin CLMM Ranges</h2>

<p align="center">
Amplify capital efficiency with ultra-thin ranges and a smart exit engine powered by CEX + oracle insights.<br />
Originally built on Sui with the NestJS framework, now evolving toward Solana for lower latency and higher scalability.
</p>

---

### Contents
- Overview
- Architecture & Direction (Sui → Solana)
- Codebase Structure (Monorepo)
- Installation & Quick Start
- Environment Configuration
- Solana Roadmap
- Related Documents

---

### Overview
Kani is an automated liquidity bot designed to open and maintain CLMM (Concentrated Liquidity Market Maker) positions with ultra-thin ranges — maximizing APR as a natural leverage effect.  
The bot uses multi-source data (CEX order books, on-chain data, and oracles) to detect market anomalies and exit positions **before DEX price adjustments occur**.

**Key highlights**
- Ultra-thin ranges updated with low latency.
- Pool scoring based on liquidity depth, volatility, and yield stability.
- Risk module with multi-source triggers (CEX leads, oracle deltas, swap pressure).

---

### Architecture & Direction
- Initially launched on **Sui**, with adapters for: Cetus, Turbos, Momentum, and FlowX.
- Currently migrating to **Solana**, leveraging its high TPS, lower latency, and richer CLMM ecosystem (Raydium, Orca, Meteora).
- Modular architecture: each DEX is implemented as an independent adapter (fetch/metadata/action) dynamically wired through the `DexesModule` and `LiquidityPoolService`.

For full technical details, see `app/ARCHITECTURE.md`.

---

### Codebase Structure (Monorepo)
Key directories under `app/`:

- `src/modules/blockchains/dexes/`: DEX adapters (Sui + Solana)
  - Existing: `cetus/`, `turbos/`, `momentum/`, `flowx/`
  - New (Solana, scaffold): `raydium/`, `orca/`, `meteora/`
- `src/modules/blockchains/dexes/dexes.module.ts`: Dynamic registration of DEXes via `DexId`.
- `src/modules/blockchains/dexes/liquidity-pool.service.ts`: Returns adapter lists by `chainId` (Sui/Solana).
- `src/modules/databases/enums/ids.ts`: Contains all enums such as `DexId`, `ChainId`, etc.
- `src/modules/env/config.ts`: Runtime configuration (DB, RPC, Redis, etc.).

---

### Installation & Quick Start
**Requirements:** Node.js 18+, pnpm/npm, MongoDB/SQLite, Redis (optional), and RPC endpoints (Sui/Solana).

```bash
# Install dependencies (inside app/)
npm install

# Development
npm run start:dev

# Build + Production
npm run build
npm run start:prod

# Lint & Test
npm run lint
npm run test
npm run test:e2e