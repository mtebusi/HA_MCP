# Development Guide

This guide provides everything you need to contribute to the MCP Server for Claude Home Assistant Add-on.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Building and Testing](#building-and-testing)
- [Contributing](#contributing)
- [Code Style](#code-style)
- [Testing Guidelines](#testing-guidelines)
- [Debugging](#debugging)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Docker** (for add-on testing)
- **Home Assistant** instance (for integration testing)
- **Git** for version control
- **VS Code** (recommended) or your preferred IDE

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mtebusi/HA_MCP.git
cd HA_MCP/mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/HA_MCP.git
cd HA_MCP

# Add upstream remote
git remote add upstream https://github.com/mtebusi/HA_MCP.git
```

### 2. Install Dependencies

```bash
cd mcp-server
npm install

# Install development tools globally (optional)
npm install -g typescript tsx vitest
```

### 3. Environment Configuration

Create a `.env` file for local development:

```bash
# .env
HOMEASSISTANT_URL=ws://localhost:8123/api/websocket
HOMEASSISTANT_TOKEN=your-long-lived-token
LOG_LEVEL=debug
NODE_ENV=development
```

### 4. VS Code Setup

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript
- Docker
- YAML
- GitLens

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Project Structure

```
HA_MCP/
├── .github/               # GitHub Actions workflows
│   └── workflows/        
├── mcp-server/           # Main add-on directory
│   ├── src/              # TypeScript source code
│   │   ├── index.ts      # Entry point
│   │   ├── server.ts     # MCP server
│   │   ├── tools/        # Tool implementations
│   │   ├── websocket/    # WebSocket client
│   │   ├── cache/        # Caching layer
│   │   └── utils/        # Utilities
│   ├── tests/            # Test files
│   ├── dist/             # Compiled JavaScript
│   ├── claude-extension/ # Claude Desktop files
│   ├── config.yaml       # Add-on configuration
│   ├── Dockerfile        # Container definition
│   ├── package.json      # Dependencies
│   └── tsconfig.json     # TypeScript config
└── scripts/              # Build and deploy scripts
```

### Source Code Organization

```typescript
// src/index.ts - Entry point
import { MCPServer } from './server';

// src/server.ts - Main server
export class MCPServer {
  // Server implementation
}

// src/tools/query.ts - Query tool
export class QueryTool implements Tool {
  // Query operations
}

// src/websocket/client.ts - WebSocket
export class WebSocketClient {
  // WebSocket management
}
```

## Building and Testing

### Build Commands

```bash
# Development build (with source maps)
npm run build

# Production build
npm run build:prod

# Watch mode (auto-rebuild)
npm run build:watch

# Clean build artifacts
npm run clean
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test src/tools/query.test.ts

# Run with UI
npm run test:ui
```

### Test Structure

```typescript
// tests/tools/query.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryTool } from '../../src/tools/query';

describe('QueryTool', () => {
  let tool: QueryTool;

  beforeEach(() => {
    tool = new QueryTool();
  });

  it('should list entities', async () => {
    const result = await tool.execute({
      operation: 'entities',
      domain: 'light'
    });
    
    expect(result).toHaveProperty('entities');
    expect(Array.isArray(result.entities)).toBe(true);
  });
});
```

### Docker Development

```bash
# Build Docker image locally
docker build -t homeassistant-mcp-server .

# Run container
docker run -it \
  -e HOMEASSISTANT_URL=ws://host.docker.internal:8123/api/websocket \
  -e HOMEASSISTANT_TOKEN=your-token \
  homeassistant-mcp-server

# Multi-architecture build
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t homeassistant-mcp-server .
```

## Contributing

### Contribution Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Submit** a pull request

### Branch Naming

- `feature/add-new-tool` - New features
- `fix/websocket-reconnect` - Bug fixes
- `docs/update-readme` - Documentation
- `chore/update-deps` - Maintenance
- `perf/optimize-cache` - Performance

### Commit Messages

Follow conventional commits:

```bash
# Format
<type>(<scope>): <subject>

# Examples
feat(tools): add energy monitoring tool
fix(websocket): handle connection timeout
docs(api): update control tool documentation
chore(deps): update typescript to 5.7
perf(cache): implement LRU eviction
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `perf`: Performance
- `test`: Testing
- `chore`: Maintenance

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Code Style

### TypeScript Guidelines

```typescript
// Use interfaces for object types
interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

// Use enums for constants
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Use async/await over promises
async function fetchEntity(id: string): Promise<EntityState> {
  const response = await websocket.send({ /* ... */ });
  return response.data;
}

// Prefer const over let
const MAX_RETRIES = 3;

// Use optional chaining
const state = entity?.attributes?.friendly_name ?? 'Unknown';

// Type all parameters and returns
function processEntity(
  entity: EntityState, 
  options?: ProcessOptions
): ProcessedEntity {
  // Implementation
}
```

### File Organization

```typescript
// 1. Imports (sorted)
import { WebSocket } from 'ws';
import { Tool } from '../types';
import { validateInput } from '../utils';

// 2. Constants
const DEFAULT_TIMEOUT = 30000;

// 3. Types/Interfaces
interface ToolConfig {
  name: string;
  timeout?: number;
}

// 4. Main class/function
export class QueryTool implements Tool {
  // Implementation
}

// 5. Helper functions
function parseResponse(data: any): ParsedData {
  // Implementation
}

// 6. Exports
export { QueryTool, ToolConfig };
```

### ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

## Testing Guidelines

### Test Categories

1. **Unit Tests**: Individual functions/methods
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Full workflow testing
4. **Performance Tests**: Load and stress testing

### Test File Structure

```typescript
// Standard test structure
describe('ComponentName', () => {
  // Setup
  beforeAll(() => { /* Global setup */ });
  beforeEach(() => { /* Test setup */ });
  afterEach(() => { /* Test cleanup */ });
  afterAll(() => { /* Global cleanup */ });

  // Group related tests
  describe('method/feature', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test implementation
    });

    it('should validate input', () => {
      // Test implementation
    });
  });
});
```

### Mocking

```typescript
// Mock WebSocket
vi.mock('ws', () => ({
  WebSocket: vi.fn(() => ({
    send: vi.fn(),
    on: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock Home Assistant responses
const mockEntities = [
  {
    entity_id: 'light.bedroom',
    state: 'on',
    attributes: { brightness: 255 }
  }
];
```

### Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical paths
- Focus on business logic
- Don't test third-party libraries

## Debugging

### Local Debugging

```typescript
// Add debug statements
import Debug from 'debug';
const debug = Debug('mcp:query');

debug('Processing query: %O', params);
```

### VS Code Debugging

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/mcp-server/dist/index.js",
      "preLaunchTask": "npm: build",
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Remote Debugging

```bash
# Start with inspector
node --inspect=0.0.0.0:9229 dist/index.js

# Connect Chrome DevTools
chrome://inspect
```

### Common Issues

1. **WebSocket Connection Fails**
   ```typescript
   // Check token and URL
   console.log('Token:', process.env.HOMEASSISTANT_TOKEN?.substring(0, 10));
   console.log('URL:', process.env.HOMEASSISTANT_URL);
   ```

2. **Tool Not Found**
   ```typescript
   // List registered tools
   console.log('Available tools:', server.getTools().map(t => t.name));
   ```

3. **Memory Leaks**
   ```bash
   # Profile memory usage
   node --inspect dist/index.js
   # Use Chrome DevTools Memory Profiler
   ```

## Release Process

### Version Management

Follow semantic versioning (MAJOR.MINOR.PATCH):

```bash
# Update version in all files
npm version patch  # 1.0.4 -> 1.0.5
npm version minor  # 1.0.4 -> 1.1.0
npm version major  # 1.0.4 -> 2.0.0
```

Files to update:
- `package.json`
- `config.yaml`
- `manifest.json`
- `CHANGELOG.md`

### Release Checklist

```markdown
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers synchronized
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Docker images built
- [ ] Claude extension packaged
- [ ] Release notes drafted
- [ ] PR approved and merged
```

### GitHub Release

```bash
# Tag the release
git tag -a v1.0.5 -m "Release version 1.0.5"
git push origin v1.0.5

# GitHub CLI
gh release create v1.0.5 \
  --title "Release v1.0.5" \
  --notes-file RELEASE_NOTES.md \
  --target main
```

### Add-on Deployment

1. **Build Docker images**
   ```bash
   ./scripts/build-addon.sh
   ```

2. **Push to registry**
   ```bash
   docker push ghcr.io/mtebusi/homeassistant-mcp-server
   ```

3. **Update repository**
   ```bash
   git push origin main
   ```

4. **Test installation**
   - Add repository to test HA instance
   - Install and configure add-on
   - Verify functionality

## Development Tools

### Recommended Tools

- **TypeScript**: Type-safe development
- **Vitest**: Fast unit testing
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitizen**: Commit formatting
- **Semantic Release**: Automated releases

### Useful Scripts

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check

# Bundle size analysis
npm run analyze

# Update dependencies
npm run update-deps

# Security audit
npm audit
```

### Performance Profiling

```typescript
// Add performance markers
performance.mark('query-start');
// ... operation ...
performance.mark('query-end');
performance.measure('query', 'query-start', 'query-end');

const measure = performance.getEntriesByName('query')[0];
console.log(`Query took ${measure.duration}ms`);
```

## Resources

### Documentation
- [MCP Specification](https://github.com/anthropics/mcp)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/websocket)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Community
- [GitHub Discussions](https://github.com/mtebusi/HA_MCP/discussions)
- [Home Assistant Community](https://community.home-assistant.io/)
- [Discord Server](https://discord.gg/home-assistant)

### Learning Resources
- [MCP Tutorial](https://docs.anthropic.com/mcp)
- [WebSocket Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Docker for Node.js](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## Support

If you need help:

1. Check existing [issues](https://github.com/mtebusi/HA_MCP/issues)
2. Search [discussions](https://github.com/mtebusi/HA_MCP/discussions)
3. Read the [FAQ](FAQ.md)
4. Ask in [Discord](https://discord.gg/home-assistant)
5. Create a new issue with details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.