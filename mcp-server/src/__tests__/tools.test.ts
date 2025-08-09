import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCP_TOOLS, TOOL_HANDLERS } from '../tools';
import type { HomeAssistantWebSocket } from '../websocket-client';
import type { EntityState } from '../types';

// Mock the WebSocket client
const mockWs = {
  sendCommand: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
} as unknown as HomeAssistantWebSocket;

describe('MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Definitions', () => {
    it('should export exactly 4 main tools', () => {
      expect(MCP_TOOLS).toHaveLength(4);
    });

    it('should have Query tool with correct structure', () => {
      const queryTool = MCP_TOOLS.find(t => t.name === 'query');
      expect(queryTool).toBeDefined();
      expect(queryTool?.description).toContain('Query information from Home Assistant');
      expect(queryTool?.inputSchema.properties.operation).toBeDefined();
      expect(queryTool?.inputSchema.properties.operation.enum).toContain('entities');
      expect(queryTool?.inputSchema.properties.operation.enum).toContain('state');
      expect(queryTool?.inputSchema.properties.operation.enum).toContain('history');
    });

    it('should have Control tool with correct structure', () => {
      const controlTool = MCP_TOOLS.find(t => t.name === 'control');
      expect(controlTool).toBeDefined();
      expect(controlTool?.description).toContain('Control Home Assistant');
      expect(controlTool?.inputSchema.properties.operation.enum).toContain('call_service');
      expect(controlTool?.inputSchema.properties.operation.enum).toContain('toggle');
      expect(controlTool?.inputSchema.properties.operation.enum).toContain('create_automation');
    });

    it('should have Monitor tool with correct structure', () => {
      const monitorTool = MCP_TOOLS.find(t => t.name === 'monitor');
      expect(monitorTool).toBeDefined();
      expect(monitorTool?.description).toContain('Monitor real-time events');
      expect(monitorTool?.inputSchema.properties.operation.enum).toContain('subscribe');
      expect(monitorTool?.inputSchema.properties.operation.enum).toContain('fire_event');
    });

    it('should have Assist tool with correct structure', () => {
      const assistTool = MCP_TOOLS.find(t => t.name === 'assist');
      expect(assistTool).toBeDefined();
      expect(assistTool?.description).toContain('AI-enhanced operations');
      expect(assistTool?.inputSchema.properties.operation.enum).toContain('suggest_automation');
      expect(assistTool?.inputSchema.properties.operation.enum).toContain('analyze_patterns');
      expect(assistTool?.inputSchema.properties.operation.enum).toContain('security_check');
    });
  });

  describe('Tool Handlers - Query Operations', () => {
    const mockEntityCache = new Map<string, EntityState>([
      ['light.living_room', { 
        entity_id: 'light.living_room',
        state: 'on',
        attributes: { brightness: 255 },
        last_changed: '2025-01-01T00:00:00Z',
        last_updated: '2025-01-01T00:00:00Z'
      }],
      ['switch.garage', {
        entity_id: 'switch.garage',
        state: 'off',
        attributes: {},
        last_changed: '2025-01-01T00:00:00Z',
        last_updated: '2025-01-01T00:00:00Z'
      }]
    ]);

    describe('entities operation', () => {
      it('should list all entities when no domain specified', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: [] },
          { operation: 'entities' }
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data).toContainEqual(expect.objectContaining({
          entity_id: 'light.living_room'
        }));
      });

      it('should filter entities by domain', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: [] },
          { operation: 'entities', domain: 'light' }
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].entity_id).toBe('light.living_room');
      });

      it('should respect entity filtering', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: ['light'], blocked: [] },
          { operation: 'entities' }
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].entity_id).toBe('light.living_room');
      });

      it('should block specific entities', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: ['light.living_room'] },
          { operation: 'entities' }
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].entity_id).toBe('switch.garage');
      });
    });

    describe('state operation', () => {
      it('should get state of specific entity', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: [] },
          { operation: 'state', entity_id: 'light.living_room' }
        );

        expect(result.success).toBe(true);
        expect(result.data.state).toBe('on');
        expect(result.data.attributes.brightness).toBe(255);
      });

      it('should return error for non-existent entity', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: [] },
          { operation: 'state', entity_id: 'light.nonexistent' }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should return error for blocked entity', async () => {
        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: ['light.living_room'] },
          { operation: 'state', entity_id: 'light.living_room' }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Access denied');
      });
    });

    describe('history operation', () => {
      it('should request history from WebSocket', async () => {
        mockWs.sendCommand.mockResolvedValue([
          {
            entity_id: 'light.living_room',
            states: [
              { state: 'on', last_changed: '2025-01-01T00:00:00Z' },
              { state: 'off', last_changed: '2025-01-01T01:00:00Z' }
            ]
          }
        ]);

        const result = await TOOL_HANDLERS.query(
          mockWs,
          mockEntityCache,
          { allowed: [], blocked: [] },
          { 
            operation: 'history',
            entity_id: 'light.living_room',
            start_time: '2025-01-01T00:00:00Z',
            end_time: '2025-01-01T02:00:00Z'
          }
        );

        expect(result.success).toBe(true);
        expect(mockWs.sendCommand).toHaveBeenCalledWith({
          type: 'history/history_during_period',
          entity_ids: ['light.living_room'],
          start_time: '2025-01-01T00:00:00Z',
          end_time: '2025-01-01T02:00:00Z'
        });
      });
    });
  });

  describe('Tool Handlers - Control Operations', () => {
    describe('call_service operation', () => {
      it('should call service via WebSocket', async () => {
        mockWs.sendCommand.mockResolvedValue({ success: true });

        const result = await TOOL_HANDLERS.control(
          mockWs,
          new Map(),
          { allowed: [], blocked: [] },
          {
            operation: 'call_service',
            domain: 'light',
            service: 'turn_on',
            entity_id: 'light.living_room',
            data: { brightness: 128 }
          }
        );

        expect(result.success).toBe(true);
        expect(mockWs.sendCommand).toHaveBeenCalledWith({
          type: 'call_service',
          domain: 'light',
          service: 'turn_on',
          target: { entity_id: 'light.living_room' },
          service_data: { brightness: 128 }
        });
      });

      it('should validate required parameters', async () => {
        const result = await TOOL_HANDLERS.control(
          mockWs,
          new Map(),
          { allowed: [], blocked: [] },
          {
            operation: 'call_service',
            // Missing domain and service
            entity_id: 'light.living_room'
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('domain and service');
      });
    });

    describe('toggle operation', () => {
      it('should toggle entity state', async () => {
        mockWs.sendCommand.mockResolvedValue({ success: true });

        const result = await TOOL_HANDLERS.control(
          mockWs,
          new Map(),
          { allowed: [], blocked: [] },
          {
            operation: 'toggle',
            entity_id: 'light.living_room'
          }
        );

        expect(result.success).toBe(true);
        expect(mockWs.sendCommand).toHaveBeenCalledWith({
          type: 'call_service',
          domain: 'homeassistant',
          service: 'toggle',
          target: { entity_id: 'light.living_room' }
        });
      });
    });

    describe('create_automation operation', () => {
      it('should create automation via WebSocket', async () => {
        mockWs.sendCommand.mockResolvedValue({ success: true });

        const automationConfig = {
          alias: 'Test Automation',
          trigger: [{ platform: 'state', entity_id: 'sensor.test' }],
          action: [{ service: 'light.turn_on', entity_id: 'light.test' }]
        };

        const result = await TOOL_HANDLERS.control(
          mockWs,
          new Map(),
          { allowed: [], blocked: [] },
          {
            operation: 'create_automation',
            config: automationConfig
          }
        );

        expect(result.success).toBe(true);
        expect(mockWs.sendCommand).toHaveBeenCalledWith({
          type: 'automation/config/save',
          data: automationConfig
        });
      });
    });
  });

  describe('Input Validation', () => {
    it('should sanitize HTML in string inputs', async () => {
      const result = await TOOL_HANDLERS.control(
        mockWs,
        new Map(),
        { allowed: [], blocked: [] },
        {
          operation: 'call_service',
          domain: 'notify',
          service: 'notify',
          data: { message: '<script>alert("xss")</script>Hello' }
        }
      );

      expect(mockWs.sendCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          service_data: { message: 'Hello' } // Script tags should be removed
        })
      );
    });

    it('should validate entity_id format', async () => {
      const result = await TOOL_HANDLERS.query(
        mockWs,
        new Map(),
        { allowed: [], blocked: [] },
        {
          operation: 'state',
          entity_id: 'invalid entity id' // Invalid format
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid entity_id');
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', async () => {
      mockWs.sendCommand.mockRejectedValue(new Error('Connection lost'));

      const result = await TOOL_HANDLERS.control(
        mockWs,
        new Map(),
        { allowed: [], blocked: [] },
        {
          operation: 'call_service',
          domain: 'light',
          service: 'turn_on',
          entity_id: 'light.living_room'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection lost');
    });

    it('should handle invalid operation gracefully', async () => {
      const result = await TOOL_HANDLERS.query(
        mockWs,
        new Map(),
        { allowed: [], blocked: [] },
        {
          operation: 'invalid_operation'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('Performance', () => {
    it('should handle large entity cache efficiently', async () => {
      const largeCache = new Map<string, EntityState>();
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`sensor.test_${i}`, {
          entity_id: `sensor.test_${i}`,
          state: `${i}`,
          attributes: {},
          last_changed: '2025-01-01T00:00:00Z',
          last_updated: '2025-01-01T00:00:00Z'
        });
      }

      const startTime = Date.now();
      const result = await TOOL_HANDLERS.query(
        mockWs,
        largeCache,
        { allowed: [], blocked: [] },
        { operation: 'entities', domain: 'sensor' }
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});