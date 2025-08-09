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
import * as http from 'http';
import * as net from 'net';
import { HomeAssistantWebSocket } from './websocket-client.js';
import { TOOL_DEFINITIONS } from './tools.js';
import { EntityState, Area, Device, ServiceDomain } from './types.js';

class HomeAssistantMCPServer {
  private server: Server;
  private ws: HomeAssistantWebSocket;
  private entityCache = new Map<string, EntityState>();
  private servicesCache: { [domain: string]: ServiceDomain } | null = null;
  private areasCache: Area[] | null = null;
  private devicesCache: Device[] | null = null;
  private stateSubscription: number | null = null;
  private eventSubscriptions = new Map<string, number>();
  private tcpServer: net.Server | null = null;

  constructor() {
    // Use supervisor connection for internal HA access
    const url = process.env.HOMEASSISTANT_URL || 'ws://supervisor/core/api/websocket';
    const token = process.env.HOMEASSISTANT_TOKEN || process.env.SUPERVISOR_TOKEN;

    if (!token) {
      throw new Error('Missing SUPERVISOR_TOKEN for Home Assistant connection');
    }

    console.log('[MCP Server] Initializing with Home Assistant connection');

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'homeassistant-mcp',
        version: '1.0.0',
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

  private setupWebSocketHandlers() {
    this.ws.on('connected', async () => {
      console.log('Connected to Home Assistant');
      await this.subscribeToStateChanges();
      await this.fetchInitialData();
    });

    this.ws.on('state_changed', (event: any) => {
      const entityId = event.data.entity_id;
      const newState = event.data.new_state;
      if (newState) {
        this.entityCache.set(entityId, newState);
      }
    });

    this.ws.on('disconnected', () => {
      console.log('Disconnected from Home Assistant');
      this.stateSubscription = null;
      this.eventSubscriptions.clear();
    });
  }

  private async subscribeToStateChanges() {
    try {
      const result = await this.ws.subscribeEvents('state_changed');
      this.stateSubscription = result.id;
      console.log('Subscribed to state changes');
    } catch (error) {
      console.error('Failed to subscribe to state changes:', error);
    }
  }

  private async fetchInitialData() {
    try {
      const states = await this.ws.getStates();
      states.forEach((state: EntityState) => {
        this.entityCache.set(state.entity_id, state);
      });

      this.servicesCache = await this.ws.getServices();
      this.areasCache = await this.ws.getAreas();
      this.devicesCache = await this.ws.getDevices();

      console.log(`Cached ${this.entityCache.size} entities`);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS,
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'homeassistant://entities',
          name: 'All Entities',
          description: 'List of all Home Assistant entities and their current states',
          mimeType: 'application/json',
        },
        {
          uri: 'homeassistant://areas',
          name: 'Areas',
          description: 'List of all configured areas in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'homeassistant://devices',
          name: 'Devices',
          description: 'List of all configured devices in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'homeassistant://services',
          name: 'Available Services',
          description: 'List of all available services that can be called',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'homeassistant://entities') {
        const entities = Array.from(this.entityCache.values());
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(entities, null, 2),
            },
          ],
        };
      } else if (uri === 'homeassistant://areas') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.areasCache || [], null, 2),
            },
          ],
        };
      } else if (uri === 'homeassistant://devices') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.devicesCache || [], null, 2),
            },
          ],
        };
      } else if (uri === 'homeassistant://services') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.servicesCache || {}, null, 2),
            },
          ],
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_entities':
            return await this.handleGetEntities(args);
          case 'get_entity_state':
            return await this.handleGetEntityState(args);
          case 'call_service':
            return await this.handleCallService(args);
          case 'get_history':
            return await this.handleGetHistory(args);
          case 'get_areas':
            return await this.handleGetAreas();
          case 'get_devices':
            return await this.handleGetDevices();
          case 'subscribe_events':
            return await this.handleSubscribeEvents(args);
          case 'get_services':
            return await this.handleGetServices(args);
          case 'get_logbook':
            return await this.handleGetLogbook(args);
          case 'fire_event':
            return await this.handleFireEvent(args);
          case 'validate_config':
            return await this.handleValidateConfig(args);
          case 'get_config':
            return await this.handleGetConfig();
          case 'restart_homeassistant':
            return await this.handleRestartHomeAssistant(args);
          case 'reload_config':
            return await this.handleReloadConfig(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // Tool handlers
  private async handleGetEntities(args: any) {
    const entities = Array.from(this.entityCache.values());
    let filtered = entities;

    if (args.domain) {
      filtered = filtered.filter(e => e.entity_id.startsWith(`${args.domain}.`));
    }
    if (args.area_id) {
      filtered = filtered.filter(e => e.area_id === args.area_id);
    }
    if (args.device_id) {
      filtered = filtered.filter(e => e.device_id === args.device_id);
    }
    if (args.state) {
      filtered = filtered.filter(e => e.state === args.state);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filtered, null, 2),
        },
      ],
    };
  }

  private async handleGetEntityState(args: any) {
    if (!args.entity_id) {
      throw new McpError(ErrorCode.InvalidParams, 'entity_id is required');
    }

    const state = this.entityCache.get(args.entity_id);
    if (!state) {
      throw new McpError(ErrorCode.InvalidParams, `Entity ${args.entity_id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  }

  private async handleCallService(args: any) {
    if (!args.domain || !args.service) {
      throw new McpError(ErrorCode.InvalidParams, 'domain and service are required');
    }

    const result = await this.ws.callService(
      args.domain,
      args.service,
      args.service_data || {},
      args.target || {}
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetHistory(args: any) {
    return {
      content: [
        {
          type: 'text',
          text: 'History access requires HTTP API integration. Please use the Home Assistant HTTP API for historical data.',
        },
      ],
    };
  }

  private async handleGetAreas() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.areasCache || [], null, 2),
        },
      ],
    };
  }

  private async handleGetDevices() {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.devicesCache || [], null, 2),
        },
      ],
    };
  }

  private async handleSubscribeEvents(args: any) {
    if (!args.event_type) {
      throw new McpError(ErrorCode.InvalidParams, 'event_type is required');
    }

    const result = await this.ws.subscribeEvents(args.event_type);
    this.eventSubscriptions.set(args.event_type, result.id);

    return {
      content: [
        {
          type: 'text',
          text: `Subscribed to ${args.event_type} events. Subscription ID: ${result.id}`,
        },
      ],
    };
  }

  private async handleGetServices(args: any) {
    const services = this.servicesCache || await this.ws.getServices();
    
    if (args.domain) {
      const domainServices = services[args.domain];
      if (!domainServices) {
        throw new McpError(ErrorCode.InvalidParams, `Domain ${args.domain} not found`);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ [args.domain]: domainServices }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(services, null, 2),
        },
      ],
    };
  }

  private async handleGetLogbook(args: any) {
    return {
      content: [
        {
          type: 'text',
          text: 'Logbook access requires HTTP API integration.',
        },
      ],
    };
  }

  private async handleFireEvent(args: any) {
    if (!args.event_type) {
      throw new McpError(ErrorCode.InvalidParams, 'event_type is required');
    }

    const result = await this.ws.fireEvent(args.event_type, args.event_data || {});

    return {
      content: [
        {
          type: 'text',
          text: `Event ${args.event_type} fired successfully`,
        },
      ],
    };
  }

  private async handleValidateConfig(args: any) {
    const result = await this.ws.validateConfig(args.config);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetConfig() {
    const config = await this.ws.getConfig();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }

  private async handleRestartHomeAssistant(args: any) {
    const safeMode = args.safe_mode || false;
    const result = await this.ws.callService(
      'homeassistant',
      safeMode ? 'restart_safe_mode' : 'restart',
      {}
    );

    return {
      content: [
        {
          type: 'text',
          text: `Home Assistant restart initiated${safeMode ? ' in safe mode' : ''}`,
        },
      ],
    };
  }

  private async handleReloadConfig(args: any) {
    if (!args.config_entry) {
      throw new McpError(ErrorCode.InvalidParams, 'config_entry is required');
    }

    const result = await this.ws.callService(
      'homeassistant',
      `reload_config_entry`,
      { entry_id: args.config_entry }
    );

    return {
      content: [
        {
          type: 'text',
          text: `Configuration ${args.config_entry} reloaded successfully`,
        },
      ],
    };
  }

  async run() {
    // Connect to Home Assistant
    await this.ws.connect();

    const port = parseInt(process.env.MCP_SERVER_PORT || '6789');
    
    // Create TCP server for stdio-over-TCP
    this.tcpServer = net.createServer((socket) => {
      console.log(`[MCP Server] Client connected from ${socket.remoteAddress}`);
      
      // Verify authentication if token is set
      const expectedToken = process.env.EXTERNAL_ACCESS_TOKEN;
      if (expectedToken) {
        let authenticated = false;
        
        socket.once('data', (data) => {
          const message = data.toString().trim();
          if (message === expectedToken) {
            authenticated = true;
            socket.write('AUTH_OK\n');
            
            // Set up stdio transport over TCP
            const transport = new StdioServerTransport();
            
            // Override stdio to use socket
            (transport as any).input = socket;
            (transport as any).output = socket;
            
            this.server.connect(transport).catch((error) => {
              console.error('[MCP Server] Failed to connect transport:', error);
              socket.end();
            });
          } else {
            socket.write('AUTH_FAILED\n');
            socket.end();
          }
        });
        
        // Timeout for authentication
        setTimeout(() => {
          if (!authenticated) {
            socket.end();
          }
        }, 5000);
      } else {
        // No authentication required
        const transport = new StdioServerTransport();
        
        // Override stdio to use socket
        (transport as any).input = socket;
        (transport as any).output = socket;
        
        this.server.connect(transport).catch((error) => {
          console.error('[MCP Server] Failed to connect transport:', error);
          socket.end();
        });
      }
      
      socket.on('error', (error) => {
        console.error('[MCP Server] Socket error:', error);
      });
      
      socket.on('close', () => {
        console.log('[MCP Server] Client disconnected');
      });
    });

    this.tcpServer.listen(port, '0.0.0.0', () => {
      console.log(`[MCP Server] Listening on port ${port}`);
      console.log(`[MCP Server] Ready for Claude Desktop connections`);
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});

// Start server
const server = new HomeAssistantMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});