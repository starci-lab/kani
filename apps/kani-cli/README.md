# kani-cli

## Overview

**kani-cli** is the administrative command-line interface tool for the Kani DeFi automated liquidity bot system. It provides essential commands for local development, key management, database operations, and cloud infrastructure management.

## Purpose

The CLI serves as the primary administrative tool for developers and system administrators to:
- Generate and manage cryptographic keys
- Perform database backup and restore operations
- Seed databases with initial data
- Execute Google Cloud Platform operations
- Manage local development workflows

## Architecture

### Entry Point
- **File**: `main.ts`
- **Framework**: NestJS with `nest-commander`
- **Pattern**: Command factory pattern for CLI command registration

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  CommandsModule,           // Core command handling
  EnvModule,               // Environment configuration
  WinstonModule,           // Logging (Info level)
  PrimaryMongoDbModule,    // Database connection
  // Global utility modules:
  ExecaModule,             // Process execution
  FilesystemModule,        // File system operations
  GcpModule,               // Google Cloud Platform
  CryptoModule,            // Cryptographic operations
  DerivedModule,           // Derived key management
]
```

## Command Categories

### 1. Local Commands
Local development commands for key generation and management:
- Wallet/key generation
- Private key management
- Local configuration setup

### 2. Cloud Commands
Google Cloud Platform integration commands:
- Database backup operations
- Database restore operations
- Data seeding for development/testing

### 3. Utility Commands
General administrative utilities:
- File system operations
- Process management
- Configuration management

## Key Features

### Global Module Registration
All utility modules are registered globally to provide easy access throughout the CLI application without repetitive imports.

### No Web Server
Unlike other apps in the monorepo, kani-cli is a pure CLI application without HTTP servers or WebSocket connections.

### Integrated Services
- **MongoDB**: Direct database access for administrative operations
- **Google Cloud**: Cloud storage and compute operations
- **File System**: Local file management for keys and configurations
- **Cryptography**: Secure key generation and management

## Usage

### Running the CLI
```bash
# From project root
npm run cli

# Or directly with nest
nest start kani-cli
```

### Available Commands
```bash
# Display help
kani-cli --help

# List all commands
kani-cli --list

# Execute specific command
kani-cli [command] [options]
```

## Configuration

The CLI uses the centralized environment configuration from `src/modules/env/config.ts`:

- Database connection strings
- Google Cloud credentials
- File system paths
- Logging configuration

## Security Considerations

- **Key Management**: Private keys are generated securely and should never be committed to version control
- **Cloud Credentials**: GCP credentials should be stored securely (e.g., environment variables, secret managers)
- **Database Access**: Administrative commands should be used with caution in production environments
- **Audit Logging**: All administrative actions should be logged for audit trails

## Development

### Adding New Commands

1. Create a new command class in `src/commands/`:
```typescript
import { Command } from 'nest-commander';

@Command({ name: 'new-command', description: 'Description' })
export class NewCommand {
  async run() {
    // Command logic
  }
}
```

2. Register in `CommandsModule`:
```typescript
@Module({
  providers: [NewCommand],
})
export class CommandsModule {}
```

### Testing

```bash
# Test CLI commands
npm run test kani-cli

# Test specific command
nest start kani-cli -- --help
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `nest-commander` | CLI framework |
| `@nestjs/common` | Core NestJS functionality |
| `@modules/env` | Environment configuration |
| `@modules/database` | Database connections |
| `@modules/gcp` | Google Cloud services |
| `@modules/crypto` | Cryptographic operations |
| `@modules/filesystem` | File operations |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-coordinator](../kani-coordinator/README.md) - Kubernetes orchestration
- [kani-executor](../kani-executor/README.md) - Transaction execution
- [kani-interface](../kani-interface/README.md) - API server
- [kani-observer](../kani-observer/README.md) - Blockchain monitoring
