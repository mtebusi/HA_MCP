#!/bin/bash

# Run MCP Server directly for testing
set -e

echo "================================================"
echo "🚀 Running MCP Server v1.1.6 Direct Test"
echo "================================================"
echo ""

# Configuration
MCP_PORT=6789
HA_URL="http://localhost:8123"

# Check if port is available
if lsof -i :$MCP_PORT 2>/dev/null | grep -q LISTEN; then
    echo "❌ Port $MCP_PORT is already in use"
    MCP_PORT=7789
    echo "Using alternative port: $MCP_PORT"
fi

# Stop any existing container
docker stop mcp-addon-direct 2>/dev/null || true
docker rm mcp-addon-direct 2>/dev/null || true

# Create a simplified Dockerfile for testing
cd ../mcp-server

cat > Dockerfile.test <<'EOF'
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache bash curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 6789

# Set environment defaults
ENV PORT_SSE=6789
ENV LOG_LEVEL=debug
ENV SUPERVISOR_TOKEN=""
ENV HASSIO_TOKEN=""
ENV SUPERVISOR="http://homeassistant-test:8123"
ENV HOMEASSISTANT_URL="http://homeassistant-test:8123"

# Run the SSE server directly
CMD ["node", "dist/sse-server.js"]
EOF

echo "Building test Docker image..."
docker build -t mcp-test-direct:1.1.6 -f Dockerfile.test .

# Run the container
echo "Starting MCP server container..."
docker run -d \
    --name mcp-addon-direct \
    --network ha-test-network \
    -p $MCP_PORT:6789 \
    -e SUPERVISOR_TOKEN="test_token_123456" \
    -e HASSIO_TOKEN="test_token_123456" \
    -e SUPERVISOR="http://homeassistant-test:8123" \
    -e HOMEASSISTANT_URL="http://homeassistant-test:8123" \
    -e PORT_SSE=6789 \
    -e LOG_LEVEL=debug \
    mcp-test-direct:1.1.6

cd ../test

# Wait for startup
echo "Waiting for MCP server to start..."
sleep 5

# Check if running
if docker ps | grep -q mcp-addon-direct; then
    echo "✅ MCP server container is running"
else
    echo "❌ MCP server failed to start"
    docker logs mcp-addon-direct
    exit 1
fi

# Test endpoints
echo ""
echo "Testing MCP endpoints..."
echo "========================"

# Test health
echo -n "Health check: "
curl -s http://localhost:$MCP_PORT/health || echo "No health endpoint"

# Test SSE
echo -e "\n\nSSE endpoint test:"
curl -s -N http://localhost:$MCP_PORT/sse \
    -H "Accept: text/event-stream" \
    --max-time 2 2>/dev/null | head -5 || echo "SSE connection test complete"

# Test MCP tools
echo -e "\n\nTesting MCP tools list:"
curl -s -X POST http://localhost:$MCP_PORT/sse \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "method": "tools/list",
        "id": 1
    }' 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20 || echo "Response received"

# Show logs
echo ""
echo "Container logs:"
echo "==============="
docker logs --tail 20 mcp-addon-direct

echo ""
echo "================================================"
echo "✅ MCP Server Direct Test Complete"
echo "================================================"
echo ""
echo "Server running at: http://localhost:$MCP_PORT"
echo "SSE endpoint: http://localhost:$MCP_PORT/sse"
echo ""
echo "To view logs: docker logs -f mcp-addon-direct"
echo "To stop: docker stop mcp-addon-direct"
echo ""