# kani-interface

## Overview

**kani-interface** is the primary API gateway for the Kani DeFi automated liquidity bot system, providing GraphQL and REST interfaces for client applications, along with WebSocket support for real-time updates.

## Purpose

The interface serves as the single entry point for all client interactions:
- GraphQL API for efficient data queries and mutations
- REST API for traditional HTTP endpoints
- WebSocket support for real-time price updates and bot status
- User authentication and authorization (JWT, Google OAuth, Privy.io)
- Two-factor authentication (2FA) support
- Email notifications and alerts

## Architecture

### Entry Point
- **File**: `main.ts`
- **Port**: 3001 (configurable via environment)
- **Framework**: NestJS with rich middleware setup
- **Monitoring**: Sentry integration for error tracking
- **Documentation**: Swagger/OpenAPI and Scalar

### Middleware Configuration
- **Compression**: Response compression
- **CORS**: Cross-origin resource sharing
- **Global Prefix**: API endpoint prefix
- **Rate Limiting**: Throttler module for API rate limits
- **Swagger**: Automatic API documentation

### WebSocket Configuration
- **Adapter**: Redis-based Socket.IO adapter
- **Real-time**: Live price feeds and bot status
- **Scalable**: Redis pub/sub for multi-instance deployments

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  GraphQLModule,            // GraphQL API with federation
  SocketIoModule,          // WebSocket real-time updates
  HttpModule,              // REST API endpoints
  PassportModule,          // Authentication framework
  JwtModule,               // JWT token management
  GoogleOAuthModule,       // Google OAuth integration
  PrivyModule,             // Privy.io authentication
  ThrottlerModule,         // Rate limiting
  MailModule,              // Email services (2FA, notifications)
  TotpModule,              // Two-factor authentication
  ApolloClientModule,      // GraphQL client for internal queries
  PrimaryMongoDbModule,    // Database connection
  SecondaryMongoDbModule,  // Secondary database
]
```

## Core Components

### 1. GraphQL API

#### Schema Federation
- Federated schema design
- Modular schema organization
- Type definitions across modules
- Resolvers in feature modules

#### Key GraphQL Types
- **Bots**: Bot management and monitoring
- **Positions**: Liquidity position tracking
- **Pools**: Pool analytics and metadata
- **Users**: User profile and settings
- **Transactions**: Transaction history
- **Analytics**: System analytics and reporting

### 2. REST API

#### Controllers
- AuthController: Authentication endpoints
- BotController: Bot CRUD operations
- PositionController: Position management
- PoolController: Pool information
- UserController: User management
- AdminController: Administrative operations

### 3. WebSocket Gateway

#### Socket.IO Gateway
- Real-time price updates
- Bot status notifications
- Position changes
- Transaction confirmations
- System alerts

#### Events
- `price:update`: Real-time price feeds
- `bot:status`: Bot state changes
- `position:opened`: New position notifications
- `position:closed`: Position closed events
- `transaction:pending`: Transaction pending status
- `transaction:confirmed`: Transaction confirmed

### 4. Authentication System

#### Authentication Methods
- **JWT**: Standard JSON Web Token authentication
- **Google OAuth**: OAuth 2.0 flow with Google
- **Privy.io**: Wallet-based authentication
- **2FA/TOTP**: Time-based one-time password

#### Guards & Strategies
- JwtAuthGuard: JWT validation
- GoogleOAuthGuard: OAuth validation
- PrivyGuard: Privy authentication
- TwoFactorGuard: 2FA validation

### 5. Email Service

#### Email Types
- **2FA Codes**: One-time passwords
- **Welcome Emails**: New user onboarding
- **Alerts**: System notifications
- **Reports**: Periodic reports
- **Password Reset**: Security notifications

## Key Features

### API Documentation
- **Swagger**: Interactive API documentation
- **Scalar**: Alternative API documentation viewer
- **GraphQL Playground**: Query testing interface
- **Type Safety**: TypeScript types from schema

### Rate Limiting
- Per-IP rate limiting
- Per-user rate limiting
- Configurable limits per endpoint
- Sliding window algorithm

### Real-time Updates
- WebSocket connections for live data
- Redis pub/sub for scaling
- Automatic reconnection handling
- Event broadcasting

### Security
- CORS configuration
- Helmet security headers
- Request validation
- SQL injection prevention (NoSQL)
- XSS protection
- CSRF protection

## Data Flow

```
┌──────────────┐     ┌──────────────┐
│   Clients    │────▶│  Interface   │
│ (Web/Mobile) │     │   (API GW)   │
└──────────────┘     └──────┬───────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         v                                     v
┌─────────────────┐                   ┌─────────────────┐
│   GraphQL/REST  │                   │    WebSocket    │
│     Queries     │                   │     Gateway     │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         v                                     v
┌─────────────────┐                   ┌─────────────────┐
│   Controllers   │                   │   Redis Pub/Sub │
└────────┬────────┘                   └─────────────────┘
         │
         v
┌─────────────────┐
│   Services      │
│  (Business)     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│    Database     │
│    (MongoDB)    │
└─────────────────┘
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRATION`: Token expiration time
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret
- `PRIVY_APP_ID`: Privy.io application ID
- `PRIVY_APP_SECRET`: Privy.io secret
- `RATE_LIMIT_TTL`: Rate limit time window
- `RATE_LIMIT_LIMIT`: Max requests per window
- `SMTP_HOST`: Email server host
- `SMTP_USER`: Email server username
- `SMTP_PASS`: Email server password

### CORS Configuration
- Origin whitelist
- Allowed methods
- Allowed headers
- Credential support

### Rate Limiting
- Global rate limits
- Per-endpoint overrides
- Whitelist for trusted IPs
- Custom key generation

## Usage

### Running in Development
```bash
# Start interface locally
nest start kani-interface --watch

# With hot reload
npm run start:dev kani-interface
```

### Running in Production
```bash
# Build for production
nest build kani-interface

# Start production build
node dist/apps/kani-interface/main.js
```

### API Access

#### GraphQL Playground
```
http://localhost:3001/graphql
```

#### Swagger Documentation
```
http://localhost:3001/api
```

#### Scalar Documentation
```
http://localhost:3001/api scalar
```

### GraphQL Query Examples

```graphql
# Get user's bots
query GetUserBots {
  bots {
    id
    status
    positions {
      id
      pool
      value
    }
  }
}

# Get pool information
query GetPool($poolId: String!) {
  pool(id: $poolId) {
    id
    dex
    tokenA
    tokenB
    liquidity
    volume24h
  }
}
```

### WebSocket Connection

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen to price updates
socket.on('price:update', (data) => {
  console.log('Price update:', data);
});

// Listen to bot status
socket.on('bot:status', (data) => {
  console.log('Bot status:', data);
});
```

## Authentication Flow

### JWT Authentication
```
1. POST /auth/login
2. Validate credentials
3. Generate JWT token
4. Return token with user data
5. Include token in Authorization header
```

### Google OAuth
```
1. GET /auth/google
2. Redirect to Google consent screen
3. User approves
4. Google redirects with code
5. Exchange code for tokens
6. Create/update user
7. Generate JWT token
```

### Privy.io Authentication
```
1. Initialize Privy SDK
2. User authenticates with wallet
3. Privy returns authenticated token
4. Validate token with Privy API
5. Generate JWT token
```

## Error Handling

### HTTP Exception Filters
- Standardized error responses
- Error logging with Sentry
- User-friendly error messages
- Detailed error codes

### GraphQL Error Handling
- Field-level error handling
- formattedError responses
- Error extensions for debugging

## Security Best Practices

- **Environment Variables**: Never commit secrets
- **Token Expiration**: Short-lived JWT tokens
- **Refresh Tokens**: Implement token refresh mechanism
- **Password Hashing**: bcrypt with salt rounds
- **2FA Enforcement**: Enable 2FA for sensitive operations
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **Rate Limiting**: Prevent brute force attacks
- **HTTPS Only**: Enforce HTTPS in production
- **CORS**: Restrict to trusted origins

## Monitoring

### Key Metrics
- Request rate and latency
- WebSocket connections
- Authentication success/failure rate
- GraphQL query complexity
- Error rates by endpoint
- Active users

### Logging
- Request/response logging
- Error tracking with Sentry
- Performance monitoring
- User activity audit logs

## Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/graphql` | GraphQL API framework |
| `@nestjs/platform-socket.io` | WebSocket support |
| `@nestjs/passport` | Authentication framework |
| `@nestjs/throttler` | Rate limiting |
| `passport-jwt` | JWT authentication strategy |
| `passport-google-oauth20` | Google OAuth strategy |
| `socket.io-redis` | Redis adapter for WebSocket |
| `nodemailer` | Email sending |
| `speakeasy` | TOTP 2FA implementation |
| `swagger-ui-express` | API documentation |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-executor](../kani-executor/README.md) - Transaction execution
- [kani-observer](../kani-observer/README.md) - Blockchain monitoring
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture details
