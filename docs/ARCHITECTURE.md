# Architecture Overview

This document describes the technical architecture of the MCP Server for Claude Home Assistant Add-on.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Communication Protocols](#communication-protocols)
- [Security Architecture](#security-architecture)
- [Performance Design](#performance-design)
- [Deployment Architecture](#deployment-architecture)
- [Technical Stack](#technical-stack)

## System Overview

The MCP Server acts as a bridge between Claude Desktop and Home Assistant, enabling natural language control of smart home devices through the Model Context Protocol.

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │  stdio  │                  │WebSocket│                 │
│ Claude Desktop  │◄────────►│   MCP Server    │◄────────►│ Home Assistant │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │                            │                            │
     User Input                Docker Container            Smart Home Devices
```

### Key Components

1. **Claude Desktop**: AI assistant interface running on user's computer
2. **MCP Server**: Node.js server implementing the Model Context Protocol
3. **Home Assistant**: Open-source home automation platform
4. **Supervisor API**: Home Assistant's internal API for add-ons
5. **WebSocket Connection**: Real-time bidirectional communication

## Component Architecture

### MCP Server Components

```
mcp-server/
├── src/
│   ├── index.ts           # Main entry point & stdio transport
│   ├── server.ts          # MCP server implementation
│   ├── tools/             # MCP tool implementations
│   │   ├── query.ts       # Query tool (read operations)
│   │   ├── control.ts     # Control tool (write operations)
│   │   ├── monitor.ts     # Monitor tool (real-time events)
│   │   └── assist.ts      # Assist tool (AI features)
│   ├── websocket/         # WebSocket management
│   │   ├── client.ts      # WebSocket client implementation
│   │   ├── auth.ts        # Authentication handling
│   │   └── reconnect.ts   # Reconnection logic
│   ├── cache/             # Caching layer
│   │   ├── entity.ts      # Entity state cache
│   │   ├── service.ts     # Service definition cache
│   │   └── ttl.ts         # Time-to-live management
│   └── utils/             # Utility functions
│       ├── validation.ts  # Input validation
│       ├── sanitization.ts # Input sanitization
│       └── rate-limit.ts  # Rate limiting
```

### Tool Architecture

Each tool follows a consistent pattern:

```typescript
interface Tool {
  name: string;
  description: string;
  operations: Operation[];
  execute(params: ToolParams): Promise<ToolResult>;
}

interface Operation {
  name: string;
  description: string;
  parameters: ParameterSchema;
  handler: OperationHandler;
}
```

#### Query Tool Operations
- `entities` - List and filter entities
- `state` - Get entity states
- `history` - Query historical data
- `areas` - List areas
- `devices` - List devices
- `services` - Available services
- `config` - System configuration
- `templates` - Template evaluation
- `integrations` - Loaded integrations
- `addons` - Installed add-ons
- `logs` - System logs

#### Control Tool Operations
- `call_service` - Execute service calls
- `toggle` - Toggle entity states
- `set_value` - Set entity values
- `scene_activate` - Activate scenes
- `script_run` - Execute scripts
- `reload_integration` - Reload integrations
- `create_automation` - Create automations
- `backup_create` - Create backups
- `recorder_purge` - Purge recorder data

#### Monitor Tool Operations
- `subscribe` - Subscribe to events
- `unsubscribe` - Cancel subscriptions
- `get_events` - Retrieve buffered events
- `fire_event` - Fire custom events
- `diagnostics` - System diagnostics
- `trace_automation` - Debug automations
- `websocket_commands` - Raw WebSocket

#### Assist Tool Operations
- `suggest_automation` - AI automation suggestions
- `analyze_patterns` - Pattern analysis
- `optimize_energy` - Energy optimization
- `security_check` - Security audit
- `troubleshoot` - System troubleshooting
- `explain_state` - State explanations
- `validate_config` - Config validation
- `performance_analysis` - Performance metrics
- `generate_lovelace` - Dashboard generation
- `migration_check` - Migration assistance
- `blueprint_import` - Import blueprints

## Data Flow

### Request Flow

```
1. User Input (Claude Desktop)
   ↓
2. MCP Protocol Message (stdio)
   ↓
3. MCP Server Router
   ↓
4. Tool Selection & Validation
   ↓
5. Cache Check (if applicable)
   ↓
6. WebSocket Request to HA
   ↓
7. Home Assistant Processing
   ↓
8. WebSocket Response
   ↓
9. Response Processing & Caching
   ↓
10. MCP Protocol Response (stdio)
    ↓
11. Claude Desktop Display
```

### Event Flow (Real-time)

```
1. Home Assistant Event
   ↓
2. WebSocket Event Message
   ↓
3. MCP Server Event Handler
   ↓
4. Event Buffer/Queue
   ↓
5. Subscription Matching
   ↓
6. Event Transformation
   ↓
7. MCP Event Notification
   ↓
8. Claude Desktop Update
```

### Caching Strategy

```
┌─────────────────────────────────┐
│         Cache Layer             │
├─────────────────────────────────┤
│ Entity States    │ TTL: 5s      │
│ Service Defs     │ TTL: 60s     │
│ Areas/Devices    │ TTL: 60s     │
│ Config           │ TTL: 300s    │
└─────────────────────────────────┘
```

## Communication Protocols

### stdio Transport (Claude ↔ MCP Server)

```json
// Request
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "operation": "entities",
      "domain": "light"
    }
  },
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "entities": [...]
  },
  "id": 1
}
```

### WebSocket Protocol (MCP Server ↔ Home Assistant)

```json
// Authentication
{
  "type": "auth",
  "access_token": "eyJ0eXAiOiJKV1..."
}

// Subscribe to events
{
  "id": 1,
  "type": "subscribe_events",
  "event_type": "state_changed"
}

// Call service
{
  "id": 2,
  "type": "call_service",
  "domain": "light",
  "service": "turn_on",
  "target": {
    "entity_id": "light.bedroom"
  }
}
```

### Message Types

| Protocol | Format | Transport | Encoding |
|----------|--------|-----------|----------|
| MCP | JSON-RPC 2.0 | stdio | UTF-8 |
| WebSocket | JSON | WebSocket | UTF-8 |
| HTTP | JSON | HTTP/HTTPS | UTF-8 |

## Security Architecture

### Defense in Depth

```
Layer 1: Network Security
├── Container Isolation (Docker)
├── Port Access Control
└── Firewall Rules

Layer 2: Authentication
├── Token-based Auth
├── Supervisor Token Validation
└── Session Management

Layer 3: Authorization
├── Entity Filtering
├── Domain Restrictions
└── Operation Permissions

Layer 4: Input Validation
├── Parameter Validation
├── Type Checking
└── Sanitization

Layer 5: Rate Limiting
├── Per-tool Limits
├── Burst Protection
└── Backoff Strategy

Layer 6: Monitoring
├── Audit Logging
├── Error Tracking
└── Security Events
```

### Security Features

1. **AppArmor Profile**: Restricts container capabilities
2. **Input Sanitization**: Prevents injection attacks
3. **Rate Limiting**: Prevents abuse (100 req/min)
4. **Entity Filtering**: Granular access control
5. **Token Rotation**: Support for token refresh
6. **Secure Transport**: stdio instead of network socket
7. **Memory Protection**: Automatic cleanup and limits

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized Access | Token authentication |
| Command Injection | Input sanitization |
| DoS Attacks | Rate limiting |
| Data Exposure | Entity filtering |
| Memory Exhaustion | Resource limits |
| Network Sniffing | Local stdio transport |

## Performance Design

### Optimization Strategies

1. **Caching**
   - Entity state cache (5s TTL)
   - Service definition cache (60s TTL)
   - Reduces API calls by ~70%

2. **Connection Pooling**
   - Single WebSocket connection
   - Automatic reconnection
   - Exponential backoff

3. **Batch Operations**
   - Group multiple entity queries
   - Bulk service calls
   - Reduced round trips

4. **Memory Management**
   - Automatic cache eviction
   - Event buffer limits
   - Resource monitoring

### Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Response Time | <100ms | ~45ms |
| Memory Usage | <100MB | ~50MB |
| CPU Usage | <5% | <2% |
| Concurrent Connections | 10 | 10 |
| Cache Hit Rate | >60% | ~70% |

### Scalability Considerations

```
Vertical Scaling:
├── Increase max_clients (1-10)
├── Adjust cache TTL values
└── Modify rate limits

Horizontal Scaling:
├── Multiple add-on instances
├── Different ports per instance
└── Load balancer (future)
```

## Deployment Architecture

### Container Structure

```
Docker Container (Alpine Linux)
├── Node.js Runtime (v20)
├── MCP Server Application
├── Dependencies (minimal)
└── Configuration Files
```

### File System Layout

```
/
├── app/                    # Application code
│   ├── dist/              # Compiled JavaScript
│   ├── node_modules/      # Dependencies
│   └── package.json       # Package manifest
├── config/                # Configuration
│   └── options.json       # Add-on options
├── ssl/                   # SSL certificates (read-only)
└── data/                  # Persistent data
    ├── cache/            # Cache storage
    └── logs/             # Log files
```

### Multi-Architecture Support

```
Build Matrix:
├── armhf   → Raspberry Pi 2
├── armv7   → Raspberry Pi 3/4 (32-bit)
├── aarch64 → Raspberry Pi 3/4 (64-bit)
├── amd64   → Intel/AMD (64-bit)
└── i386    → Intel/AMD (32-bit)
```

### Resource Allocation

| Resource | Minimum | Recommended | Maximum |
|----------|---------|-------------|---------|
| Memory | 32MB | 64MB | 256MB |
| CPU | 0.1 core | 0.25 core | 0.5 core |
| Storage | 50MB | 100MB | 200MB |
| Network | 1 Mbps | 5 Mbps | 10 Mbps |

## Technical Stack

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20.x | JavaScript runtime |
| Language | TypeScript | 5.7.x | Type-safe development |
| Protocol | MCP | 1.0.0 | Model Context Protocol |
| Transport | stdio | - | Process communication |
| WebSocket | ws | 8.18.x | Real-time connection |
| Build | TypeScript Compiler | 5.7.x | Compilation |
| Test | Vitest | 3.2.x | Testing framework |

### Dependencies

#### Production Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `ws`: WebSocket client
- `dotenv`: Environment variables

#### Development Dependencies
- `typescript`: Type-safe JavaScript
- `tsx`: TypeScript execution
- `vitest`: Testing framework
- `@types/*`: Type definitions

### Build Pipeline

```
Source (TypeScript)
    ↓
Compilation (tsc)
    ↓
Bundle (dist/)
    ↓
Docker Build
    ↓
Multi-arch Images
    ↓
GitHub Registry
    ↓
Home Assistant Add-on
```

## Design Patterns

### Architectural Patterns

1. **Bridge Pattern**: MCP Server bridges two different protocols
2. **Observer Pattern**: Event subscriptions and notifications
3. **Strategy Pattern**: Different tool implementations
4. **Factory Pattern**: Tool creation and initialization
5. **Singleton Pattern**: WebSocket connection management
6. **Cache-Aside Pattern**: On-demand caching

### Code Organization

```typescript
// Separation of Concerns
interface Layer {
  Transport: stdio | tcp;
  Protocol: MCP;
  Business: Tools;
  Data: WebSocket;
  Cache: TTL;
}

// Dependency Injection
class MCPServer {
  constructor(
    private transport: Transport,
    private tools: Tool[],
    private websocket: WebSocketClient,
    private cache: CacheManager
  ) {}
}
```

## Future Architecture

### Planned Enhancements

1. **Clustering Support**
   - Multiple server instances
   - Redis-based cache sharing
   - Load balancing

2. **Plugin System**
   - Custom tool development
   - Third-party integrations
   - Dynamic loading

3. **Enhanced Security**
   - End-to-end encryption
   - Certificate-based auth
   - Audit trail

4. **Performance Improvements**
   - WebAssembly modules
   - Native bindings
   - GPU acceleration for AI

5. **Extended Protocol Support**
   - GraphQL API
   - REST fallback
   - MQTT integration

## Monitoring & Observability

### Metrics Collection

```
Application Metrics:
├── Request count
├── Response time
├── Error rate
├── Cache hit rate
└── Memory usage

System Metrics:
├── CPU utilization
├── Network I/O
├── Disk usage
└── Container health
```

### Logging Strategy

```
Log Levels:
├── DEBUG: Detailed debugging information
├── INFO: General operational messages
├── WARN: Warning conditions
├── ERROR: Error conditions
└── FATAL: Critical failures
```

### Health Checks

```javascript
// Health check endpoint
GET /health
{
  "status": "healthy",
  "version": "1.0.4",
  "uptime": 3600,
  "connections": {
    "websocket": "connected",
    "clients": 2
  },
  "cache": {
    "entities": 45,
    "hit_rate": 0.72
  }
}
```

## Development Workflow

### Local Development

```bash
# Setup
git clone https://github.com/mtebusi/HA_MCP
cd mcp-server
npm install

# Development
npm run dev

# Testing
npm test
npm run test:coverage

# Build
npm run build
```

### CI/CD Pipeline

```
GitHub Push
    ↓
Lint Check
    ↓
Type Check
    ↓
Unit Tests
    ↓
Build
    ↓
Docker Build
    ↓
Multi-arch Push
    ↓
Release
```

## Conclusion

The MCP Server architecture is designed for:
- **Security**: Multiple layers of protection
- **Performance**: Efficient caching and optimization
- **Reliability**: Automatic recovery and monitoring
- **Scalability**: Support for growth and extension
- **Maintainability**: Clean code organization

For implementation details, see:
- [API Documentation](mcp-server/API.md)
- [Development Guide](DEVELOPMENT.md)
- [Security Guidelines](mcp-server/SECURITY.md)