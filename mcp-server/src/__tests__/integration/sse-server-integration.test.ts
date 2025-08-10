import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('SSE Server Integration Tests', () => {
  let serverProcess: ChildProcess;
  const serverUrl = 'http://localhost:8099';
  const apiKey = 'test-api-key';

  beforeAll(async () => {
    // Set up environment
    process.env.HA_TOKEN = 'test-token';
    process.env.HA_URL = 'http://localhost:8123';
    process.env.API_KEY = apiKey;
    process.env.PORT = '8099';

    // Start SSE server
    const serverPath = path.join(__dirname, '../../sse-server.ts');
    serverProcess = spawn('tsx', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }, { timeout: 10000 });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Health Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${serverUrl}/health`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    });

    it('should provide detailed health info', async () => {
      const response = await fetch(`${serverUrl}/health?detailed=true`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('websocket');
      expect(data).toHaveProperty('cache');
    });

    it('should respond to readiness check', async () => {
      const response = await fetch(`${serverUrl}/ready`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('ready');
    });
  });

  describe('SSE Endpoint', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${serverUrl}/sse`);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toMatch(/unauthorized/i);
    });

    it('should establish SSE connection with valid auth', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
    });

    it('should reject invalid API keys', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        headers: {
          'Authorization': 'Bearer invalid-key'
        }
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe('MCP Protocol over SSE', () => {
    it('should handle MCP initialization', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '1.0.0',
            capabilities: {}
          },
          id: 1
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('protocolVersion');
      expect(data.result).toHaveProperty('capabilities');
    });

    it('should list tools via SSE', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 2
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('tools');
      expect(Array.isArray(data.result.tools)).toBe(true);
    });

    it('should execute tool calls', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'get_entities',
            arguments: {}
          },
          id: 3
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('content');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // Send many requests rapidly
      for (let i = 0; i < 120; i++) {
        requests.push(
          fetch(`${serverUrl}/sse`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'tools/call',
              params: { name: 'get_entities', arguments: {} },
              id: i
            })
          })
        );
      }
      
      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should provide rate limit headers', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      expect(response.headers.has('x-ratelimit-limit')).toBe(true);
      expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
      expect(response.headers.has('x-ratelimit-reset')).toBe(true);
    });
  });

  describe('CORS Support', () => {
    it('should handle preflight requests', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type'
        }
      });
      
      expect(response.status).toBe(204);
      expect(response.headers.has('access-control-allow-origin')).toBe(true);
      expect(response.headers.has('access-control-allow-methods')).toBe(true);
      expect(response.headers.has('access-control-allow-headers')).toBe(true);
    });

    it('should include CORS headers in responses', async () => {
      const response = await fetch(`${serverUrl}/health`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });
      
      expect(response.headers.has('access-control-allow-origin')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle invalid MCP methods', async () => {
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'invalid/method',
          params: {},
          id: 1
        })
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error.code).toBe(-32601); // Method not found
    });

    it('should handle server errors gracefully', async () => {
      // Trigger an error by calling with invalid parameters
      const response = await fetch(`${serverUrl}/sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'control_device',
            arguments: { invalid: 'params' }
          },
          id: 1
        })
      });
      
      expect(response.status).toBe(200); // JSON-RPC errors return 200
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Connection Management', () => {
    it('should handle client disconnection', async () => {
      const controller = new AbortController();
      
      const responsePromise = fetch(`${serverUrl}/sse`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      });
      
      setTimeout(() => controller.abort(), 100);
      
      await expect(responsePromise).rejects.toThrow();
    });

    it('should limit concurrent connections', async () => {
      const connections = [];
      
      // Try to open many concurrent connections
      for (let i = 0; i < 15; i++) {
        connections.push(
          fetch(`${serverUrl}/sse`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          })
        );
      }
      
      const results = await Promise.allSettled(connections);
      const rejected = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 503
      );
      
      expect(rejected.length).toBeGreaterThan(0);
    });
  });
});