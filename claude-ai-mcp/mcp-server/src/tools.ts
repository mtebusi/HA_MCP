import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { HomeAssistantBridge } from './ha-bridge';

export function setupTools(server: McpServer, bridge: HomeAssistantBridge) {
  // Turn on/off a device or entity
  server.registerTool(
    "turn_on",
    {
      title: "Turn On Device",
      description: "Turn on a Home Assistant device or entity",
      inputSchema: {
        entity_id: z.string().describe("The entity ID to turn on (e.g., light.living_room)")
      }
    },
    async (args: { entity_id: string }) => {
      const [domain] = args.entity_id.split('.');
      const result = await bridge.callService(domain, 'turn_on', args.entity_id);
      return {
        content: [{
          type: "text" as const,
          text: `Turned on ${args.entity_id}`
        }]
      };
    }
  );

  server.registerTool(
    "turn_off",
    {
      title: "Turn Off Device",
      description: "Turn off a Home Assistant device or entity",
      inputSchema: {
        entity_id: z.string().describe("The entity ID to turn off")
      }
    },
    async (args: { entity_id: string }) => {
      const [domain] = args.entity_id.split('.');
      const result = await bridge.callService(domain, 'turn_off', args.entity_id);
      return {
        content: [{
          type: "text" as const,
          text: `Turned off ${args.entity_id}`
        }]
      };
    }
  );

  // Toggle a device
  server.registerTool(
    "toggle",
    {
      title: "Toggle Device",
      description: "Toggle a Home Assistant device or entity",
      inputSchema: {
        entity_id: z.string().describe("The entity ID to toggle")
      }
    },
    async (args: { entity_id: string }) => {
      const [domain] = args.entity_id.split('.');
      const result = await bridge.callService(domain, 'toggle', args.entity_id);
      return {
        content: [{
          type: "text" as const,
          text: `Toggled ${args.entity_id}`
        }]
      };
    }
  );

  // Call any service
  server.registerTool(
    "call_service",
    {
      title: "Call Service",
      description: "Call any Home Assistant service",
      inputSchema: {
        domain: z.string().describe("Service domain (e.g., light, switch)"),
        service: z.string().describe("Service name (e.g., turn_on)"),
        entity_id: z.string().optional().describe("Target entity ID"),
        data: z.record(z.any()).optional().describe("Additional service data")
      }
    },
    async (args: { domain: string; service: string; entity_id?: string; data?: Record<string, any> }) => {
      const result = await bridge.callService(args.domain, args.service, args.entity_id, args.data);
      return {
        content: [{
          type: "text" as const,
          text: `Called ${args.domain}.${args.service}${args.entity_id ? ` on ${args.entity_id}` : ''}`
        }]
      };
    }
  );

  // Get entity state
  server.registerTool(
    "get_state",
    {
      title: "Get Entity State",
      description: "Get the current state of a Home Assistant entity",
      inputSchema: {
        entity_id: z.string().describe("The entity ID to get state for")
      }
    },
    async (args: { entity_id: string }) => {
      const states = await bridge.getStates(args.entity_id);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(states, null, 2)
        }]
      };
    }
  );

  // Get all states
  server.registerTool(
    "get_all_states",
    {
      title: "Get All States",
      description: "Get the state of all Home Assistant entities",
      inputSchema: {}
    },
    async () => {
      const states = await bridge.getStates();
      const statesList = Array.isArray(states) ? states : [states];
      const summary = statesList.map((entity: any) => ({
        entity_id: entity.entity_id,
        state: entity.state,
        friendly_name: entity.attributes?.friendly_name
      }));
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(summary, null, 2)
        }]
      };
    }
  );

  // Get entity history
  server.registerTool(
    "get_history",
    {
      title: "Get Entity History",
      description: "Get the history of a Home Assistant entity",
      inputSchema: {
        entity_id: z.string().describe("The entity ID to get history for"),
        hours: z.number().optional().default(24).describe("Number of hours of history (default: 24)")
      }
    },
    async (args: { entity_id: string; hours?: number }) => {
      const hours = args.hours || 24;
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const history = await bridge.getHistory(args.entity_id, startTime);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(history, null, 2)
        }]
      };
    }
  );

  // Get available services
  server.registerTool(
    "get_services",
    {
      title: "Get Available Services",
      description: "Get all available Home Assistant services",
      inputSchema: {}
    },
    async () => {
      const services = await bridge.getServices();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(services, null, 2)
        }]
      };
    }
  );

  // Get areas
  server.registerTool(
    "get_areas",
    {
      title: "Get Areas",
      description: "Get all configured Home Assistant areas",
      inputSchema: {}
    },
    async () => {
      const areas = await bridge.getAreas();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(areas, null, 2)
        }]
      };
    }
  );

  // Get devices
  server.registerTool(
    "get_devices",
    {
      title: "Get Devices",
      description: "Get all configured Home Assistant devices",
      inputSchema: {}
    },
    async () => {
      const devices = await bridge.getDevices();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(devices, null, 2)
        }]
      };
    }
  );

  // Set light brightness
  server.registerTool(
    "set_light_brightness",
    {
      title: "Set Light Brightness",
      description: "Set the brightness of a light",
      inputSchema: {
        entity_id: z.string().describe("The light entity ID"),
        brightness: z.number().min(0).max(255).describe("Brightness level (0-255)")
      }
    },
    async (args: { entity_id: string; brightness: number }) => {
      const result = await bridge.callService('light', 'turn_on', args.entity_id, {
        brightness: args.brightness
      });
      return {
        content: [{
          type: "text" as const,
          text: `Set ${args.entity_id} brightness to ${args.brightness}`
        }]
      };
    }
  );

  // Set light color
  server.registerTool(
    "set_light_color",
    {
      title: "Set Light Color",
      description: "Set the color of a light",
      inputSchema: {
        entity_id: z.string().describe("The light entity ID"),
        rgb_color: z.array(z.number()).length(3).describe("RGB color values [r, g, b]")
      }
    },
    async (args: { entity_id: string; rgb_color: number[] }) => {
      const result = await bridge.callService('light', 'turn_on', args.entity_id, {
        rgb_color: args.rgb_color
      });
      return {
        content: [{
          type: "text" as const,
          text: `Set ${args.entity_id} color to RGB(${args.rgb_color.join(', ')})`
        }]
      };
    }
  );

  // Set climate temperature
  server.registerTool(
    "set_temperature",
    {
      title: "Set Temperature",
      description: "Set the target temperature for a climate entity",
      inputSchema: {
        entity_id: z.string().describe("The climate entity ID"),
        temperature: z.number().describe("Target temperature")
      }
    },
    async (args: { entity_id: string; temperature: number }) => {
      const result = await bridge.callService('climate', 'set_temperature', args.entity_id, {
        temperature: args.temperature
      });
      return {
        content: [{
          type: "text" as const,
          text: `Set ${args.entity_id} temperature to ${args.temperature}°`
        }]
      };
    }
  );

  // Trigger automation
  server.registerTool(
    "trigger_automation",
    {
      title: "Trigger Automation",
      description: "Manually trigger a Home Assistant automation",
      inputSchema: {
        entity_id: z.string().describe("The automation entity ID to trigger")
      }
    },
    async (args: { entity_id: string }) => {
      const result = await bridge.callService('automation', 'trigger', args.entity_id);
      return {
        content: [{
          type: "text" as const,
          text: `Triggered automation ${args.entity_id}`
        }]
      };
    }
  );

  // Send notification
  server.registerTool(
    "send_notification",
    {
      title: "Send Notification",
      description: "Send a notification via Home Assistant",
      inputSchema: {
        message: z.string().describe("Notification message"),
        title: z.string().optional().describe("Notification title"),
        target: z.string().optional().describe("Target device or service")
      }
    },
    async (args: { message: string; title?: string; target?: string }) => {
      const service = args.target || 'notify';
      const result = await bridge.callService('notify', service, undefined, {
        message: args.message,
        title: args.title
      });
      return {
        content: [{
          type: "text" as const,
          text: `Sent notification: ${args.title || 'Notification'}`
        }]
      };
    }
  );
}