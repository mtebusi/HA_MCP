#!/bin/bash

# Test script for MCP server stdio transport
# This simulates how Claude Desktop would interact with the server

echo "Testing MCP Server stdio transport..."
echo "======================================"
echo ""

# Set test environment variables
export SUPERVISOR_TOKEN="test_token"
export HOMEASSISTANT_URL="ws://localhost:8123/api/websocket"
export ALLOWED_DOMAINS='["light", "switch", "sensor"]'
export BLOCKED_ENTITIES='[]'
export LOG_LEVEL="debug"

echo "Configuration:"
echo "  URL: $HOMEASSISTANT_URL"
echo "  Allowed domains: $ALLOWED_DOMAINS"
echo ""

# Test commands to send via stdin
cat << 'EOF' | node dist/index.js
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0.0","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}
{"jsonrpc":"2.0","method":"resources/list","params":{},"id":3}
EOF

echo ""
echo "Test complete."