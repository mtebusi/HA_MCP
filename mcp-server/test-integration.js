#!/usr/bin/env node

/**
 * Integration test suite for MCP Server
 * Tests the stdio transport and basic operations
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  SUPERVISOR_TOKEN: 'test_token_12345',
  HOMEASSISTANT_URL: 'ws://localhost:8123/api/websocket',
  ALLOWED_DOMAINS: '["light", "switch", "sensor"]',
  BLOCKED_ENTITIES: '[]',
  LOG_LEVEL: 'info'
};

// Test messages
const TEST_MESSAGES = [
  {
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '1.0.0',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  },
  {
    id: 2,
    method: 'tools/list',
    params: {}
  },
  {
    id: 3,
    method: 'resources/list',
    params: {}
  },
  {
    id: 4,
    method: 'tools/call',
    params: {
      name: 'query',
      arguments: {
        operation: 'entities',
        domain: 'light'
      }
    }
  }
];

class MCPServerTester {
  constructor() {
    this.server = null;
    this.responses = [];
    this.errors = [];
  }

  async start() {
    console.log('Starting MCP Server integration tests...\n');
    
    // Spawn the server process
    this.server = spawn('node', [path.join(__dirname, 'dist', 'index.js')], {
      env: { ...process.env, ...TEST_CONFIG },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle server output
    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const response = JSON.parse(line);
          this.responses.push(response);
          this.handleResponse(response);
        } catch (e) {
          // Not JSON, likely a log message
          if (process.env.DEBUG) {
            console.log('[Server Log]:', line);
          }
        }
      });
    });

    // Handle server errors
    this.server.stderr.on('data', (data) => {
      const error = data.toString();
      this.errors.push(error);
      console.error('[Server Error]:', error);
    });

    // Handle server exit
    this.server.on('close', (code) => {
      console.log(`\nServer exited with code ${code}`);
      this.printResults();
    });

    // Give server time to initialize
    await this.wait(1000);

    // Run tests
    await this.runTests();
  }

  async runTests() {
    console.log('Running test sequence...\n');

    for (const message of TEST_MESSAGES) {
      console.log(`Test ${message.id}: ${message.method}`);
      await this.sendMessage(message);
      await this.wait(500); // Wait for response
    }

    // Wait for all responses
    await this.wait(2000);

    // Shutdown server
    this.server.kill('SIGTERM');
  }

  async sendMessage(message) {
    const jsonrpc = {
      jsonrpc: '2.0',
      ...message
    };
    
    const data = JSON.stringify(jsonrpc) + '\n';
    this.server.stdin.write(data);
  }

  handleResponse(response) {
    if (response.id === 1) {
      console.log('✅ Server initialized successfully');
    } else if (response.id === 2 && response.result?.tools) {
      console.log(`✅ Tools listed: ${response.result.tools.length} tools available`);
      response.result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    } else if (response.id === 3 && response.result?.resources) {
      console.log(`✅ Resources listed: ${response.result.resources.length} resources available`);
    } else if (response.error) {
      console.log(`❌ Error response: ${response.error.message}`);
    }
  }

  printResults() {
    console.log('\n=== Test Results ===');
    console.log(`Total responses: ${this.responses.length}`);
    console.log(`Errors encountered: ${this.errors.length}`);
    
    const successful = this.responses.filter(r => r.result).length;
    const failed = this.responses.filter(r => r.error).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (this.errors.length > 0) {
      console.log('\n=== Errors ===');
      this.errors.forEach(err => console.log(err));
    }

    // Exit with appropriate code
    process.exit(failed > 0 || this.errors.length > 0 ? 1 : 0);
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests
const tester = new MCPServerTester();
tester.start().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});