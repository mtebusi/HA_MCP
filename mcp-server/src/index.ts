#!/usr/bin/env node

/**
 * Main entry point for HomeAssistant MCP Server
 * Runs in SSE mode for Claude Desktop connections via ingress
 */

// Always run in SSE mode for the add-on
import { SimplifiedMCPSSEServer } from './sse-server-simplified';

const server = new SimplifiedMCPSSEServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[MCP Server] Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[MCP Server] Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch(error => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});