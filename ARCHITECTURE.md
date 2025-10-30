## Kani Architecture Overview

Kani is an automated liquidity bot that manages ultra-thin CLMM ranges and executes proactive risk actions using signals from CEXs and on-chain/oracle data. The system was originally built on Sui and is now shifting focus to Solana for production scale and latency advantages.

### Why shift from Sui to Solana
- **Throughput & Latency**: Solana offers extremely low-latency confirmation and high TPS, ideal for ultra-thin range rebalancing and rapid exits.
- **Ecosystem Depth**: Rich set of CLMM DEXes (Raydium, Orca, Meteora) and mature infra (RPC providers, indexers, MEV infra).
- **Account Model Fit**: Precise account specification enables deterministic, batched CLMM ops and predictable compute.

### High-level components
- **Interfaces layer** (`app/src/modules/blockchains/interfaces`): Contracts for metadata, fetching, and actions (`IMetadataService`, `IFetchService`, `IActionService`).
- **DEX adapters** (`app/src/modules/blockchains/dexes`): One module per DEX, providing concrete implementations. Existing Sui DEXes (Cetus, Turbos, Momentum, FlowX) and new Solana DEXes (Raydium, Orca, Meteora – placeholders now).
- **Liquidity router** (`LiquidityPoolService`): Discovers enabled DEXes for a given `chainId` and exposes fetch/metadata/action handles for orchestration.
- **Data ingestion**: RPC event/tick/pool-state ingestion and aggregation of external prices (CEX + oracle). Used by scoring and risk engines.
- **Scoring engine**: Ranks pools by liquidity depth, volatility, stability, and expected yield efficiency.
- **Allocation + Rebalancer**: Opens and maintains ultra-thin CLMM ranges; shifts capital across pools as scores change.
- **Risk module**: Preemptively exits or hedges positions based on anomaly signals (CEX order flow, funding, oracle deltas, on-chain swaps).

### Current code structure (selected)
- `app/src/modules/blockchains/dexes/dexes.module.ts`: Dynamic assembly of enabled DEX modules.
- `app/src/modules/blockchains/dexes/liquidity-pool.service.ts`: Returns the set of DEX adapters filtered by `chainId`.
- `app/src/modules/databases/enums/ids.ts`: Canonical enums (`ChainId`, `DexId`, tokens, pools, etc.). Added `raydium`, `orca`, `meteora` for Solana.
- `app/src/modules/blockchains/dexes/{cetus|turbos|momentum|flowx}`: Sui integrations.
- `app/src/modules/blockchains/dexes/{raydium|orca|meteora}`: Solana integrations (scaffolds ready; fetch/actions are intentionally unimplemented placeholders for hack/testing).

### Data flow
1. **Ingest**: Subscribe to Solana RPC for pool/tick/swap updates; poll/index where needed. Pull CEX and oracle prices in parallel.
2. **Normalize**: Convert feeds to unified internal types with consistent timestamps and asset identifiers.
3. **Score**: Evaluate pools using depth, slippage, realized volatility, and fee-yield stability; penalize stale/or noisy feeds.
4. **Allocate**: Route capital to top-scoring pools; open ultra-thin ranges with tight bounds; maintain target deltas.
5. **Monitor & Act**: If multi-source signals turn adverse, trigger risk exits or hedges before DEX repricing.

### Ultra-thin ranges on CLMMs
- Very narrow ranges maximize fee APR via effective leverage but require precise, low-latency updates.
- On Solana, providing the exact accounts and parameters enables efficient program invocations for opens/rebalances/exits.

### Multi-source detection and risk
- Signals: CEX order flow and price leads, oracle movements, on-chain swap pressure and tick drifts.
- When signals align (e.g., negative funding + large sell walls + falling oracles), the risk engine withdraws or flips exposure ahead of DEX price updates.

### Migration state
- Sui adapters are production-hardened.
- Solana adapters (Raydium, Orca, Meteora) are scaffolded and wired into the module graph; fetchers/actions are WIP and currently throw by design for hack testing.

### Operator guidance
- Enable/disable DEXes via `DexId` lists in `DexesModule.register({ dexes, isGlobal })`.
- Select chain via `ChainId` and query `LiquidityPoolService.getDexs({ chainId })` to obtain adapter handles.
- Plug ingestion/scoring/risk engines to drive `IActionService` executions.

## Technical narrative (from the founder)

Hello, today I’ll explain Kani’s technical concepts.
Kani is an automated liquidity bot that amplifies your capital with ultra-thin ranges and a smart exit engine powered by CEX and oracle insights for maximum yield.
It may sound like a dream — but we’re here to prove it’s real.

First, let me introduce myself.
I’m the CEO and CTO of this project, with a strong background in mathematics, proven through various awards in the field.
I’ve also served as CTO for several Web3 projects, and my approach is simple — I look for mathematical inefficiencies in crypto and turn them into profit for users and sustainable business success.

The key to CLMMs is using the thinnest range possible — that’s how you maximize yield through leverage.
From my own tests and experience, I’ve seen APRs reach over 80,000%.
So our solution is simple: fully utilize ultra-thin ranges.
With Solana smart contracts, this is straightforward — by providing the correct accounts, parameters, and a reliable RPC node, we can automate this process efficiently.

Kani auto-selects top pools — high-volume, stable, real-time.
It continuously ingests on-chain data such as ticks, swap events, and pool states from Solana RPC, while aggregating price feeds from multi-source oracles and CEX APIs.
This data is processed through a pool-scoring engine that evaluates metrics like liquidity depth, volatility, and yield stability.
Based on these scores, Kani’s allocation module dynamically routes user capital to the most efficient CLMM positions with minimal latency and maximum capital efficiency.

Through my research, I discovered that DEX prices consistently lag behind CEX prices by a few seconds.
This happens because CEXs have deeper liquidity and faster price discovery, while DEXs rebalance slightly later through arbitrage and bots.
By understanding this pattern, we designed Kani to exploit that delay — detecting CEX movements early and acting before DEX prices adjust.

Together, these signals form Kani’s multi-source detection engine.
By continuously correlating CEX behavior, on-chain swaps, and oracle movements, Kani can identify abnormal market patterns in real time.
When multiple signals align — such as rising funding rates, heavy CEX sell walls, and falling oracle prices — Kani triggers its risk module, automatically withdrawing liquidity or swapping assets before losses occur.
This architecture allows Kani to act seconds before DEX prices react, giving users an unmatched defensive edge during sudden market dumps.
Kani sounds like a dream — but it’s real.
Now in private testing, and soon launching publicly.
That’s how we turn Kani’s dream into reality.
You can watch a short Kani MVP demo here.


