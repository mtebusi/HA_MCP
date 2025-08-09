#!/usr/bin/env node

/**
 * Claude Desktop MCP Client
 * Connects to Home Assistant MCP Server Add-on
 * 
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "homeassistant": {
 *       "command": "node",
 *       "args": ["/absolute/path/to/claude-desktop-client.js"],
 *       "env": {
 *         "HOMEASSISTANT_HOST": "192.168.1.100",
 *         "HOMEASSISTANT_PORT": "6789",
 *         "HOMEASSISTANT_TOKEN": ""
 *       }
 *     }
 *   }
 * }
 */

const net = require('net');
const readline = require('readline');

// Configuration from environment variables
const HOST = process.env.HOMEASSISTANT_HOST || 'homeassistant.local';
const PORT = process.env.HOMEASSISTANT_PORT || '6789';
const TOKEN = process.env.HOMEASSISTANT_TOKEN || '';

// Create connection to MCP server
const client = net.createConnection({ 
  host: HOST, 
  port: parseInt(PORT) 
}, () => {
  console.error(`[MCP Client] Connected to ${HOST}:${PORT}`);
  
  // Send authentication token if provided
  if (TOKEN) {
    client.write(TOKEN + '\n');
  }
});

// Handle authentication response
let authenticated = false;
client.once('data', (data) => {
  const response = data.toString().trim();
  if (response === 'AUTH_OK' || !TOKEN) {
    authenticated = true;
    console.error('[MCP Client] Authentication successful');
    
    // Set up bidirectional pipe between stdio and TCP socket
    process.stdin.pipe(client);
    client.pipe(process.stdout);
    
    // Handle stdin close
    process.stdin.on('end', () => {
      client.end();
    });
  } else if (response === 'AUTH_FAILED') {
    console.error('[MCP Client] Authentication failed');
    process.exit(1);
  } else {
    // No auth required, this is actual MCP data
    authenticated = true;
    process.stdout.write(data);
    
    // Set up bidirectional pipe
    process.stdin.pipe(client);
    client.pipe(process.stdout);
    
    // Handle stdin close
    process.stdin.on('end', () => {
      client.end();
    });
  }
});

// Handle connection errors
client.on('error', (error) => {
  console.error(`[MCP Client] Connection error: ${error.message}`);
  process.exit(1);
});

// Handle connection close
client.on('close', () => {
  console.error('[MCP Client] Connection closed');
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  client.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  client.end();
  process.exit(0);
});