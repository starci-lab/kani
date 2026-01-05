# kani-test-rpc

## Overview

**kani-test-rpc** is a testing and development utility designed for debugging and testing blockchain RPC operations. It provides a sandboxed environment for testing RPC interactions without affecting production systems.

## Purpose

The test RPC utility serves as:
- Development sandbox for RPC operations
- Testing tool for blockchain interactions
- Debugging environment for transaction construction
- Simple interface for RPC endpoint validation
- Load testing tool for RPC providers

**Note**: This app is NOT intended for production use and should only be used in development and testing environments.

## Architecture

### Entry Point
- **File**: `main.ts`
- **Port**: 3000 (default NestJS port)
- **Framework**: NestJS with minimal configuration
- **Scope**: Development and testing only

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  PrimaryMongoDbModule,     // Database connection
  ClientsModule,            // RPC clients (Solana, Sui)
  P2CBalancerModule,        // Load balancing for RPCs
  EventModule,              // Event handling
]
```

### Simplicity Design
Minimal dependencies focused on core functionality:
- No authentication (development only)
- No rate limiting
- No production-grade error handling
- Direct RPC access

## Core Components

### 1. RPC Client Management

#### Supported Blockchains
- **Solana**: Primary testing target
- **Sui**: Secondary testing target (some code commented out)

#### Client Features
- Multiple RPC endpoint support
- Load balancing across endpoints
- Connection pooling
- Request timeout management

### 2. Load Balancing

#### P2C (Power of Two Choices) Algorithm
- Intelligent RPC endpoint selection
- Health-based routing
- Latency-aware endpoint selection
- Automatic failover

#### Load Balancer Features
- Endpoint health monitoring
- Request distribution
- Fallback mechanisms
- Performance tracking

### 3. Position Testing

#### Solana Position Fetching
```typescript
// Fetch position data from Solana DEXs
- Raydium CLMM positions
- Orca Whirlpool positions
- Meteora DLMM positions
```

#### Sui Transaction Testing (Commented)
```typescript
// Sui transaction testing code (currently disabled)
// Can be enabled for Sui-specific testing
```

## Usage Scenarios

### 1. RPC Endpoint Validation
Test and validate RPC endpoint connectivity and performance:
```bash
# Test Solana RPC endpoint
POST /test/solana/rpc
{
  "endpoint": "https://api.mainnet-beta.solana.com",
  "method": "getHealth"
}
```

### 2. Transaction Construction Debugging
Test transaction construction before execution:
```bash
# Build test transaction
POST /test/transaction/build
{
  "chain": "solana",
  "dex": "raydium",
  "pool": "pool_address",
  "action": "open_position"
}
```

### 3. Load Balancer Testing
Test RPC load balancing behavior:
```bash
# Test load balancer
POST /test/loadbalancer
{
  "endpoints": [
    "rpc1.endpoint.com",
    "rpc2.endpoint.com",
    "rpc3.endpoint.com"
  ],
  "requests": 100
}
```

### 4. Position Data Fetching
Fetch and inspect position data:
```bash
# Get position data
GET /test/position/:positionId

Response:
{
  "positionId": "...",
  "pool": "...",
  "tickLower": 100,
  "tickUpper": 200,
  "liquidity": "1000000"
}
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `SOLANA_RPC_ENDPOINTS`: Comma-separated Solana RPC endpoints
- `SUI_RPC_ENDPOINTS`: Comma-separated Sui RPC endpoints
- `MONGODB_URI`: MongoDB connection string
- `LOAD_BALANCER_STRATEGY`: Load balancing strategy

### Example .env for Development
```bash
PORT=3000
SOLANA_RPC_ENDPOINTS=https://api.mainnet-beta.solana.com,https://solana-api.projectserum.com
SUI_RPC_ENDPOINTS=https://fullnode.mainnet.sui.io
MONGODB_URI=mongodb://localhost:27017/kani-test
```

## Running the Test RPC

### Development Mode
```bash
# Start in watch mode
nest start kani-test-rpc --watch

# Or with hot reload
npm run start:dev kani-test-rpc
```

### Standalone Execution
```bash
# Build and run
nest build kani-test-rpc
node dist/apps/kani-test-rpc/main.js
```

## API Endpoints

### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-01-04T12:00:00Z",
  "uptime": 3600
}
```

### Test RPC Connection
```bash
POST /test/rpc/connection
{
  "chain": "solana",
  "endpoint": "https://api.mainnet-beta.solana.com"
}

Response:
{
  "connected": true,
  "latency": 150,
  "version": "1.18.0"
}
```

### Test Load Balancer
```bash
POST /test/loadbalancer/benchmark
{
  "endpoints": ["rpc1", "rpc2", "rpc3"],
  "requestCount": 100,
  "concurrency": 10
}

Response:
{
  "totalRequests": 100,
  "successful": 98,
  "failed": 2,
  "averageLatency": 120,
  "endpointStats": {
    "rpc1": {
      "requests": 33,
      "averageLatency": 110
    },
    "rpc2": {
      "requests": 33,
      "averageLatency": 125
    },
    "rpc3": {
      "requests": 34,
      "averageLatency": 130
    }
  }
}
```

## Code Examples

### App Service Structure

```typescript
// src/app.service.ts
@Injectable()
export class AppService {
  constructor(
    @Inject('SOLANA_RPC') private solanaRpc: RpcClient,
    @Inject('SUI_RPC') private suiRpc: RpcClient,
    private loadBalancer: P2CBalancerService,
  ) {}

  // Test RPC connection
  async testConnection(chain: ChainId): Promise<boolean> {
    // Implementation
  }

  // Fetch position data
  async fetchPosition(positionId: string) {
    // Implementation
  }

  // Benchmark load balancer
  async benchmarkLoadBalancer(config: BenchmarkConfig) {
    // Implementation
  }
}
```

### Example: Solana Position Fetch

```typescript
async fetchSolanaPosition(positionId: string) {
  const connection = this.loadBalancer.getConnection('solana');
  const accountInfo = await connection.getAccountInfo(positionId);

  // Parse position data
  return {
    address: positionId,
    owner: accountInfo.owner.toString(),
    data: this.parsePositionData(accountInfo.data),
  };
}
```

## Best Practices for Testing

### 1. Isolation
- Use separate test database
- Never use production RPC endpoints
- Mock sensitive operations

### 2. Data Cleanup
- Clear test data after each test
- Reset database state regularly
- Clean up temporary files

### 3. Error Logging
- Log all errors for debugging
- Capture full stack traces
- Store request/response for failed tests

### 4. Performance Monitoring
- Track RPC response times
- Monitor memory usage
- Profile hot paths

## Limitations

- **Not Production-Ready**: Missing production-grade features
- **No Authentication**: No security measures
- **No Rate Limiting**: Can overload RPC endpoints
- **No Persistence**: Data not persisted reliably
- **No Monitoring**: Basic error handling only
- **No Scalability**: Single-instance only

## Security Considerations

**IMPORTANT**: This app should NEVER be deployed to production:
- No authentication
- No authorization
- No input validation
- No rate limiting
- No security headers
- Direct database access

### Safe Usage Practices
- Run locally only
- Use firewall to block external access
- Never expose to public internet
- Use testnet/devnet RPCs only
- Regularly rotate test credentials

## Future Enhancements

### Potential Improvements
- Add authentication for local testing
- Implement rate limiting for RPC protection
- Add test data generators
- Create test scenario presets
- Add performance benchmarking tools
- Implement automated test suites
- Add visual test result reporting

## Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/common` | Core NestJS functionality |
| `@solana/web3.js` | Solana RPC client |
| `@mysten/sui` | Sui RPC client |
| `@modules/clients` | RPC client management |
| `@modules/loadbalancer` | P2C load balancing |
| `@modules/database` | MongoDB integration |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-executor](../kani-executor/README.md) - Production transaction execution
- [kani-observer](../kani-observer/README.md) - Production blockchain monitoring
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture details

---

**⚠️ WARNING**: This is a development/testing tool only. Do not use in production environments.
