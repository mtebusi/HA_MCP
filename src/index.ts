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
import * as dotenv from 'dotenv';
import { HomeAssistantWebSocket } from './websocket-client.js';
import { TOOL_DEFINITIONS } from './tools.js';
import { EntityState, Area, Device, ServiceDomain } from './types.js';

// Load environment variables
dotenv.config();

class HomeAssistantMCPServer {
  private server: Server;
  private ws: HomeAssistantWebSocket;
  private entityCache = new Map<string, EntityState>();
  private servicesCache: { [domain: string]: ServiceDomain } | null = null;
  private areasCache: Area[] | null = null;
  private devicesCache: Device[] | null = null;
  private stateSubscription: number | null = null;
  private eventSubscriptions = new Map<string, number>();

  constructor() {
    // Validate configuration
    const url = process.env.HOMEASSISTANT_URL;
    const token = process.env.HOMEASSISTANT_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing required environment variables: HOMEASSISTANT_URL and HOMEASSISTANT_TOKEN'
      );
    }

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

    // Set up event handlers
    this.setupEventHandlers();
    this.setupMCPHandlers();
    
    // Initialize connection
    this.initializeConnection();
  }

  private setupEventHandlers() {
    this.ws.on('connected', () => {
      console.error('Connected to Home Assistant');
      this.subscribeToStateChanges();
    });

    this.ws.on('reconnected', () => {
      console.error('Reconnected to Home Assistant');
      this.refreshCaches();
    });

    this.ws.on('event', ({ event }) => {
      if (event.event_type === 'state_changed' && event.data) {
        const newState = event.data.new_state;
        if (newState) {
          this.entityCache.set(newState.entity_id, newState);
        }
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    this.ws.on('disconnected', () => {
      console.error('Disconnected from Home Assistant');
    });

    this.ws.on('max_reconnect_attempts', () => {
      console.error('Maximum reconnection attempts reached. Please check your configuration.');
    });
  }

  private async initializeConnection() {
    try {
      await this.ws.connect();
      await this.refreshCaches();
    } catch (error: any) {
      console.error('Failed to initialize connection:', error.message);
    }
  }

  private async subscribeToStateChanges() {
    try {
      this.stateSubscription = await this.ws.subscribeEvents('state_changed');
      console.error('Subscribed to state changes');
    } catch (error: any) {
      console.error('Failed to subscribe to state changes:', error.message);
    }
  }

  private async refreshCaches() {
    await this.refreshEntityCache();
    await this.refreshServicesCache();
    await this.refreshAreasCache();
    await this.refreshDevicesCache();
  }

  private async refreshEntityCache() {
    try {
      const states = await this.ws.getStates();
      this.entityCache.clear();
      for (const state of states) {
        this.entityCache.set(state.entity_id, state);
      }
      console.error(`Loaded ${states.length} entities`);
    } catch (error: any) {
      console.error('Failed to refresh entity cache:', error.message);
    }
  }

  private async refreshServicesCache() {
    try {
      this.servicesCache = await this.ws.getServices();
      const domainCount = Object.keys(this.servicesCache).length;
      console.error(`Loaded services for ${domainCount} domains`);
    } catch (error: any) {
      console.error('Failed to refresh services cache:', error.message);
    }
  }

  private async refreshAreasCache() {
    try {
      const result = await this.ws.getAreaRegistry();
      this.areasCache = result || [];
      console.error(`Loaded ${this.areasCache?.length || 0} areas`);
    } catch (error: any) {
      console.error('Failed to refresh areas cache:', error.message);
    }
  }

  private async refreshDevicesCache() {
    try {
      const result = await this.ws.getDeviceRegistry();
      this.devicesCache = result || [];
      console.error(`Loaded ${this.devicesCache?.length || 0} devices`);
    } catch (error: any) {
      console.error('Failed to refresh devices cache:', error.message);
    }
  }

  private setupMCPHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS,
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'ha://entities',
          name: 'All Entities',
          description: 'Current state of all Home Assistant entities',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://services',
          name: 'Available Services',
          description: 'All available Home Assistant services',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://areas',
          name: 'Areas',
          description: 'All configured areas in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://devices',
          name: 'Devices',
          description: 'All devices in Home Assistant',
          mimeType: 'application/json',
        },
        {
          uri: 'ha://config',
          name: 'Configuration',
          description: 'Home Assistant configuration',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'ha://entities': {
          const entities = Array.from(this.entityCache.values()).map((state) => ({
            entity_id: state.entity_id,
            state: state.state,
            attributes: state.attributes,
            last_changed: state.last_changed,
            last_updated: state.last_updated,
          }));

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(entities, null, 2),
              },
            ],
          };
        }

        case 'ha://services': {
          if (!this.servicesCache) {
            await this.refreshServicesCache();
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.servicesCache, null, 2),
              },
            ],
          };
        }

        case 'ha://areas': {
          if (!this.areasCache) {
            await this.refreshAreasCache();
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.areasCache, null, 2),
              },
            ],
          };
        }

        case 'ha://devices': {
          if (!this.devicesCache) {
            await this.refreshDevicesCache();
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.devicesCache, null, 2),
              },
            ],
          };
        }

        case 'ha://config': {
          const config = await this.ws.getConfig();

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(config, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    // Execute tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.executeTool(name, args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`Tool execution error (${name}):`, error.message);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                tool: name,
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_entities': {
        let entities = Array.from(this.entityCache.values());

        // Apply filters
        if (args.domain) {
          entities = entities.filter((e) => e.entity_id.startsWith(args.domain + '.'));
        }
        if (args.state) {
          entities = entities.filter((e) => e.state === args.state);
        }
        // TODO: Add area and device filtering when entity registry is available

        return entities.map((e) => ({
          entity_id: e.entity_id,
          state: e.state,
          friendly_name: e.attributes.friendly_name,
          attributes: e.attributes,
        }));
      }

      case 'get_entity_state': {
        const entity = this.entityCache.get(args.entity_id);
        if (!entity) {
          throw new Error(`Entity not found: ${args.entity_id}`);
        }
        return entity;
      }

      case 'call_service': {
        const result = await this.ws.callService(
          args.domain,
          args.service,
          args.service_data,
          args.target,
          args.return_response
        );

        return {
          success: true,
          service: `${args.domain}.${args.service}`,
          target: args.target,
          response: result,
        };
      }

      case 'get_history': {
        // Note: History API requires HTTP endpoint, not available via WebSocket
        // This would need to be implemented with an HTTP client
        return {
          message: 'History retrieval requires HTTP API access. Please configure HTTP endpoint.',
        };
      }

      case 'get_areas': {
        if (!this.areasCache) {
          await this.refreshAreasCache();
        }
        return this.areasCache;
      }

      case 'get_devices': {
        if (!this.devicesCache) {
          await this.refreshDevicesCache();
        }
        
        let devices = this.devicesCache || [];
        if (args.area_id) {
          devices = devices.filter((d: any) => d.area_id === args.area_id);
        }
        
        return devices;
      }

      case 'subscribe_events': {
        const eventType = args.event_type || 'all';
        
        // Check if already subscribed
        if (this.eventSubscriptions.has(eventType)) {
          return {
            message: `Already subscribed to ${eventType} events`,
            subscription_id: this.eventSubscriptions.get(eventType),
          };
        }

        const subscriptionId = await this.ws.subscribeEvents(
          eventType === 'all' ? undefined : eventType
        );
        
        this.eventSubscriptions.set(eventType, subscriptionId);

        return {
          success: true,
          event_type: eventType,
          subscription_id: subscriptionId,
          message: `Subscribed to ${eventType} events`,
        };
      }

      case 'get_services': {
        if (!this.servicesCache) {
          await this.refreshServicesCache();
        }

        if (args.domain) {
          return { [args.domain]: this.servicesCache![args.domain] };
        }
        
        return this.servicesCache;
      }

      case 'get_logbook': {
        // Note: Logbook API requires HTTP endpoint
        return {
          message: 'Logbook retrieval requires HTTP API access. Please configure HTTP endpoint.',
        };
      }

      case 'fire_event': {
        const result = await this.ws.fireEvent(args.event_type, args.event_data);
        
        return {
          success: true,
          event_type: args.event_type,
          context: result,
        };
      }

      case 'validate_config': {
        const result = await this.ws.validateConfig({
          trigger: args.trigger,
          condition: args.condition,
          action: args.action,
        });
        
        return result;
      }

      case 'get_config': {
        return await this.ws.getConfig();
      }

      case 'restart_homeassistant': {
        await this.ws.callService(
          'homeassistant',
          args.safe_mode ? 'restart_safe_mode' : 'restart'
        );
        
        return {
          success: true,
          message: `Home Assistant restart initiated${args.safe_mode ? ' in safe mode' : ''}`,
        };
      }

      case 'reload_config': {
        const reloadMap: { [key: string]: string } = {
          core: 'homeassistant.reload_core_config',
          automation: 'automation.reload',
          script: 'script.reload',
          scene: 'scene.reload',
          group: 'group.reload',
          all: 'homeassistant.reload_all',
        };

        const service = reloadMap[args.config_type];
        if (!service) {
          throw new Error(`Unknown config type: ${args.config_type}`);
        }

        const [domain, action] = service.split('.');
        await this.ws.callService(domain, action);
        
        return {
          success: true,
          message: `Configuration reloaded: ${args.config_type}`,
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  }

  async cleanup() {
    console.error('Cleaning up...');
    
    // Unsubscribe from all events
    if (this.stateSubscription !== null) {
      await this.ws.unsubscribe(this.stateSubscription);
    }
    
    for (const [type, id] of this.eventSubscriptions) {
      await this.ws.unsubscribe(id);
    }
    
    // Disconnect WebSocket
    this.ws.disconnect();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Home Assistant MCP Server v1.0.0 running');
    console.error(`Connected to: ${process.env.HOMEASSISTANT_URL}`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }
}

// Main entry point
async function main() {
  try {
    const server = new HomeAssistantMCPServer();
    await server.run();
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

main();