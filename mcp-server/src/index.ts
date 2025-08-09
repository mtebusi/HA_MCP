#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { HomeAssistantWebSocket } from './websocket-client.js';
import { MCP_TOOLS, TOOL_HANDLERS } from './tools.js';
import { EntityState } from './types.js';

/**
 * Home Assistant MCP Server
 * 
 * Runs as an add-on within Home Assistant, providing MCP protocol
 * access to HA's capabilities through stdio transport.
 */
class HomeAssistantMCPServer {
  private server: Server;
  private ws: HomeAssistantWebSocket;
  private entityCache = new Map<string, EntityState>();
  private entityFilter: { allowed: string[]; blocked: string[] };
  private isShuttingDown = false;
  private cacheTimeout?: NodeJS.Timeout;
  private readonly CACHE_TTL = 60000; // 60 seconds cache TTL
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT = 100; // Max requests per minute
  private readonly RATE_WINDOW = 60000; // 1 minute window

  constructor() {
    // Use supervisor proxy for internal API access
    const url = process.env.HOMEASSISTANT_URL || 'ws://supervisor/core/api/websocket';
    const token = process.env.SUPERVISOR_TOKEN;

    if (!token) {
      throw new Error('SUPERVISOR_TOKEN not found. Ensure add-on has homeassistant_api access.');
    }

    // Parse entity filtering configuration safely
    this.entityFilter = {
      allowed: this.parseJsonConfig(process.env.ALLOWED_DOMAINS, []),
      blocked: this.parseJsonConfig(process.env.BLOCKED_ENTITIES, [])
    };

    console.log('[MCP Server] Initializing Home Assistant connection');
    console.log(`[MCP Server] Entity filtering: ${this.entityFilter.allowed.length} allowed domains, ${this.entityFilter.blocked.length} blocked entities`);

    // Initialize MCP server with proper metadata
    this.server = new Server(
      {
        name: 'homeassistant-mcp',
        version: '1.0.4',
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
    
    // Setup handlers
    this.setupHandlers();
    this.setupWebSocketHandlers();
  }

  private parseJsonConfig(value: string | undefined, defaultValue: any): any {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`[MCP Server] Failed to parse JSON config: ${error}`);
      return defaultValue;
    }
  }

  private setupWebSocketHandlers() {
    this.ws.on('connected', async () => {
      console.log('[MCP Server] Connected to Home Assistant Supervisor API');
      try {
        await this.subscribeToStateChanges();
        await this.fetchInitialData();
        this.scheduleCacheRefresh();
      } catch (error) {
        console.error('[MCP Server] Failed to initialize data:', error);
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
        console.error('[MCP Server] Error handling state change:', error);
      }
    });

    this.ws.on('disconnected', () => {
      console.log('[MCP Server] Disconnected from Home Assistant');
      if (!this.isShuttingDown) {
        setTimeout(() => {
          this.ws.connect().catch(console.error);
        }, 5000);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('[MCP Server] WebSocket error:', error.message);
    });
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
      console.log('[MCP Server] Subscribed to state changes');
    } catch (error) {
      console.error('[MCP Server] Failed to subscribe to state changes:', error);
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

      console.log(`[MCP Server] Cached ${this.entityCache.size} entities`);
    } catch (error) {
      console.error('[MCP Server] Failed to fetch initial data:', error);
      throw error;
    }
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

    // Read resource handler with error boundaries
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
        console.error(`[MCP Server] Resource read error for ${uri}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to read resource'
        );
      }
    });

    // Tool execution handler with validation and error boundaries
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check rate limit
        this.checkRateLimit(name);
        
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
        const sanitizedArgs = this.sanitizeArgs(args);

        // Execute operation with error boundary
        let result;
        try {
          if (name === 'query' && ['entities', 'state'].includes(operation as string)) {
            // Use cached data for entity queries
            result = await this.handleCachedQuery(operation as string, sanitizedArgs);
          } else {
            // Use WebSocket for other operations
            result = await handler(this.ws, sanitizedArgs);
          }
        } catch (operationError: any) {
          console.error(`[MCP Server] Operation error (${name}.${operation}):`, operationError);
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
        console.error('[MCP Server] Tool execution error:', error);
        throw new McpError(
          ErrorCode.InternalError,
          'An error occurred processing your request'
        );
      }
    });
  }

  private checkRateLimit(toolName: string): void {
    const now = Date.now();
    const key = toolName;
    const limit = this.rateLimiter.get(key);
    
    if (limit) {
      if (now < limit.resetTime) {
        if (limit.count >= this.RATE_LIMIT) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            'Rate limit exceeded. Please wait before making more requests.'
          );
        }
        limit.count++;
      } else {
        // Reset the window
        this.rateLimiter.set(key, { count: 1, resetTime: now + this.RATE_WINDOW });
      }
    } else {
      this.rateLimiter.set(key, { count: 1, resetTime: now + this.RATE_WINDOW });
    }
  }

  private sanitizeArgs(args: any): any {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(args));
    
    // Validate entity IDs
    const validateEntityId = (id: string): boolean => {
      return /^[a-z0-9_]+\.[a-z0-9_]+$/.test(id) && 
             !id.includes('..') && 
             id.length < 255;
    };
    
    // Remove any potential script injection attempts
    const sanitizeString = (str: string): string => {
      if (typeof str !== 'string') return str;
      // Remove potential code injection patterns and SQL injection attempts
      return str
        .replace(/[<>]/g, '')
        .replace(/['";]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .substring(0, 1000);
    };
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Special validation for entity_id fields
          if (key === 'entity_id' && typeof value === 'string') {
            if (!validateEntityId(value)) {
              throw new McpError(ErrorCode.InvalidParams, `Invalid entity ID: ${value}`);
            }
          }
          result[sanitizeString(key)] = sanitizeObject(value);
        }
        return result;
      }
      return obj;
    };
    
    return sanitizeObject(sanitized);
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

  async run() {
    try {
      // Connect to Home Assistant
      await this.ws.connect();

      // Use stdio transport (proper MCP approach)
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('[MCP Server] Running with stdio transport');
    } catch (error) {
      console.error('[MCP Server] Failed to start:', error);
      this.cleanup();
      process.exit(1);
    }
  }

  private cleanup() {
    this.isShuttingDown = true;
    
    // Clear cache timeout
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = undefined;
    }
    
    // Clear entity cache
    this.entityCache.clear();
    
    // Clear rate limiter
    this.rateLimiter.clear();
    
    // Disconnect WebSocket
    if (this.ws) {
      this.ws.disconnect();
    }
    
    console.log('[MCP Server] Cleanup completed');
  }

  shutdown() {
    console.log('[MCP Server] Shutting down gracefully...');
    this.cleanup();
    process.exit(0);
  }
}

// Global server instance
let server: HomeAssistantMCPServer | null = null;

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
  console.error('[MCP Server] Uncaught exception:', error);
  if (server) {
    server.shutdown();
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[MCP Server] Unhandled rejection:', reason);
  if (server) {
    server.shutdown();
  } else {
    process.exit(1);
  }
});

// Start server
server = new HomeAssistantMCPServer();
server.run().catch((error) => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});