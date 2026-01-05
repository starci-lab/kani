# kani-executor

## Overview

**kani-executor** is the core transaction execution engine for the Kani DeFi automated liquidity bot system. It handles all blockchain interactions, including opening/closing positions, rebalancing, and managing token balances across multiple DEX protocols.

## Purpose

The executor is responsible for:
- Executing blockchain transactions across multiple DEX protocols
- Opening and closing liquidity positions
- Managing token balances and transfers
- Processing job queues for reliable transaction execution
- Interacting with oracles for real-time price data
- Handling CLMM (Concentrated Liquidity Market Maker) calculations

## Architecture

### Entry Point
- **File**: `main.ts`
- **Port**: 3003 (configurable via environment)
- **Framework**: NestJS with standard bootstrap
- **Monitoring**: Sentry integration for error tracking

### Middleware Configuration
- **Compression**: Response compression
- **CORS**: Cross-origin resource sharing
- **Global Prefix**: API endpoint prefix
- **Request Scoping**: Isolated context per bot operation

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  ExecutorModule,           // Core execution logic
  DexesModule,             // All DEX integrations
  EventModule,             // Kafka consumer for events
  BullModule,              // Job queue processing
  TxBuilderModule,         // Transaction construction
  SignersModule,           // Wallet/key management
  PythModule,              // Oracle price feeds
  MathModule,              // Mathematical operations
  FormulasModule,          // CLMM calculations
  PrimaryMongoDbModule,    // Database connection
  SecondaryMongoDbModule,  // Secondary database
]
```

## Core Components

### 1. Transaction Processors

#### OpenPositionProcessorService
- Opens new liquidity positions
- Calculates optimal entry points
- Handles transaction construction and signing
- Manages slippage tolerance
- Executes swaps and position creation

#### ClosePositionProcessorService
- Closes existing positions
- Calculates optimal exit points
- Handles liquidity removal
- Executes reverse swaps
- Manages profit/loss realization

#### BalanceService
- Monitors token balances
- Handles token transfers
- Manages wallet balances
- Tracks token approvals
- Handles rebase events

#### ActiveBotService
- Monitors active bot operations
- Tracks bot lifecycle
- Manages bot state transitions
- Handles bot status updates

### 2. Job Queue System

#### BullMQ Integration
- **Queues**:
  - Open position queue
  - Close position queue
  - Balance management queue
  - Recovery queue for failed jobs

#### Workers
- Background job processing
- Retry mechanisms for failed transactions
- Dead letter queue for manual intervention
- Job prioritization based on urgency

#### Processors
- Job validation and sanitization
- Transaction execution
- Result processing and confirmation
- Error handling and recovery

### 3. Real-time Data Subscriptions

#### CEX (Centralized Exchange) Feeds
- Order book monitoring
- Price feed subscriptions
- Market depth tracking
- Arbitrage opportunity detection

#### Oracle Feeds (Pyth)
- Real-time price updates
- Price confidence intervals
- Price staleness detection
- Cross-chain price aggregation

### 4. DEX Integrations

Unified interface for multiple DEX protocols:

#### Solana DEXs
- **Raydium**: CLMM pools
- **Orca**: Whirlpools
- **Meteora**: DLMM pools

#### Sui DEXs
- **Cetus**: Production-ready
- **Turbos**: Production-ready
- **Momentum**: Production-ready
- **FlowX**: Production-ready

Each DEX implements:
- `IMetadataService`: Pool and token metadata
- `IFetchService`: Real-time data fetching
- `IActionService`: Position actions

## Key Features

### Multi-DEX Support
- Unified abstraction layer for all DEX protocols
- Protocol-specific optimizations
- Automatic DEX selection based on liquidity
- Cross-DEX arbitrage detection

### Event-Driven Architecture
- Kafka consumer for event streaming
- Async event processing
- Event replay capabilities
- Dead letter queue for failed events

### Reliable Transaction Execution
- Job queue with retry logic
- Transaction simulation before execution
- Gas optimization strategies
- Slippage protection
- Front-running protection

### CLMM Calculations
- Tick-based price calculations
- Liquidity depth analysis
- Fee tier optimization
- Tick range selection
- Position rebalancing

### Oracle Integration
- Pyth Network for reliable price feeds
- Price confidence scoring
- Stale price detection
- Price deviation alerts

## Data Flow

```
┌──────────────┐     ┌──────────────┐
│    Kafka     │────▶│   Executor   │
│   Events     │     │              │
└──────────────┘     └──────┬───────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         v                                     v
┌─────────────────┐                   ┌─────────────────┐
│  BullMQ Queue   │                   │   Subscribers   │
└────────┬────────┘                   │  (CEX, Oracle)  │
         │                            └─────────────────┘
         │                                     │
         v                                     v
┌─────────────────┐                   ┌─────────────────┐
│    Processors   │◀──────────────────│   Price Feeds   │
└────────┬────────┘                   └─────────────────┘
         │
         v
┌─────────────────┐
│   DEX Modules   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Blockchains   │
│  (Solana, Sui)  │
└─────────────────┘
```

## Configuration

### Environment Variables
- `EXECUTOR_MAX_CONCURRENT_JOBS`: Maximum concurrent job processing
- `SLIPPAGE_TOLERANCE`: Default slippage tolerance (basis points)
- `GAS_PRICE_STRATEGY`: Gas price calculation strategy
- `PYTH_PRICE_SERVICE`: Pyth price feed endpoint
- `KAFKA_CONSUMER_GROUP`: Kafka consumer group ID
- `BULLMQ_REDIS`: Redis connection for job queue

### Job Queue Settings
- `JOB_RETRY_ATTEMPTS`: Number of retry attempts
- `JOB_RETRY_DELAY`: Delay between retries
- `JOB_TIMEOUT`: Maximum job execution time
- `JOB_CLEANUP_AGE`: Age for completed job cleanup

## Usage

### Running in Development
```bash
# Start executor locally
nest start kani-executor --watch

# With specific environment
NODE_ENV=development nest start kani-executor
```

### Running in Production
```bash
# Build for production
nest build kani-executor

# Start production build
node dist/apps/kani-executor/main.js
```

### Job Queue Operations
```bash
# Queue a new job
POST /jobs/open-position
{
  "botId": "...",
  "poolId": "...",
  "amount": "...",
  "tickRange": {...}
}

# Check job status
GET /jobs/:jobId

# Retry failed jobs
POST /jobs/:jobId/retry
```

## Error Handling

### Transaction Failures
- Automatic retry with exponential backoff
- Transaction simulation to pre-validate
- Fallback to alternative DEX protocols
- Manual intervention queue for critical failures

### Oracle Failures
- Fallback to secondary price sources
- Price staleness detection
- Confidence interval validation
- Circuit breaker for unreliable feeds

### Network Issues
- RPC endpoint failover
- Connection pooling
- Request timeout management
- Rate limiting handling

## Performance Optimization

### Transaction Batching
- Batch multiple operations when possible
- Atomic transaction groups
- Multi-call operations (where supported)

### Caching Strategy
- Pool metadata caching
- Token price caching
- DEX factory address caching
- Approval caching

### Gas Optimization
- Dynamic gas price adjustment
- Gas limit estimation
- Priority fee optimization (Solana)
- Transaction size optimization

## Security Considerations

- **Key Management**: Encrypted wallet storage with GCP KMS
- **Transaction Validation**: Pre-execution validation and simulation
- **Access Control**: Job authorization and validation
- **Audit Logging**: All transactions logged with full context
- **Secrets Rotation**: Regular key rotation policies
- **Rate Limiting**: Per-user and per-DEX rate limits

## Monitoring

### Key Metrics
- Transaction success rate
- Average execution time
- Queue depth and processing time
- Gas/transaction fee costs
- DEX-specific success rates
- Oracle price latency
- Error rates by type

### Alerts
- Failed transactions
- High queue depth
- Stale oracle prices
- Low wallet balances
- RPC endpoint failures

## Dependencies

| Package | Purpose |
|---------|---------|
| `@solana/web3.js` | Solana RPC client |
| `@raydium-io/raydium-sdk` | Raydium CLMM integration |
| `@orca-so/sdk` | Orca Whirlpools integration |
| `@meteora-ag/dlmm` | Meteora DLMM integration |
| `@nestjs/bull` | Job queue management |
| `kafkajs` | Kafka consumer |
| `@modules/blockchains` | DEX adapters |
| `@modules/database` | Database integration |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-coordinator](../kani-coordinator/README.md) - Orchestrates executor instances
- [kani-observer](../kani-observer/README.md) - Provides market data
- [kani-interface](../kani-interface/README.md) - API for job submission
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture details
