# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kani is a DeFi automated liquidity bot that manages concentrated liquidity market maker (CLMM) positions with ultra-thin ranges. The system was originally built on Sui and is migrating to Solana for better latency and scalability.

**Core concept**: Maximize capital efficiency by opening positions in very narrow price ranges and exiting before DEX prices adjust, using multi-source signals (CEX order books, oracles, on-chain data).

## Development Commands

```bash
# Install dependencies (from project root, which is the app/ directory)
npm install

# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# Run CLI
npm run cli
```

### Running Individual Apps

This is a NestJS monorepo. To run a specific app:

```bash
# Run specific app in development
nest start kani-interface --watch
nest start kani-coordinator --watch
nest start kani-executor --watch
nest start kani-observer --watch

# Build specific app
nest build kani-interface
nest build kani-coordinator
nest build kani-executor
nest build kani-observer
```

## Architecture

### Monorepo Structure

The codebase uses a NestJS monorepo with the following applications in `apps/`:

| App | Purpose |
|-----|---------|
| `kani-interface` | API server (GraphQL + REST), handles HTTP/WebSocket requests |
| `kani-coordinator` | Orchestrates bot operations, manages bot lifecycle |
| `kani-executor` | Executes blockchain transactions |
| `kani-observer` | Monitors blockchain events and pool states |
| `kani-cli` | Command-line interface for management |
| `kani-test-rpc` | Testing utilities |

### Key Architectural Patterns

#### DEX Adapter System

Each DEX implements three core interfaces defined in `src/modules/blockchains/interfaces/`:

- `IMetadataService`: Pool and token metadata
- `IFetchService`: Real-time data fetching (prices, liquidity, ticks)
- `IActionService`: Position actions (open, close, rebalance)

DEX implementations in `src/modules/blockchains/dexes/`:
- **Sui (production-hardened)**: `cetus/`, `turbos/`, `momentum/`, `flowx/`
- **Solana (in development)**: `raydium/`, `orca/`, `meteora/`

The `DexesModule` dynamically registers DEX adapters based on `ChainId`. Use `LiquidityPoolService.getDexs({ chainId })` to get available adapters for a chain.

#### Data Flow

1. **Ingest**: RPC event ingestion + external data (CEX, oracles)
2. **Normalize**: Convert to unified internal types
3. **Score**: Pool evaluation using depth, volatility, yield metrics
4. **Allocate**: Capital distribution to top-scoring pools
5. **Monitor**: Multi-source risk detection (CEX leads, oracle deltas)
6. **Act**: Automated position adjustments/exits

#### Service Communication

- **Redis**: Caching, WebSocket pub/sub (via Socket.IO adapter), BullMQ job queue
- **Kafka**: Event streaming between microservices
- **gRPC**: Internal service communication (if applicable)

### Important Directories

- `src/modules/blockchains/`: Blockchain clients, DEX adapters, transaction builders
- `src/modules/databases/`: MongoDB integration (primary + memory storage)
- `src/modules/interfaces/`: GraphQL and WebSocket interfaces
- `src/modules/executor/`: Job processing, polling, workers
- `src/modules/coordinator/`: Kubernetes management, resource orchestration
- `src/modules/env/`: Environment configuration (see `config.ts`)
- `src/modules/event/`: Event handling and broadcasting
- `src/modules/lock/`: Distributed locking mechanisms
- `src/modules/auth/`: Authentication and authorization

### Enums and Constants

Canonical enums are defined in `src/modules/databases/enums/ids.ts`:
- `ChainId`: SUI, SOLANA
- `DexId`: Cetus, Turbos, Momentum, FlowX, Raydium, Orca, Meteora
- Token and pool identifiers

### Environment Configuration

Runtime configuration is centralized in `src/modules/env/config.ts`. Important configs:
- RPC endpoints for Sui/Solana
- Database connections (MongoDB, Redis)
- Slippage tolerances for swaps and positions
- Kubernetes deployment settings
- Bounds for transaction execution

## Technology Stack

- **Framework**: NestJS with TypeScript
- **Blockchains**: Sui (production), Solana (migration target)
- **Database**: MongoDB with Mongoose ODM
- **Cache/Queue**: Redis (multiple instances for different purposes)
- **Message Broker**: Kafka
- **Oracles**: Pyth Network
- **DEX SDKs**: Cetus, Turbos, Raydium, Orca, Meteora, and others
- **Authentication**: JWT, Passport.js, Privy.io
- **Containerization**: Docker with Kubernetes deployment

## Development Notes

### Adding a New DEX

1. Create a new directory in `src/modules/blockchains/dexes/{dex-name}/`
2. Implement `IMetadataService`, `IFetchService`, and `IActionService`
3. Add `DexId` enum entry in `src/modules/databases/enums/ids.ts`
4. Register in `DexesModule.register({ dexes, isGlobal })`

### Working with Solana

The Solana integration uses multiple SDKs:
- `@solana/web3.js` for RPC connections
- `@raydium-io/raydium-sdk` for Raydium CLMM
- `@orca-so/sdk` and `@orca-so/whirlpools-core` for Orca
- `@meteora-ag/dlmm` for Meteora

Note: Solana adapters are currently scaffolded with placeholder implementations that throw intentionally for testing.

### Testing

- Unit tests use Jest
- E2E tests are configured per app (e.g., `apps/app/test/jest-e2e.json`)
- Test files use `*.spec.ts` naming convention
- Path aliases are configured in jest.config: `@modules`, `@utils`, `@typedefs`, `@exceptions`

### Security Considerations

- Private keys are encrypted using Google Cloud KMS
- Never commit `.env` files or secrets
- Use the encrypted wallet storage system for bot wallet keys
- API routes use rate limiting and CORS configuration

## Additional Documentation

- `ARCHITECTURE.md`: Detailed technical architecture and system design
- `README.md`: Project overview and setup instructions
