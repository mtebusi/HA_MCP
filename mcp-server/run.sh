#!/usr/bin/with-contenv bashio

# Get configuration from Home Assistant
CONFIG_PATH=/data/options.json
EXTERNAL_TOKEN="$(bashio::config 'external_access_token')"
LOG_LEVEL="$(bashio::config 'log_level')"
ENABLE_DEBUG="$(bashio::config 'enable_debug')"

bashio::log.info "Starting Claude MCP Server..."
bashio::log.info "Log Level: ${LOG_LEVEL}"

# Set up environment for internal HA communication
export HOMEASSISTANT_URL="ws://supervisor/core/api/websocket"
export HOMEASSISTANT_TOKEN="${SUPERVISOR_TOKEN}"
export LOG_LEVEL="${LOG_LEVEL}"
export MCP_SERVER_PORT="6789"
export EXTERNAL_ACCESS_TOKEN="${EXTERNAL_TOKEN}"

# Start the MCP server
cd /app
exec node dist/mcp-server.js