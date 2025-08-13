import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { HomeAssistantBridge } from './ha-bridge';
import { LLMTool } from './types';

export class LLMApiIntegration {
  private bridge: HomeAssistantBridge;
  private tools: Map<string, LLMTool> = new Map();

  constructor(bridge: HomeAssistantBridge) {
    this.bridge = bridge;
    this.initializeBuiltInTools();
  }

  private initializeBuiltInTools() {
    // Assist API tools
    this.addTool({
      name: "assist_intent",
      description: "Process natural language commands using Home Assistant's Assist API",
      parameters: {
        type: "object",
        properties: {
          text: { 
            type: "string", 
            description: "Natural language command" 
          },
          language: { 
            type: "string", 
            description: "Language code (default: en)",
            default: "en"
          }
        },
        required: ["text"]
      },
      handler: async (args) => {
        return await this.bridge.executeIntent(args.text, args.language);
      }
    });

    // Conversation API
    this.addTool({
      name: "conversation_process",
      description: "Process conversation with Home Assistant's conversation agent",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          conversation_id: { type: "string" },
          language: { type: "string", default: "en" }
        },
        required: ["text"]
      },
      handler: async (args) => {
        return await this.bridge.processConversation(
          args.text,
          args.conversation_id,
          args.language
        );
      }
    });

    // Area-based control
    this.addTool({
      name: "area_control",
      description: "Control all devices in a specific area",
      parameters: {
        type: "object",
        properties: {
          area: { type: "string", description: "Area name or ID" },
          action: { 
            type: "string", 
            enum: ["turn_on", "turn_off", "toggle"],
            description: "Action to perform"
          }
        },
        required: ["area", "action"]
      },
      handler: async (args) => {
        const devices = await this.bridge.getAreaDevices(args.area);
        const results = [];
        
        for (const device of devices) {
          try {
            const [domain] = device.entity_id.split('.');
            const result = await this.bridge.callService(
              domain,
              args.action,
              device.entity_id
            );
            results.push({ entity_id: device.entity_id, success: true });
          } catch (error) {
            results.push({ entity_id: device.entity_id, success: false, error });
          }
        }
        
        return { area: args.area, action: args.action, results };
      }
    });

    // Template rendering
    this.addTool({
      name: "render_template",
      description: "Render a Home Assistant template",
      parameters: {
        type: "object",
        properties: {
          template: { 
            type: "string", 
            description: "Jinja2 template to render" 
          }
        },
        required: ["template"]
      },
      handler: async (args) => {
        return await this.bridge.renderTemplate(args.template);
      }
    });

    // Expose LLM context data
    this.addTool({
      name: "get_llm_context",
      description: "Get context data for LLM including available entities and areas",
      parameters: {
        type: "object",
        properties: {
          include_entities: { type: "boolean", default: true },
          include_areas: { type: "boolean", default: true },
          include_devices: { type: "boolean", default: true },
          include_services: { type: "boolean", default: true }
        }
      },
      handler: async (args) => {
        const context: any = {};
        
        if (args.include_entities !== false) {
          context.entities = await this.bridge.getExposedEntities();
        }
        if (args.include_areas !== false) {
          context.areas = await this.bridge.getAreas();
        }
        if (args.include_devices !== false) {
          context.devices = await this.bridge.getDevices();
        }
        if (args.include_services !== false) {
          context.services = await this.bridge.getServices();
        }
        
        return context;
      }
    });
  }

  addTool(tool: LLMTool) {
    this.tools.set(tool.name, tool);
  }

  registerTools(server: McpServer) {
    // Register tools using McpServer API
    for (const [name, tool] of this.tools) {
      server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema: tool.parameters
        },
        tool.handler
      );
    }

    // Register resource providers for LLM context
    server.registerResource(
      "ha-entities",
      "ha://entities",
      {
        title: "Home Assistant Entities",
        description: "All exposed Home Assistant entities"
      },
      async () => ({
        contents: [{
          uri: "ha://entities",
          text: JSON.stringify(await this.bridge.getExposedEntities(), null, 2),
          mimeType: "application/json"
        }]
      })
    );

    server.registerResource(
      "ha-areas",
      "ha://areas",
      {
        title: "Home Assistant Areas",
        description: "All configured areas"
      },
      async () => ({
        contents: [{
          uri: "ha://areas",
          text: JSON.stringify(await this.bridge.getAreas(), null, 2),
          mimeType: "application/json"
        }]
      })
    );

    // Register prompt templates
    server.registerPrompt(
      "control_device",
      {
        title: "Control Device",
        description: "Template for controlling Home Assistant devices",
        argsSchema: {
          device: z.string().describe("Device or entity to control"),
          action: z.string().describe("Action to perform")
        }
      },
      async (args: { device: string; action: string }) => ({
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Control the ${args.device} by performing action: ${args.action}`
          }
        }]
      })
    );

    server.registerPrompt(
      "query_state",
      {
        title: "Query State",
        description: "Template for querying device states",
        argsSchema: {
          entity: z.string().describe("Entity to query")
        }
      },
      async (args: { entity: string }) => ({
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `What is the current state of ${args.entity}?`
          }
        }]
      })
    );

    server.registerPrompt(
      "automation_trigger",
      {
        title: "Trigger Automation",
        description: "Template for triggering automations",
        argsSchema: {
          automation: z.string().describe("Automation to trigger"),
          context: z.string().describe("Additional context")
        }
      },
      async (args: { automation: string; context: string }) => ({
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Trigger the ${args.automation} automation with context: ${args.context}`
          }
        }]
      })
    );
  }

  async provideLLMData(context: any, apiIds?: string[], userPrompt?: string): Promise<any> {
    const data = {
      tools: Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      })),
      api_prompt: userPrompt || "You can control Home Assistant devices and query their states.",
      context: await this.bridge.getExposedEntities()
    };

    return data;
  }
}