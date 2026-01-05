# kani-coordinator

## Overview

**kani-coordinator** is the Kubernetes orchestration service responsible for managing the lifecycle, deployment, and scaling of bot executor instances in the Kani DeFi automated liquidity system.

## Purpose

The coordinator serves as the central orchestration layer that:
- Manages Kubernetes deployments for executor instances
- Handles dynamic scaling based on bot demand
- Allocates resources and schedules bot operations
- Monitors health and status of executor pods
- Manages service discovery and load balancing

## Architecture

### Entry Point
- **File**: `main.ts`
- **Port**: 3002 (configurable via environment)
- **Framework**: NestJS with standard bootstrap
- **Monitoring**: Sentry integration for error tracking

### Middleware Configuration
- **Compression**: Response compression for network efficiency
- **CORS**: Cross-origin resource sharing enabled
- **Global Prefix**: API endpoint prefix configuration
- **Health Checks**: Terminus module for dependency monitoring

### Module Dependencies

```typescript
// app.module.ts
Modules: [
  CoordinatorModule,        // Main orchestration logic
  KubernetesModule,         // K8s API integration
  PrimaryMongoDbModule,     // Database with memory storage
  EventEmitterModule,       // Event-driven communication
  TerminusModule,           // Health checks
]
```

## Core Components

### 1. Kubernetes Managers

#### Deployment Manager
- Manages Kubernetes Deployment resources
- Handles rolling updates and version control
- Controls replica counts for scaling
- Manages pod lifecycle and termination

#### Service Manager
- Creates and manages Kubernetes Services
- Handles service discovery
- Manages load balancing configurations
- Exposes executor endpoints

#### Metadata Manager
- Manages resource annotations and labels
- Stores deployment metadata
- Tracks executor configuration
- Maintains resource ownership

### 2. Executor Loaders

- **Discovery**: Identifies available executors in the system
- **Registration**: Registers new executors with the coordinator
- **Validation**: Validates executor health and readiness
- **Assignment**: Assigns bots to available executors

### 3. Health Monitoring

Comprehensive health checks for:
- **Disk Usage**: Monitors storage capacity
- **Memory**: Tracks memory utilization
- **Database**: Verifies MongoDB connectivity
- **Redis**: Checks Redis availability
- **Kubernetes**: Validates K8s API connectivity

## Key Features

### Dynamic Scaling
Automatically scales executor instances based on:
- Number of active bots
- Resource utilization metrics
- Queue depth for pending operations
- Configurable scaling policies

### Resource Management
- CPU and memory allocation per executor
- Resource quotas and limits
- Priority-based scheduling
- Resource optimization and reclamation

### Event-Driven Architecture
Uses EventEmitter2 for:
- Deployment status updates
- Executor lifecycle events
- Scaling decisions
- Error notifications

### High Availability
- Health check endpoints for load balancers
- Automatic pod restart on failure
- Graceful shutdown handling
- Circuit breakers for external dependencies

## Data Flow

```
┌─────────────────┐
│  kani-interface │ (API requests)
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Coordinator   │ (Orchestrates)
└────────┬────────┘
         │
         v
┌─────────────────┐     ┌──────────────────┐
│   Kubernetes    │────▶│  kani-executor   │
│   API Server    │     │  (Instance N)    │
└─────────────────┘     └──────────────────┘
         │                         │
         └─────────────────────────┘
              (Multiple instances)
```

## Configuration

### Environment Variables
- `K8S_NAMESPACE`: Kubernetes namespace for deployments
- `K8S_CONFIG_PATH`: Path to kubeconfig file
- `EXECUTOR_IMAGE`: Docker image for executor pods
- `SCALING_MIN_REPLICAS`: Minimum number of executor instances
- `SCALING_MAX_REPLICAS`: Maximum number of executor instances
- `HEALTH_CHECK_INTERVAL`: Health check frequency

### Kubernetes Resources
- **Deployments**: Manages executor pods
- **Services**: Exposes executor endpoints
- **ConfigMaps**: Configuration management
- **Secrets**: Sensitive data storage

## Usage

### Running in Development
```bash
# Start coordinator locally
nest start kani-coordinator --watch

# With specific environment
NODE_ENV=development nest start kani-coordinator
```

### Running in Production
```bash
# Build for production
nest build kani-coordinator

# Start production build
node dist/apps/kani-coordinator/main.js
```

### Health Check Endpoints
```bash
# General health
GET /health

# Kubernetes health
GET /health/k8s

# Database health
GET /health/database

# Detailed health status
GET /health/status
```

## Deployment

### Kubernetes Deployment
The coordinator itself can be deployed to Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kani-coordinator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kani-coordinator
  template:
    metadata:
      labels:
        app: kani-coordinator
    spec:
      containers:
      - name: coordinator
        image: kani-coordinator:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

## Monitoring

### Metrics to Track
- Active executor count
- Resource utilization (CPU, memory)
- Bot deployment success rate
- Scaling operation frequency
- Health check pass/fail rates

### Logging
- Deployment events
- Scaling decisions
- Health check results
- Error conditions and failures

## Security Considerations

- **RBAC**: Use Kubernetes RBAC for API access
- **Service Accounts**: Dedicated service account with minimal permissions
- **Network Policies**: Restrict network access to coordinator
- **Secrets Management**: Use Kubernetes Secrets for sensitive data
- **Pod Security**: Enable pod security policies/standards

## Dependencies

| Package | Purpose |
|---------|---------|
| `@kubernetes/client-node` | Kubernetes API client |
| `@nestjs/common` | Core NestJS functionality |
| `@nestjs/event-emitter` | Event-driven architecture |
| `@nestjs/terminus` | Health checks |
| `@modules/database` | MongoDB integration |
| `@modules/kubernetes` | K8s management |

## Related Documentation

- [Project Overview](../../CLAUDE.md)
- [kani-executor](../kani-executor/README.md) - Executor instances managed by coordinator
- [kani-interface](../kani-interface/README.md) - API server
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture details
