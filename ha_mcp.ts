#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import * as path from "path";
import WebSocket from "ws";
import { EventEmitter } from "events";

interface HAConfig {
  url: string;
  token: string;
  cacheTimeout?: number;
  maxBackups?: number;
  autoSubscribe?: boolean;
}

interface WSMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

interface EntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    [key: string]: any;
  };
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

interface ServiceDomain {
  [service: string]: {
    name: string;
    description: string;
    fields: {
      [field: string]: any;
    };
    response?: {
      optional: boolean;
      description: string;
    };
  };
}

class HomeAssistantWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pendingMessages = new Map<
    number,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  >();
  private subscriptions = new Map<number, string>();
  private authenticated = false;
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    super();
    this.url = url.replace(/^http/, "ws") + "/api/websocket";
    this.token = token;
  }

  async connect(): Promise<void> {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.authenticated
    ) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 10000);

      this.ws.on("open", () => {
        // Connection opened, waiting for auth_required
      });

      this.ws.on("message", (data) => {
        const msg: WSMessage = JSON.parse(data.toString());

        // Handle authentication flow
        if (msg.type === "auth_required") {
          this.ws!.send(
            JSON.stringify({
              type: "auth",
              access_token: this.token,
            })
          );
        } else if (msg.type === "auth_ok") {
          clearTimeout(timeout);
          this.authenticated = true;
          this.emit("connected");
          resolve();
        } else if (msg.type === "auth_invalid") {
          clearTimeout(timeout);
          this.authenticated = false;
          reject(new Error(msg.message || "Invalid authentication"));
        }
        // Handle command responses
        else if (msg.id && this.pendingMessages.has(msg.id)) {
          const pending = this.pendingMessages.get(msg.id)!;
          clearTimeout(pending.timeout);
          this.pendingMessages.delete(msg.id);

          if (msg.type === "result") {
            if (msg.success) {
              pending.resolve(msg.result);
            } else {
              pending.reject(new Error(msg.error?.message || "Command failed"));
            }
          }
        }
        // Handle subscribed events
        else if (msg.type === "event" && msg.id) {
          const subscription = this.subscriptions.get(msg.id);
          if (subscription) {
            this.emit(`subscription:${subscription}`, msg.event);
            this.emit("event", { subscription, event: msg.event });
          }
        }
      });

      this.ws.on("error", (error) => {
        this.emit("error", error);
        if (!this.authenticated) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.ws.on("close", () => {
        this.authenticated = false;
        this.emit("disconnected");
        // Clear all pending messages
        for (const [id, pending] of this.pendingMessages) {
          clearTimeout(pending.timeout);
          pending.reject(new Error("WebSocket closed"));
        }
        this.pendingMessages.clear();
      });
    });
  }

  async sendCommand(command: Omit<WSMessage, "id">): Promise<any> {
    if (!this.authenticated) {
      await this.connect();
    }

    const id = this.messageId++;
    const message: WSMessage = { id, ...command };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error(`Command timeout: ${command.type}`));
      }, 30000);

      this.pendingMessages.set(id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(message));
    });
  }

  async subscribeEvents(eventType?: string): Promise<number> {
    const command: any = { type: "subscribe_events" };
    if (eventType) {
      command.event_type = eventType;
    }

    const id = this.messageId;
    await this.sendCommand(command);
    this.subscriptions.set(id, eventType || "all");
    return id;
  }

  async subscribeTrigger(trigger: any): Promise<number> {
    const command = { type: "subscribe_trigger", trigger };
    const id = this.messageId;
    await this.sendCommand(command);
    this.subscriptions.set(id, `trigger_${JSON.stringify(trigger)}`);
    return id;
  }

  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.sendCommand({
      type: "unsubscribe_events",
      subscription: subscriptionId,
    });
    this.subscriptions.delete(subscriptionId);
  }

  async getStates(): Promise<EntityState[]> {
    return this.sendCommand({ type: "get_states" });
  }

  async getConfig(): Promise<any> {
    return this.sendCommand({ type: "get_config" });
  }

  async getServices(): Promise<{ [domain: string]: ServiceDomain }> {
    return this.sendCommand({ type: "get_services" });
  }

  async getPanels(): Promise<any> {
    return this.sendCommand({ type: "get_panels" });
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: any,
    returnResponse?: boolean
  ): Promise<any> {
    const command: any = {
      type: "call_service",
      domain,
      service,
    };

    if (serviceData) command.service_data = serviceData;
    if (target) command.target = target;
    if (returnResponse) command.return_response = true;

    return this.sendCommand(command);
  }

  async fireEvent(eventType: string, eventData?: any): Promise<any> {
    const command: any = {
      type: "fire_event",
      event_type: eventType,
    };
    if (eventData) command.event_data = eventData;
    return this.sendCommand(command);
  }

  async validateConfig(config: {
    trigger?: any;
    condition?: any;
    action?: any;
  }): Promise<any> {
    return this.sendCommand({
      type: "validate_config",
      ...config,
    });
  }

  async ping(): Promise<void> {
    await this.sendCommand({ type: "ping" });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
  }
}

class HomeAssistantMCPServer {
  private server: Server;
  private api: AxiosInstance;
  private ws: HomeAssistantWebSocket;
  private config: HAConfig;
  private entityCache = new Map<string, EntityState>();
  private servicesCache: { [domain: string]: ServiceDomain } | null = null;
  private backupsPath: string;
  private stateSubscription: number | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "homeassistant-mcp",
        version: "4.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.config = this.loadConfig();
    this.backupsPath = path.join(process.env.HOME || "", ".ha-mcp", "backups");
    this.ensureDirectories();

    // Initialize REST client
    this.api = axios.create({
      baseURL: `${this.config.url}/api`,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Initialize WebSocket
    this.ws = new HomeAssistantWebSocket(this.config.url, this.config.token);

    // Set up event handlers
    this.ws.on("connected", () => {
      console.error("WebSocket connected to Home Assistant");
      if (this.config.autoSubscribe !== false) {
        this.subscribeToStateChanges();
      }
    });

    this.ws.on("event", ({ event }) => {
      if (event.event_type === "state_changed" && event.data) {
        const newState = event.data.new_state;
        if (newState) {
          this.entityCache.set(newState.entity_id, newState);
        }
      }
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    this.setupHandlers();
    this.initializeConnection();
  }

  private loadConfig(): HAConfig {
    if (process.env.HA_URL && process.env.HA_TOKEN) {
      return {
        url: process.env.HA_URL,
        token: process.env.HA_TOKEN,
        cacheTimeout: parseInt(process.env.HA_CACHE_TIMEOUT || "60"),
        maxBackups: parseInt(process.env.HA_MAX_BACKUPS || "10"),
        autoSubscribe: process.env.HA_AUTO_SUBSCRIBE !== "false",
      };
    }

    try {
      const configPath = path.join(
        process.env.HOME || "",
        ".ha-mcp",
        "config.json"
      );
      return require(configPath);
    } catch {
      throw new Error("Configuration not found. Set HA_URL and HA_TOKEN.");
    }
  }

  private async ensureDirectories() {
    await fs.mkdir(this.backupsPath, { recursive: true }).catch(() => {});
  }

  private async initializeConnection() {
    try {
      await this.ws.connect();
      await this.refreshEntityCache();
      await this.refreshServicesCache();
    } catch (error) {
      console.error("Failed to initialize connection:", error);
    }
  }

  private async subscribeToStateChanges() {
    try {
      this.stateSubscription = await this.ws.subscribeEvents("state_changed");
      console.error("Subscribed to state changes");
    } catch (error) {
      console.error("Failed to subscribe to state changes:", error);
    }
  }

  private async refreshEntityCache() {
    try {
      const states = await this.ws.getStates();
      this.entityCache.clear();
      for (const state of states) {
        this.entityCache.set(state.entity_id, state);
      }
    } catch (error) {
      console.error("Failed to refresh entity cache:", error);
    }
  }

  private async refreshServicesCache() {
    try {
      this.servicesCache = await this.ws.getServices();
    } catch (error) {
      console.error("Failed to refresh services cache:", error);
    }
  }

  private searchEntities(
    query: string,
    options?: {
      domain?: string;
      area?: string;
      limit?: number;
    }
  ): Array<{ entity: EntityState; score: number; match_type: string }> {
    const results: Array<{
      entity: EntityState;
      score: number;
      match_type: string;
    }> = [];
    const queryLower = query.toLowerCase();
    const limit = options?.limit || 10;

    for (const [entityId, entity] of this.entityCache) {
      // Apply domain filter
      if (options?.domain && !entityId.startsWith(options.domain + "."))
        continue;

      let score = 0;
      let matchType = "none";

      const friendlyName = entity.attributes?.friendly_name || "";
      const friendlyNameLower = friendlyName.toLowerCase();

      // Exact entity_id match
      if (entityId === query) {
        score = 100;
        matchType = "exact_id";
      }
      // Exact friendly name match
      else if (friendlyNameLower === queryLower) {
        score = 95;
        matchType = "exact_name";
      }
      // Entity ID contains query
      else if (entityId.includes(queryLower)) {
        score = 70 + 30 * (queryLower.length / entityId.length);
        matchType = "partial_id";
      }
      // Friendly name contains query
      else if (friendlyNameLower.includes(queryLower)) {
        score = 60 + 30 * (queryLower.length / friendlyNameLower.length);
        matchType = "partial_name";
      }
      // Word-based fuzzy matching
      else {
        const queryWords = queryLower.split(/[\s_\-]+/);
        const entityWords = [
          ...entityId.split(/[\._\-]/),
          ...friendlyNameLower.split(/[\s_\-]+/),
        ];
        const matches = queryWords.filter((qw) =>
          entityWords.some((ew) => ew.includes(qw))
        );
        if (matches.length > 0) {
          score = 40 * (matches.length / queryWords.length);
          matchType = "fuzzy";
        }
      }

      if (score > 0) {
        results.push({ entity, score, match_type: matchType });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private resolveEntityReference(reference: string): EntityState | null {
    // Try exact match first
    if (this.entityCache.has(reference)) {
      return this.entityCache.get(reference)!;
    }

    // Search for best match
    const results = this.searchEntities(reference, { limit: 1 });
    return results.length > 0 ? results[0].entity : null;
  }

  private async backupConfig(type: string, content: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${type}_${timestamp}.yaml`;
    const filepath = path.join(this.backupsPath, filename);
    await fs.writeFile(filepath, content);

    // Clean old backups
    const files = await fs.readdir(this.backupsPath);
    const typeFiles = files.filter((f) => f.startsWith(type)).sort();
    const toDelete = typeFiles.slice(0, -1 * (this.config.maxBackups || 10));

    for (const file of toDelete) {
      await fs.unlink(path.join(this.backupsPath, file)).catch(() => {});
    }

    return filename;
  }

  private setupHandlers() {
    // Tools - Consolidated into 3 mega-tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ha_query",
          description:
            "Query and discover Home Assistant entities, services, areas, devices. Search with friendly names, get states, history, logbook. Actions: search_entities, get_state, get_history, get_logbook, get_services, get_areas, get_devices, get_calendars",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: [
                  "search_entities",
                  "get_state",
                  "get_history",
                  "get_logbook",
                  "get_services",
                  "get_areas",
                  "get_devices",
                  "get_calendars",
                ],
                description: "Query action to perform",
              },
              query: {
                type: "string",
                description: "Search query or entity reference",
              },
              entity_id: { type: "string", description: "Specific entity ID" },
              start_time: {
                type: "string",
                description: "ISO format start time",
              },
              end_time: { type: "string", description: "ISO format end time" },
              calendar_entity: {
                type: "string",
                description: "Calendar entity ID",
              },
              domain_filter: {
                type: "string",
                description: "Filter by domain",
              },
              limit: { type: "number", description: "Result limit" },
            },
            required: ["action"],
          },
        },
        {
          name: "ha_execute",
          description:
            "Execute actions in Home Assistant: call services, fire events, set states, run automations/scripts. Supports service responses. Actions: call_service, fire_event, set_state, toggle, turn_on, turn_off, validate_config",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: [
                  "call_service",
                  "fire_event",
                  "set_state",
                  "toggle",
                  "turn_on",
                  "turn_off",
                  "validate_config",
                ],
                description: "Execution action",
              },
              domain: { type: "string", description: "Service domain" },
              service: { type: "string", description: "Service name" },
              entity_id: {
                type: "string",
                description: "Target entity (supports friendly names)",
              },
              service_data: {
                type: "object",
                description: "Service call data",
              },
              target: {
                type: "object",
                description: "Service target specification",
              },
              return_response: {
                type: "boolean",
                description: "Get service response data",
              },
              event_type: { type: "string", description: "Event type to fire" },
              event_data: { type: "object", description: "Event data payload" },
              state: { type: "string", description: "New state value" },
              attributes: { type: "object", description: "State attributes" },
              config: {
                type: "object",
                description: "Config to validate (trigger/condition/action)",
              },
            },
            required: ["action"],
          },
        },
        {
          name: "ha_manage",
          description:
            "Manage Home Assistant system: subscribe to events, create automations, update configurations, restart, backup/restore. Actions: subscribe_events, unsubscribe, create_automation, update_config, restart, reload, backup, restore, check_config",
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: [
                  "subscribe_events",
                  "subscribe_trigger",
                  "unsubscribe",
                  "create_automation",
                  "update_config",
                  "restart",
                  "reload",
                  "backup",
                  "restore",
                  "check_config",
                ],
                description: "Management action",
              },
              event_type: {
                type: "string",
                description: "Event type to subscribe to",
              },
              trigger: {
                type: "object",
                description: "Trigger configuration for subscription",
              },
              subscription_id: {
                type: "number",
                description: "Subscription ID to unsubscribe",
              },
              automation: {
                type: "object",
                description: "Automation configuration",
              },
              config_type: {
                type: "string",
                description: "Configuration type",
              },
              config_content: {
                type: "string",
                description: "YAML configuration content",
              },
              backup_file: {
                type: "string",
                description: "Backup file to restore",
              },
            },
            required: ["action"],
          },
        },
      ],
    }));

    // Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "ha://states",
          name: "Current States",
          description: "All entity states with friendly names",
          mimeType: "application/json",
        },
        {
          uri: "ha://services",
          name: "Available Services",
          description: "All services with parameters and response support",
          mimeType: "application/json",
        },
        {
          uri: "ha://config",
          name: "System Configuration",
          description: "Home Assistant configuration",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        switch (uri) {
          case "ha://states":
            const states = Array.from(this.entityCache.values()).map(
              (state) => ({
                entity_id: state.entity_id,
                friendly_name:
                  state.attributes?.friendly_name || state.entity_id,
                state: state.state,
                attributes: state.attributes,
                last_changed: state.last_changed,
              })
            );

            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(states, null, 2),
                },
              ],
            };

          case "ha://services":
            if (!this.servicesCache) {
              await this.refreshServicesCache();
            }

            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(this.servicesCache, null, 2),
                },
              ],
            };

          case "ha://config":
            const config = await this.ws.getConfig();

            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(config, null, 2),
                },
              ],
            };

          default:
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown resource: ${uri}`
            );
        }
      }
    );

    // Tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ha_query":
            return await this.handleQuery(args);
          case "ha_execute":
            return await this.handleExecute(args);
          case "ha_manage":
            return await this.handleManage(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error: any) {
        // Proper error response per spec
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error.message,
                code: error.code || "unknown_error",
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleQuery(args: any) {
    switch (args.action) {
      case "search_entities": {
        if (!args.query) throw new Error("query required");

        const results = this.searchEntities(args.query, {
          domain: args.domain_filter,
          limit: args.limit,
        });

        const formatted = results.map((r) => ({
          entity_id: r.entity.entity_id,
          friendly_name:
            r.entity.attributes?.friendly_name || r.entity.entity_id,
          state: r.entity.state,
          match_score: Math.round(r.score),
          match_type: r.match_type,
          attributes: r.entity.attributes,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      case "get_state": {
        const entityId = args.entity_id || args.query;
        if (!entityId) throw new Error("entity_id or query required");

        const entity = this.resolveEntityReference(entityId);
        if (!entity) throw new Error(`Entity not found: ${entityId}`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  entity_id: entity.entity_id,
                  friendly_name: entity.attributes?.friendly_name,
                  state: entity.state,
                  attributes: entity.attributes,
                  last_changed: entity.last_changed,
                  last_updated: entity.last_updated,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_history": {
        const entityId = args.entity_id || args.query;
        const params = new URLSearchParams();

        if (args.start_time) params.append("start_time", args.start_time);
        if (args.end_time) params.append("end_time", args.end_time);
        if (entityId) params.append("filter_entity_id", entityId);

        const response = await this.api.get(
          `/history/period${
            args.start_time ? `/${args.start_time}` : ""
          }?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_logbook": {
        const params = new URLSearchParams();

        if (args.entity_id) params.append("entity", args.entity_id);
        if (args.start_time) params.append("start_time", args.start_time);
        if (args.end_time) params.append("end_time", args.end_time);

        const response = await this.api.get(
          `/logbook${args.start_time ? `/${args.start_time}` : ""}?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_services": {
        if (!this.servicesCache) {
          await this.refreshServicesCache();
        }

        const services = args.domain_filter
          ? { [args.domain_filter]: this.servicesCache![args.domain_filter] }
          : this.servicesCache;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(services, null, 2),
            },
          ],
        };
      }

      case "get_areas": {
        const panels = await this.ws.getPanels();
        const areas = panels.config?.areas || [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(areas, null, 2),
            },
          ],
        };
      }

      case "get_devices": {
        const config = await this.ws.getConfig();
        const devices = config.devices || [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      }

      case "get_calendars": {
        const response = await this.api.get("/calendars");
        const calendars = response.data;

        if (args.calendar_entity) {
          const params = new URLSearchParams();
          if (args.start_time) params.append("start", args.start_time);
          if (args.end_time) params.append("end", args.end_time);

          const events = await this.api.get(
            `/calendars/${args.calendar_entity}?${params}`
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(events.data, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(calendars, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown query action: ${args.action}`);
    }
  }

  private async handleExecute(args: any) {
    switch (args.action) {
      case "call_service": {
        if (!args.domain || !args.service) {
          throw new Error("domain and service required");
        }

        // Resolve entity reference if provided
        let target = args.target;
        if (args.entity_id && !target) {
          const entity = this.resolveEntityReference(args.entity_id);
          if (entity) {
            target = { entity_id: entity.entity_id };
          } else {
            target = { entity_id: args.entity_id };
          }
        }

        const result = await this.ws.callService(
          args.domain,
          args.service,
          args.service_data,
          target,
          args.return_response
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  service: `${args.domain}.${args.service}`,
                  target: target,
                  response: result?.response || null,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "fire_event": {
        if (!args.event_type) throw new Error("event_type required");

        const result = await this.ws.fireEvent(
          args.event_type,
          args.event_data
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  event_type: args.event_type,
                  context: result?.context,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "set_state": {
        if (!args.entity_id || !args.state) {
          throw new Error("entity_id and state required");
        }

        const entity = this.resolveEntityReference(args.entity_id);
        const entityId = entity ? entity.entity_id : args.entity_id;

        const response = await this.api.post(`/states/${entityId}`, {
          state: args.state,
          attributes: args.attributes || {},
        });

        return {
          content: [
            {
              type: "text",
              text: `State updated: ${entityId} = ${args.state}`,
            },
          ],
        };
      }

      case "toggle":
      case "turn_on":
      case "turn_off": {
        if (!args.entity_id) throw new Error("entity_id required");

        const entity = this.resolveEntityReference(args.entity_id);
        const entityId = entity ? entity.entity_id : args.entity_id;
        const domain = entityId.split(".")[0];

        await this.ws.callService(
          domain,
          args.action,
          {},
          { entity_id: entityId }
        );

        return {
          content: [
            {
              type: "text",
              text: `${args.action} executed for ${entityId}`,
            },
          ],
        };
      }

      case "validate_config": {
        if (!args.config) throw new Error("config required");

        const result = await this.ws.validateConfig(args.config);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown execute action: ${args.action}`);
    }
  }

  private async handleManage(args: any) {
    switch (args.action) {
      case "subscribe_events": {
        const subscriptionId = await this.ws.subscribeEvents(args.event_type);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                subscription_id: subscriptionId,
                event_type: args.event_type || "all",
              }),
            },
          ],
        };
      }

      case "subscribe_trigger": {
        if (!args.trigger) throw new Error("trigger required");

        const subscriptionId = await this.ws.subscribeTrigger(args.trigger);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                subscription_id: subscriptionId,
                trigger: args.trigger,
              }),
            },
          ],
        };
      }

      case "unsubscribe": {
        if (!args.subscription_id) throw new Error("subscription_id required");

        await this.ws.unsubscribe(args.subscription_id);

        return {
          content: [
            {
              type: "text",
              text: `Unsubscribed from subscription ${args.subscription_id}`,
            },
          ],
        };
      }

      case "restart": {
        await this.ws.callService("homeassistant", "restart");

        return {
          content: [
            {
              type: "text",
              text: "Home Assistant restart initiated",
            },
          ],
        };
      }

      case "reload": {
        const services = [
          "homeassistant.reload_all",
          "homeassistant.reload_config_entry",
          "homeassistant.reload_core_config",
        ];

        for (const service of services) {
          const [domain, action] = service.split(".");
          await this.ws.callService(domain, action).catch(() => {});
        }

        return {
          content: [
            {
              type: "text",
              text: "Configuration reloaded",
            },
          ],
        };
      }

      case "check_config": {
        const response = await this.api.post("/config/core/check_config");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "backup": {
        const timestamp = new Date().toISOString();
        const states = await this.ws.getStates();
        const config = await this.ws.getConfig();

        const backup = {
          timestamp,
          states: states,
          config: config,
        };

        const filename = await this.backupConfig(
          "full",
          JSON.stringify(backup, null, 2)
        );

        return {
          content: [
            {
              type: "text",
              text: `Backup created: ${filename}`,
            },
          ],
        };
      }

      case "restore": {
        if (!args.backup_file) throw new Error("backup_file required");

        const content = await fs.readFile(
          path.join(this.backupsPath, args.backup_file),
          "utf-8"
        );

        const backup = JSON.parse(content);

        // Restore states
        for (const state of backup.states) {
          await this.api
            .post(`/states/${state.entity_id}`, state)
            .catch(() => {});
        }

        return {
          content: [
            {
              type: "text",
              text: `Restored from backup: ${args.backup_file}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown manage action: ${args.action}`);
    }
  }

  async cleanup() {
    if (this.stateSubscription !== null) {
      await this.ws.unsubscribe(this.stateSubscription);
    }
    this.ws.disconnect();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Home Assistant MCP Server v4.0 running");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }
}

// Main
const server = new HomeAssistantMCPServer();
server.run().catch(console.error);
