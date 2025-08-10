import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { HomeAssistantMCPServer } from '../../index';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

describe('MCP Server Integration Tests', () => {
  let server: HomeAssistantMCPServer;
  let client: Client;
  let serverProcess: ReturnType<typeof spawn>;

  beforeAll(async () => {
    // Set up environment
    process.env.HA_TOKEN = 'test-token';
    process.env.HA_URL = 'http://localhost:8123';
    process.env.CONNECTION_MODE = 'stdio';

    // Start server process
    const serverPath = path.join(__dirname, '../../index.ts');
    serverProcess = spawn('tsx', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Create client
    const transport = new StdioClientTransport({
      command: 'tsx',
      args: [serverPath],
      env: process.env as Record<string, string>
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
  }, { timeout: 30000 });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();
      
      expect(tools).toHaveProperty('tools');
      expect(Array.isArray(tools.tools)).toBe(true);
      expect(tools.tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('get_entities');
      expect(toolNames).toContain('control_device');
      expect(toolNames).toContain('get_services');
      expect(toolNames).toContain('query_history');
    });

    it('should provide tool schemas', async () => {
      const tools = await client.listTools();
      
      tools.tools.forEach(tool => {
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('Entity Operations via MCP', () => {
    it('should get all entities through MCP tool', async () => {
      const result = await client.callTool('get_entities', {});
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      
      if (result.content.length > 0) {
        const content = result.content[0];
        expect(content).toHaveProperty('type');
        expect(content.type).toBe('text');
      }
    });

    it('should filter entities by domain', async () => {
      const result = await client.callTool('get_entities', {
        domain: 'light'
      });
      
      expect(result).toHaveProperty('content');
      const entities = JSON.parse(result.content[0].text);
      
      entities.forEach((entity: any) => {
        expect(entity.entity_id).toMatch(/^light\./);
      });
    });

    it('should handle entity not found', async () => {
      const result = await client.callTool('get_entities', {
        entity_id: 'non.existent.entity'
      });
      
      expect(result.content[0].text).toMatch(/not found|error/i);
    });
  });

  describe('Service Calls via MCP', () => {
    it('should execute service call', async () => {
      const result = await client.callTool('control_device', {
        entity_id: 'light.living_room',
        action: 'turn_on'
      });
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toMatch(/success|executed/i);
    });

    it('should validate service parameters', async () => {
      const result = await client.callTool('control_device', {
        entity_id: 'light.living_room',
        action: 'invalid_action'
      });
      
      expect(result.content[0].text).toMatch(/error|invalid/i);
    });

    it('should handle complex service data', async () => {
      const result = await client.callTool('control_device', {
        entity_id: 'light.living_room',
        action: 'turn_on',
        brightness: 128,
        color_temp: 350
      });
      
      expect(result).toHaveProperty('content');
      expect(result.isError).toBeFalsy();
    });
  });

  describe('Service Discovery', () => {
    it('should list available services', async () => {
      const result = await client.callTool('get_services', {});
      
      expect(result).toHaveProperty('content');
      const services = JSON.parse(result.content[0].text);
      
      expect(services).toHaveProperty('light');
      expect(services).toHaveProperty('switch');
      expect(services).toHaveProperty('homeassistant');
    });

    it('should get service details', async () => {
      const result = await client.callTool('get_services', {
        domain: 'light'
      });
      
      const services = JSON.parse(result.content[0].text);
      
      expect(services).toHaveProperty('turn_on');
      expect(services).toHaveProperty('turn_off');
      expect(services).toHaveProperty('toggle');
    });
  });

  describe('History Queries', () => {
    it('should query entity history', async () => {
      const result = await client.callTool('query_history', {
        entity_id: 'sensor.temperature',
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date().toISOString()
      });
      
      expect(result).toHaveProperty('content');
      const history = JSON.parse(result.content[0].text);
      
      expect(Array.isArray(history)).toBe(true);
    });

    it('should handle invalid time ranges', async () => {
      const result = await client.callTool('query_history', {
        entity_id: 'sensor.temperature',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() - 3600000).toISOString()
      });
      
      expect(result.content[0].text).toMatch(/error|invalid/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed tool calls', async () => {
      await expect(
        client.callTool('invalid_tool', {})
      ).rejects.toThrow();
    });

    it('should provide helpful error messages', async () => {
      const result = await client.callTool('control_device', {});
      
      expect(result.content[0].text).toMatch(/required|missing/i);
    });

    it('should handle rate limiting gracefully', async () => {
      const promises = [];
      
      // Send many requests
      for (let i = 0; i < 150; i++) {
        promises.push(client.callTool('get_entities', {}));
      }
      
      const results = await Promise.allSettled(promises);
      const errors = results.filter(r => r.status === 'rejected');
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache repeated entity queries', async () => {
      const start1 = Date.now();
      await client.callTool('get_entities', {});
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await client.callTool('get_entities', {});
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1 / 2);
    });

    it('should handle concurrent requests efficiently', async () => {
      const start = Date.now();
      
      await Promise.all([
        client.callTool('get_entities', {}),
        client.callTool('get_services', {}),
        client.callTool('get_entities', { domain: 'light' })
      ]);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('Security', () => {
    it('should sanitize user input', async () => {
      const result = await client.callTool('control_device', {
        entity_id: 'light.living_room<script>alert(1)</script>',
        action: 'turn_on'
      });
      
      expect(result.content[0].text).not.toContain('<script>');
    });

    it('should respect entity filtering', async () => {
      // Assuming lock entities are filtered
      const result = await client.callTool('control_device', {
        entity_id: 'lock.front_door',
        action: 'unlock'
      });
      
      expect(result.content[0].text).toMatch(/denied|forbidden|not allowed/i);
    });
  });
});