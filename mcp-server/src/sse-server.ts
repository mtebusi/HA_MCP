/**
 * SSE/HTTP Server for Claude Desktop Connections
 * Implements the URL/SSE connection architecture for MCP
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { HomeAssistantWebSocket } from './websocket-client';
import { MCP_TOOLS, TOOL_HANDLERS } from './tools';
import { EntityState } from './types';
import { ResourceManager, CircuitBreaker, CommandQueue } from './resource-manager';
import { TokenManager, InputValidator, RateLimiter, SessionManager, AuditLogger } from './security';
import { HomeAssistantAuthProxy } from './ha-auth-proxy';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types';

export class HomeAssistantMCPSSEServer {
  private server: MCPServer;
  private httpServer!: ReturnType<typeof createServer>;
  private ws: HomeAssistantWebSocket;
  private entityCache = new Map<string, EntityState>();
  private entityFilter: { allowed: string[]; blocked: string[] };
  private isShuttingDown = false;
  private cacheTimeout?: NodeJS.Timeout;
  private readonly CACHE_TTL = 60000;
  private resourceManager: ResourceManager;
  private circuitBreaker: CircuitBreaker;
  private commandQueue: CommandQueue;
  private tokenManager: TokenManager;
  private inputValidator: InputValidator;
  private rateLimiter: RateLimiter;
  private sessionManager: SessionManager;
  private auditLogger: AuditLogger;
  private authProxy: HomeAssistantAuthProxy | null = null;
  private port: number;
  private useHAAuth: boolean;

  constructor() {
    // Get configuration from environment
    this.port = parseInt(process.env.MCP_PORT || '6789', 10);
    // Always use HomeAssistant OAuth2 authentication
    this.useHAAuth = true;
    
    // Use supervisor proxy for internal API access
    const url = process.env.HOMEASSISTANT_URL || 'ws://supervisor/core/api/websocket';
    const token = process.env.SUPERVISOR_TOKEN;

    if (!token) {
      throw new Error('SUPERVISOR_TOKEN not found. Ensure add-on has homeassistant_api access.');
    }

    // Initialize security components
    this.tokenManager = new TokenManager();
    this.inputValidator = new InputValidator();
    this.rateLimiter = new RateLimiter();
    this.sessionManager = new SessionManager();
    this.auditLogger = new AuditLogger();

    // Validate supervisor token
    if (!this.tokenManager.validateToken(token)) {
      this.auditLogger.log('ERROR', 'Invalid supervisor token format', undefined, { tokenLength: token.length });
      throw new Error('Invalid SUPERVISOR_TOKEN format');
    }

    // Parse entity filtering configuration
    this.entityFilter = {
      allowed: this.parseJsonConfig(process.env.ALLOWED_DOMAINS, []),
      blocked: this.parseJsonConfig(process.env.BLOCKED_ENTITIES, [])
    };

    console.log('[MCP SSE Server] Initializing Home Assistant connection');
    console.log(`[MCP SSE Server] Starting on port ${this.port}`);

    // Initialize MCP server
    this.server = new MCPServer(
      {
        name: 'homeassistant-mcp',
        version: '1.1.9',
        protocolVersion: '1.0.0',
        capabilities: {
          tools: true,
          resources: true,
          prompts: false,
          logging: false
        }
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize WebSocket client
    this.ws = new HomeAssistantWebSocket(url, token);
    
    // Initialize resource management
    this.resourceManager = new ResourceManager();
    this.circuitBreaker = new CircuitBreaker();
    this.commandQueue = new CommandQueue();

    // Initialize HomeAssistant auth proxy if enabled
    if (this.useHAAuth) {
      console.log('[MCP SSE Server] HomeAssistant authentication enabled');
      this.authProxy = new HomeAssistantAuthProxy();
      process.env.AUTH_PROXY_PORT = String(this.port + 300); // Auth proxy on separate port (e.g., 7089)
      process.env.EXTERNAL_URL = process.env.EXTERNAL_URL || `http://homeassistant.local:8123`;
    }

    // Setup handlers
    this.setupHandlers();
    this.setupWebSocketHandlers();
    this.setupHTTPServer();
  }

  private parseJsonConfig(value: string | undefined, defaultValue: any): any {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`[MCP SSE Server] Failed to parse JSON config: ${error}`);
      return defaultValue;
    }
  }

  private setupHTTPServer() {
    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for Claude Desktop
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Authentication check
      if (this.useHAAuth && this.authProxy) {
        // Validate HomeAssistant OAuth2 token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401, { 
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer realm="MCP Server", error="invalid_token"`
          });
          res.end(JSON.stringify({ 
            error: 'unauthorized',
            error_description: 'HomeAssistant OAuth2 Bearer token required'
          }));
          this.auditLogger.log('WARNING', 'HA authentication failed - missing bearer token', undefined, { 
            ip: req.socket.remoteAddress 
          });
          return;
        }

        const providedToken = authHeader.substring(7);
        const isValid = await this.authProxy.validateAccessToken(providedToken);
        
        if (!isValid) {
          res.writeHead(401, { 
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer realm="MCP Server", error="invalid_token"`
          });
          res.end(JSON.stringify({ 
            error: 'unauthorized',
            error_description: 'Invalid or expired HomeAssistant token'
          }));
          this.auditLogger.log('WARNING', 'HA invalid token attempt', undefined, { 
            ip: req.socket.remoteAddress 
          });
          return;
        }
      }

      // Rate limiting
      const clientId = req.socket.remoteAddress || 'unknown';
      if (!this.rateLimiter.checkLimit(clientId)) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
        this.auditLogger.log('WARNING', 'Rate limit exceeded', clientId, { 
          ip: clientId 
        });
        return;
      }

      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy',
          version: '1.1.9',
          websocket: this.ws ? 'connected' : 'disconnected',
          entities: this.entityCache.size
        }));
        return;
      }

      // SSE endpoint for MCP
      if (req.url === '/sse' || req.url === '/') {
        // Create SSE transport for this connection
        // The first parameter should be the endpoint path
        const transport = new SSEServerTransport('/sse', res);
        
        // Connect the transport to our MCP server
        this.server.connect(transport).catch(error => {
          console.error('[MCP SSE Server] Failed to connect transport:', error);
          this.auditLogger.log('ERROR', 'SSE transport connection failed', undefined, { 
            error: error.message 
          });
        });

        // Log successful connection
        this.auditLogger.log('INFO', 'SSE client connected', clientId, { 
          ip: clientId 
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.httpServer.on('error', (error) => {
      console.error('[MCP SSE Server] HTTP server error:', error);
      this.auditLogger.log('ERROR', 'HTTP server error', undefined, { error: error.message });
    });
  }

  private setupWebSocketHandlers() {
    this.ws.on('connected', async () => {
      console.log('[MCP SSE Server] Connected to Home Assistant Supervisor API');
      try {
        await this.subscribeToStateChanges();
        await this.fetchInitialData();
        this.scheduleCacheRefresh();
      } catch (error) {
        console.error('[MCP SSE Server] Failed to initialize data:', error);
      }
    });

    this.ws.on('state_changed', (event: any) => {
      try {
        const entityId = event.data?.entity_id;
        if (!entityId) return;
        
        if (this.isEntityAllowed(entityId)) {
          const newState = event.data.new_state;
          if (newState) {
            this.entityCache.set(entityId, newState);
          } else {
            this.entityCache.delete(entityId);
          }
        }
      } catch (error) {
        console.error('[MCP SSE Server] Error handling state change:', error);
      }
    });

    this.ws.on('disconnected', () => {
      console.log('[MCP SSE Server] Disconnected from Home Assistant');
      if (!this.isShuttingDown) {
        setTimeout(() => {
          this.ws.connect().catch(console.error);
        }, 5000);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('[MCP SSE Server] WebSocket error:', error.message);
    });
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MCP_TOOLS,
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'ha://entities',
          name: 'Home Assistant Entities',
          description: 'All accessible entities and their current states',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://areas',
          name: 'Areas',
          description: 'Configured areas in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://devices',
          name: 'Devices',
          description: 'Registered devices in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://services',
          name: 'Services',
          description: 'Available services that can be called',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://automations',
          name: 'Automations',
          description: 'Configured automations',
          mimeType: 'application/json',
        }
      ],
    }));

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'ha://entities': {
            const entities = Array.from(this.entityCache.values());
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(entities, null, 2),
              }],
            };
          }

          case 'ha://areas': {
            const areas = await this.ws.getAreas();
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(areas, null, 2),
              }],
            };
          }

          case 'ha://devices': {
            const devices = await this.ws.getDevices();
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(devices, null, 2),
              }],
            };
          }

          case 'ha://services': {
            const services = await this.ws.getServices();
            return {
              contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(services, null, 2),
              }],
            };
          }

          case 'ha://automations': {
            try {
              const automations = await this.ws.callService(
                'automation',
                'list',
                {},
                {}
              );
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(automations, null, 2),
                }],
              };
            } catch (error) {
              return {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({ error: 'Automation list not available' }, null, 2),
                }],
              };
            }
          }

          default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        console.error(`[MCP SSE Server] Resource read error for ${uri}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to read resource'
        );
      }
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Record activity
        this.resourceManager.recordActivity();
        
        // Check rate limit
        const identifier = name;
        
        if (!this.rateLimiter.checkLimit(identifier)) {
          this.auditLogger.log('WARNING', 'Rate limit exceeded', identifier, { tool: name });
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Rate limit exceeded. Please wait before making more requests.'
          );
        }
        
        // Validate tool exists
        const tool = MCP_TOOLS.find(t => t.name === name);
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Validate operation parameter
        const operation = args?.operation;
        if (!operation) {
          throw new McpError(ErrorCode.InvalidParams, 'operation parameter is required');
        }

        // Get operation handler
        const handler = TOOL_HANDLERS[name]?.[operation as string];
        if (!handler) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Unknown operation '${operation}' for tool '${name}'`
          );
        }

        // Sanitize input arguments
        // For now, just use args as-is since sanitizeObject doesn't exist
        const sanitized = args;

        // Execute operation
        let result;
        try {
          result = await this.circuitBreaker.execute(async () => {
            if (name === 'query' && ['entities', 'state'].includes(operation as string)) {
              return await this.handleCachedQuery(operation as string, sanitized);
            } else {
              return await handler(this.ws, sanitized);
            }
          });
        } catch (operationError: any) {
          console.error(`[MCP SSE Server] Operation error (${name}.${operation}):`, operationError);
          
          // Queue command if connection issue
          if (operationError.message?.includes('WebSocket') || operationError.message?.includes('connection')) {
            await this.commandQueue.enqueue({
              tool: name,
              operation: operation as string,
              args: sanitized
            });
            throw new McpError(
              ErrorCode.InternalError,
              'Command queued for execution when connection is restored'
            );
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            operationError.message || 'Operation failed'
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        console.error('[MCP SSE Server] Tool execution error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          'An error occurred processing your request'
        );
      }
    });
  }

  private async handleCachedQuery(operation: string, args: any): Promise<any> {
    if (operation === 'entities') {
      let entities = Array.from(this.entityCache.values());
      
      // Apply filters
      if (args.domain) {
        entities = entities.filter(e => e.entity_id.startsWith(`${args.domain}.`));
      }
      if (args.area_id) {
        entities = entities.filter(e => e.area_id === args.area_id);
      }
      if (args.device_id) {
        entities = entities.filter(e => e.device_id === args.device_id);
      }
      if (args.state_filter) {
        entities = entities.filter(e => e.state === args.state_filter);
      }
      if (!args.include_attributes) {
        entities = entities.map(e => ({
          entity_id: e.entity_id,
          state: e.state,
          last_changed: e.last_changed,
          last_updated: e.last_updated,
          context: e.context,
          area_id: e.area_id,
          device_id: e.device_id
        })) as EntityState[];
      }
      
      return entities;
    } else if (operation === 'state') {
      if (!args.entity_id) {
        throw new Error('entity_id required for state query');
      }
      const entity = this.entityCache.get(args.entity_id);
      if (!entity) {
        throw new Error(`Entity ${args.entity_id} not found`);
      }
      return entity;
    }
    throw new Error(`Unknown cached query operation: ${operation}`);
  }

  private isEntityAllowed(entityId: string): boolean {
    // Check if entity is blocked
    if (this.entityFilter.blocked.includes(entityId)) {
      return false;
    }

    // If allowed list is empty, allow all non-blocked
    if (this.entityFilter.allowed.length === 0) {
      return true;
    }

    // Check if entity domain is in allowed list
    const domain = entityId.split('.')[0];
    return this.entityFilter.allowed.includes(domain);
  }

  private async subscribeToStateChanges(): Promise<void> {
    try {
      await this.ws.subscribeEvents('state_changed');
      console.log('[MCP SSE Server] Subscribed to state changes');
    } catch (error) {
      console.error('[MCP SSE Server] Failed to subscribe to state changes:', error);
      throw error;
    }
  }

  private async fetchInitialData(): Promise<void> {
    try {
      const states = await this.ws.getStates();
      
      // Clear and rebuild cache
      this.entityCache.clear();
      
      states.forEach((state: EntityState) => {
        if (this.isEntityAllowed(state.entity_id)) {
          this.entityCache.set(state.entity_id, state);
        }
      });

      console.log(`[MCP SSE Server] Cached ${this.entityCache.size} entities`);
    } catch (error) {
      console.error('[MCP SSE Server] Failed to fetch initial data:', error);
      throw error;
    }
  }

  private scheduleCacheRefresh() {
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
    }
    
    this.cacheTimeout = setTimeout(() => {
      if (!this.isShuttingDown) {
        this.fetchInitialData().catch(console.error);
        this.scheduleCacheRefresh();
      }
    }, this.CACHE_TTL);
  }

  async run() {
    try {
      // Connect to Home Assistant
      await this.ws.connect();

      // Start HomeAssistant auth proxy if enabled
      if (this.authProxy) {
        await this.authProxy.start();
        
        console.log('\n===========================================');
        console.log('   Claude Desktop Connection Instructions');
        console.log('===========================================\n');
        console.log('1. In Claude Desktop, go to Settings → Connectors');
        console.log('2. Click "Add Custom Connector"');
        console.log('3. Enter the Discovery URL:');
        console.log(`   http://<your-ha-ip>:${this.port + 300}/.well-known/oauth-authorization-server`);
        console.log('\nThe connection will use HomeAssistant OAuth2 authentication.');
        console.log('You will be redirected to log in to your HomeAssistant instance.\n');
        console.log('===========================================\n');
      }

      // Start HTTP server
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`[MCP SSE Server] Server listening on http://0.0.0.0:${this.port}`);
        console.log(`[MCP SSE Server] SSE endpoint: http://<your-ha-ip>:${this.port}/sse`);
        
        if (this.useHAAuth) {
          console.log('[MCP SSE Server] HomeAssistant OAuth2 authentication enabled');
          console.log('[MCP SSE Server] Tokens are validated against your HA instance');
        } else {
          console.log('[MCP SSE Server] WARNING: Authentication disabled - server is open!');
          console.log('[MCP SSE Server] Set AUTH_MODE to enable security');
        }
      });
    } catch (error) {
      console.error('[MCP SSE Server] Failed to start:', error);
      this.cleanup();
      process.exit(1);
    }
  }

  private cleanup() {
    this.isShuttingDown = true;
    
    // Stop auth proxy
    if (this.authProxy) {
      this.authProxy.stop();
    }
    
    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    // Clear cache timeout
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = undefined;
    }
    
    // Clean up resource manager
    if (this.resourceManager) {
      this.resourceManager.cleanup();
    }
    
    // Clear command queue
    if (this.commandQueue) {
      this.commandQueue.clear();
    }
    
    // Clear entity cache
    this.entityCache.clear();
    
    // Cleanup security components
    if (this.sessionManager) {
      this.sessionManager.cleanup();
    }
    if (this.auditLogger) {
      this.auditLogger.log('INFO', 'Server shutting down', undefined);
    }
    
    // Disconnect WebSocket
    if (this.ws) {
      this.ws.disconnect();
    }
    
    console.log('[MCP SSE Server] Cleanup completed');
  }

  shutdown() {
    console.log('[MCP SSE Server] Shutting down gracefully...');
    this.cleanup();
    process.exit(0);
  }
}

// Global server instance
let server: HomeAssistantMCPSSEServer | null = null;

// Graceful shutdown handling
process.on('SIGINT', () => {
  if (server) {
    server.shutdown();
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  if (server) {
    server.shutdown();
  } else {
    process.exit(0);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[MCP SSE Server] Uncaught exception:', error);
  if (server) {
    server.shutdown();
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[MCP SSE Server] Unhandled rejection:', reason);
  if (server) {
    server.shutdown();
  } else {
    process.exit(1);
  }
});

// Start server if run directly (CommonJS version)
if (require.main === module) {
  server = new HomeAssistantMCPSSEServer();
  server.run().catch((error) => {
    console.error('[MCP SSE Server] Fatal error:', error);
    process.exit(1);
  });
}

export default HomeAssistantMCPSSEServer;