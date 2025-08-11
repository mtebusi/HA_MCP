/**
 * Simplified SSE/HTTP Server for Claude Desktop Connections
 * Works with HomeAssistant Supervisor Token for internal access
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { HomeAssistantWebSocket } from './websocket-client';
import { MCP_TOOLS, TOOL_HANDLERS } from './tools';
import { EntityState } from './types';
import { ResourceManager, CircuitBreaker, CommandQueue } from './resource-manager';
import { AuditLogger } from './security';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types';

export class SimplifiedMCPSSEServer {
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
  private auditLogger: AuditLogger;
  private port: number;

  constructor() {
    // Get configuration from environment
    this.port = parseInt(process.env.PORT || '6789', 10);
    
    // Use supervisor proxy for internal API access or direct URL for testing
    const homeassistantUrl = process.env.HOMEASSISTANT_URL || 'http://supervisor/core';
    const wsUrl = homeassistantUrl.replace(/^https?:/, 'ws:');
    const url = wsUrl.endsWith('/api/websocket') ? wsUrl : `${wsUrl}/api/websocket`;
    const token = process.env.SUPERVISOR_TOKEN;

    if (!token) {
      throw new Error('SUPERVISOR_TOKEN not found. Ensure add-on has homeassistant_api access.');
    }

    // Initialize components
    this.auditLogger = new AuditLogger();

    // Parse entity filtering configuration
    this.entityFilter = {
      allowed: this.parseJsonConfig(process.env.ALLOWED_DOMAINS, []),
      blocked: this.parseJsonConfig(process.env.BLOCKED_ENTITIES, [])
    };

    console.log('[MCP SSE Server] Initializing Home Assistant connection');
    console.log(`[MCP SSE Server] Starting on port ${this.port}`);
    console.log(`[MCP SSE Server] Using supervisor token for authentication`);

    // Initialize MCP server
    this.server = new MCPServer(
      {
        name: 'homeassistant-mcp',
        version: '1.2.1',
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

    // Initialize resource management
    this.resourceManager = new ResourceManager();
    this.circuitBreaker = new CircuitBreaker(5, 60000, 30000);
    this.commandQueue = new CommandQueue(100, 60000);
    
    // Initialize WebSocket client with supervisor token
    this.ws = new HomeAssistantWebSocket(url, token);
    
    // Set up handlers
    this.setupHandlers();
    this.setupWebSocketHandlers();
    this.setupHTTPServer();
  }

  private parseJsonConfig(value: string | undefined, defaultValue: string[]): string[] {
    if (!value) return defaultValue;
    try {
      const parsed = value.includes(',') ? value.split(',').map(s => s.trim()) : JSON.parse(value);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setupHTTPServer() {
    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS for all origins (since we're running inside HA)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HA-Access');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // For ingress requests, check X-HA-Access header
      const hasIngressAuth = req.headers['x-ha-access'] !== undefined;
      
      // Health check endpoint (always accessible)
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy',
          version: '1.2.1',
          websocket: this.ws ? 'connected' : 'disconnected',
          entities: this.entityCache.size,
          ingress: hasIngressAuth
        }));
        return;
      }

      // SSE endpoint for MCP (main endpoint)
      if (req.url === '/sse' || req.url === '/' || req.url?.startsWith('/api/mcp')) {
        console.log('[MCP SSE Server] Client connecting:', {
          url: req.url,
          ingress: hasIngressAuth,
          headers: Object.keys(req.headers)
        });

        // Create SSE transport for this connection
        const transport = new SSEServerTransport('/sse', res);
        
        // Connect the transport to our MCP server
        this.server.connect(transport).catch(error => {
          console.error('[MCP SSE Server] Failed to connect transport:', error);
          this.auditLogger.log('ERROR', 'SSE transport connection failed', undefined, { 
            error: error.message 
          });
        });

        // Log successful connection
        const clientId = req.socket.remoteAddress || 'unknown';
        this.auditLogger.log('INFO', 'SSE client connected', clientId, { 
          ip: clientId,
          ingress: hasIngressAuth
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
    this.ws.on('connected', () => {
      console.log('[MCP SSE Server] WebSocket connected to Home Assistant');
      this.fetchInitialData();
    });

    this.ws.on('state_changed', (event: any) => {
      const entity = event.data.new_state;
      if (entity && this.shouldIncludeEntity(entity.entity_id)) {
        this.entityCache.set(entity.entity_id, entity);
      }
    });

    this.ws.on('disconnected', () => {
      console.error('[MCP SSE Server] WebSocket disconnected from Home Assistant');
      // Implement reconnection logic
      if (!this.isShuttingDown) {
        setTimeout(() => {
          console.log('[MCP SSE Server] Attempting to reconnect...');
          this.ws.connect().catch(err => {
            console.error('[MCP SSE Server] Reconnection failed:', err);
          });
        }, 5000);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('[MCP SSE Server] WebSocket error:', error);
      this.auditLogger.log('ERROR', 'WebSocket error', undefined, { error: error.message });
    });
  }

  private setupHandlers() {
    // Tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MCP_TOOLS
    }));

    // Tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const handler = TOOL_HANDLERS[name];
      if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      try {
        const result = await this.circuitBreaker.execute(async () => {
          return await (handler as any)(this.ws, args || {});
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error: any) {
        // If circuit breaker is open, try queue
        if (error.message?.includes('Circuit breaker is OPEN')) {
          await this.commandQueue.enqueue({
            tool: name,
            args: args || {},
            timestamp: Date.now()
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'queued',
                  message: 'Command queued due to temporary connection issues. It will be executed when connection is restored.'
                })
              }
            ]
          };
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });

    // Resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const entities = Array.from(this.entityCache.values())
        .filter(entity => this.shouldIncludeEntity(entity.entity_id));
      
      return {
        resources: entities.map(entity => ({
          uri: `ha://entity/${entity.entity_id}`,
          name: entity.attributes.friendly_name || entity.entity_id,
          description: `State: ${entity.state}`,
          mimeType: 'application/json'
        }))
      };
    });

    // Resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (!uri.startsWith('ha://entity/')) {
        throw new McpError(ErrorCode.InvalidRequest, 'Invalid resource URI');
      }
      
      const entityId = uri.substring(12);
      const entity = this.entityCache.get(entityId);
      
      if (!entity) {
        throw new McpError(ErrorCode.InvalidRequest, `Entity not found: ${entityId}`);
      }
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(entity, null, 2)
          }
        ]
      };
    });
  }

  private async fetchInitialData() {
    try {
      // Get all states using WebSocket API
      const states = await this.ws.getStates();
      if (Array.isArray(states)) {
        states.forEach((entity: EntityState) => {
          if (this.shouldIncludeEntity(entity.entity_id)) {
            this.entityCache.set(entity.entity_id, entity);
          }
        });
        console.log(`[MCP SSE Server] Loaded ${this.entityCache.size} entities`);
      }
      
      // Subscribe to state changes
      await this.ws.subscribeEvents('state_changed');
    } catch (error) {
      console.error('[MCP SSE Server] Failed to fetch initial data:', error);
    }
  }

  private shouldIncludeEntity(entityId: string): boolean {
    // Check if entity is blocked
    if (this.entityFilter.blocked.includes(entityId)) {
      return false;
    }
    
    // If no allowed domains specified, include all (except blocked)
    if (this.entityFilter.allowed.length === 0) {
      return true;
    }
    
    // Check if entity domain is allowed
    const domain = entityId.split('.')[0];
    return this.entityFilter.allowed.includes(domain);
  }

  async start() {
    try {
      // Connect to Home Assistant
      await this.ws.connect();
      
      // Start HTTP server
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`[MCP SSE Server] Server running on http://0.0.0.0:${this.port}`);
        console.log('[MCP SSE Server] Ready for Claude Desktop connections');
        console.log('[MCP SSE Server] Access via HomeAssistant ingress or direct port');
      });
    } catch (error) {
      console.error('[MCP SSE Server] Failed to start:', error);
      process.exit(1);
    }
  }

  async stop() {
    this.isShuttingDown = true;
    
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    if (this.ws) {
      this.ws.disconnect();
    }
  }
}

// Start the server if run directly
if (require.main === module) {
  const server = new SimplifiedMCPSSEServer();
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[MCP SSE Server] Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('[MCP SSE Server] Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  // Start the server
  server.start().catch(error => {
    console.error('[MCP SSE Server] Fatal error:', error);
    process.exit(1);
  });
}