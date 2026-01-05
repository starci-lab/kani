# kani-observer

## Overview

**kani-observer** is the blockchain monitoring service responsible for collecting real-time data from multiple sources, including blockchain events, centralized exchanges (CEX), and oracle price feeds. It publishes events to Kafka for consumption by other services in the Kani system.

## Purpose

The observer serves as the data ingestion layer:
- Monitors blockchain events across multiple DEX protocols
- Collects real-time price data from centralized exchanges
- Tracks oracle price updates (Pyth Network)
- Publishes events to Kafka for downstream processing
- Maintains pool state and analytics
- Provides spot price tracking and arbitrage detection

## Architecture

### Entry Point
- **File**: `main.ts`
- **Port**: 3005 (configurable via environment)
- **Framework**: NestJS with standard bootstrap
- **Monitoring**: Sentry integration for error tracking

### Middleware Configuration
- **Compression**: Response compression
- **CORS**: Cross-origin resource sharing
- **Global Prefix**: API endpoint prefix

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  CexesModule,              // Centralized exchange data
  ClientsModule,            // Blockchain RPC clients
  EventModule,              // Kafka producer for events
  PythModule,               // Oracle price monitoring
  SpotModule,               // Spot price tracking
  DexesModule,              // All DEX observers (observe: true)
  PrimaryMongoDbModule,     // Database connection
  SecondaryMongoDbModule,   // Secondary database
]
```

## Core Components

### 1. DEX Observers

Each DEX protocol has a dedicated observer that monitors:

#### Solana DEX Observers
- **Raydium Observer**: CLMM pool events
- **Orca Observer**: Whirlpool events
- **Meteora Observer**: DLMM pool events

#### Sui DEX Observers
- **Cetus Observer**: Production-hardened observer
- **Turbos Observer**: Production-hardened observer
- **Momentum Observer**: Production-hardened observer
- **FlowX Observer**: Production-hardened observer

#### Observer Capabilities
- Pool creation events
- Liquidity changes
- Swap events
- Price movements
- Tick updates
- Fee growth

### 2. CEX Data Collectors

#### Supported Exchanges
- Binance
- Coinbase
- Kraken
- OKX
- Bybit

#### Data Types
- Order book snapshots
- Trade feeds
- Price tickers
- Market depth
- Price aggregations

#### Usage
- Arbitrage opportunity detection
- Price verification
- Market sentiment analysis
- CEX-DEX price comparisons

### 3. Oracle Monitoring

#### Pyth Network Integration
- Real-time price feeds
- Price confidence intervals
- Price update frequency tracking
- Staleness detection

#### Price Attributes
- Aggregate price across multiple sources
- Exponential moving average (EMA)
- Confidence intervals
- Publish time tracking

### 4. Spot Price Tracking

#### Price Aggregation
- Multi-source price averaging
- Weighted price calculations
- Outlier detection and removal
- Price validation

#### Analytics
- Volatility tracking
- Price deviation alerts
- Spread monitoring
- Correlation analysis

### 5. Event Publishing

#### Kafka Integration
- **Topic Organization**:
  - `price.updates`: Real-time price changes
  - `pool.events`: Pool state changes
  - `swap.events`: Swap transactions
  - `liquidity.events`: Liquidity changes
  - `arbitrage.opportunities`: Arbitrage signals

#### Event Schema
- Event ID and timestamp
- Source (DEX, CEX, Oracle)
- Data type
- Payload with event details
- Metadata for filtering

## Key Features

### Multi-Source Data Collection
- Blockchain events from multiple DEXs
- CEX order books and trades
- Oracle price feeds
- Cross-chain support (Solana, Sui)

### Real-time Processing
- Low-latency event processing
- Efficient data normalization
- Parallel processing pipelines
- Configurable polling intervals

### Data Normalization
- Unified data format across sources
- Standardized types and enums
- Consistent price representations
- Normalized event schemas

### Caching Strategy
- Pool metadata caching
- Price data caching
- Order book snapshots
- Configurable TTL per data type

### Reliability
- RPC endpoint failover
- Connection retry logic
- Health monitoring
- Circuit breakers for failing sources

## Data Flow

```
┌────────────────────────────────────────────────────────┐
│                    Data Sources                        │
├─────────────┬─────────────┬─────────────┬──────────────┤
│  Blockchain │    CEX      │   Oracle    │   Analytics  │
│   (RPCs)    │  (OrderBooks)│  (Pyth)     │              │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────────┘
       │             │             │
       v             v             v
┌────────────────────────────────────────────────────────┐
│                   Observers                            │
├─────────────┬─────────────┬─────────────┬──────────────┤
│  DEX        │   CEX       │   Pyth      │    Spot      │
│ Observers   │ Collectors  │ Monitoring  │   Tracking   │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────────┘
       │             │             │
       v             v             v
┌────────────────────────────────────────────────────────┐
│               Normalization Layer                      │
│         (Unify formats, types, schemas)                │
└──────────────────────┬─────────────────────────────────┘
                       │
                       v
┌────────────────────────────────────────────────────────┐
│                  Kafka Producer                        │
│           (Publish to event topics)                    │
└──────────────────────┬─────────────────────────────────┘
                       │
                       v
┌────────────────────────────────────────────────────────┐
│              Consumers (Executor, etc)                 │
└────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables
- `OBSERVER_POLLING_INTERVAL`: Default polling interval (ms)
- `RPC_ENDPOINTS`: Comma-separated RPC endpoints
- `CEX_API_KEYS`: API keys for CEX access
- `PYTH_PRICE_SERVICE`: Pyth price feed endpoint
- `KAFKA_BROKERS`: Kafka broker addresses
- `KAFKA_PRODUCER_GROUP`: Producer group ID
- `CACHE_TTL_PRICE`: Price cache TTL
- `CACHE_TTL_ORDERBOOK`: Order book cache TTL

### DEX-Specific Settings
- `RAYDIUM_OBSERVATION_ENABLED`: Enable Raydium observer
- `ORCA_OBSERVATION_ENABLED`: Enable Orca observer
- `CETUS_OBSERVATION_ENABLED`: Enable Cetus observer
- `DEX_API_TIMEOUT`: DEX API request timeout

### CEX-Specific Settings
- `BINANCE_API_KEY`: Binance API credentials
- `COINBASE_API_KEY`: Coinbase API credentials
- `CEX_RATE_LIMITS`: Per-exchange rate limits
- `ORDERBOOK_DEPTH`: Order book depth to fetch

## Usage

### Running in Development
```bash
# Start observer locally
nest start kani-observer --watch

# With specific environment
NODE_ENV=development nest start kani-observer
```

### Running in Production
```bash
# Build for production
nest build kani-observer

# Start production build
node dist/apps/kani-observer/main.js
```

### Monitoring Endpoints

#### Health Check
```bash
GET /health
```

#### Observer Status
```bash
GET /observers/status

Response:
{
  "raydium": "active",
  "orca": "active",
  "cetus": "active",
  "binance": "active",
  "pyth": "active"
}
```

#### Data Metrics
```bash
GET /metrics

Response:
{
  "eventsPerSecond": 150,
  "averageLatency": 50,
  "kafkaPublishRate": 145,
  "cacheHitRate": 0.95
}
```

## Event Schema Examples

### Price Update Event
```json
{
  "eventId": "evt_1234567890",
  "timestamp": "2025-01-04T12:00:00Z",
  "source": "binance",
  "type": "price.update",
  "data": {
    "symbol": "SOL/USDC",
    "price": "145.50",
    "volume24h": "125000000",
    "change24h": "+2.5%"
  }
}
```

### Pool Event
```json
{
  "eventId": "evt_0987654321",
  "timestamp": "2025-01-04T12:00:01Z",
  "source": "raydium",
  "type": "pool.liquidity.change",
  "data": {
    "poolId": "...",
    "liquidity": "1000000",
    "tickCurrent": 225280,
    "sqrtPriceX64": "..."
  }
}
```

## Performance Optimization

### Batch Processing
- Batch multiple events before publishing
- Optimize batch sizes for throughput
- Compress events if size threshold exceeded

### Connection Pooling
- Reuse RPC connections
- HTTP keep-alive for CEX APIs
- Kafka connection pooling

### Selective Monitoring
- Only monitor active pools
- Filter by volume/liquidity thresholds
- Configurable watchlists

### Caching Layers
- In-memory cache for hot data
- Redis cache for shared data
- Database cache for historical data

## Error Handling

### RPC Failures
- Automatic endpoint rotation
- Fallback to backup RPCs
- Exponential backoff retry
- Circuit breaker for persistent failures

### CEX API Failures
- Rate limit handling
- Request timeout management
- Fallback to alternative CEXs
- Data validation before publishing

### Kafka Publishing Failures
- Retry queue for failed events
- Dead letter queue for manual review
- Event replay capability
- Monitoring of publishing lag

## Security Considerations

- **API Keys**: Securely store CEX API keys
- **RPC Endpoints**: Use authenticated RPCs when available
- **Rate Limiting**: Respect CEX rate limits
- **Data Validation**: Validate all incoming data
- **Audit Logging**: Log all data sources and transformations

## Monitoring

### Key Metrics
- Event ingestion rate (events/second)
- Kafka publishing lag
- Data source health status
- Cache hit/miss rates
- API request success rates
- Average data latency

### Alerts
- High publishing lag
- Data source failures
- Stale price data
- High error rates
- Rate limit violations

## Dependencies

| Package | Purpose |
|---------|---------|
| `kafkajs` | Kafka producer |
| `@solana/web3.js` | Solana RPC client |
| `@mysten/sui` | Sui RPC client |
| `@modules/blockchains` | DEX observer implementations |
| `@modules/database` | Database integration |
| `axios` | HTTP client for CEX APIs |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-executor](../kani-executor/README.md) - Consumes observer events
- [kani-interface](../kani-interface/README.md) - API for accessing processed data
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture details
