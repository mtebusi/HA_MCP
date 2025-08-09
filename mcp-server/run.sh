#!/usr/bin/with-contenv bashio

set -e

CONFIG_PATH=/data/options.json

# Read configuration
PORT="$(bashio::config 'port')"
AUTH_REQUIRED="$(bashio::config 'authentication_required')"
ACCESS_TOKEN="$(bashio::config 'access_token')"
LOG_LEVEL="$(bashio::config 'log_level')"
CONN_TIMEOUT="$(bashio::config 'connection_timeout')"

bashio::log.info "Starting MCP Server for Claude"
bashio::log.info "Port: ${PORT}"
bashio::log.info "Authentication: ${AUTH_REQUIRED}"
bashio::log.info "Log level: ${LOG_LEVEL}"

# Configure environment
export HOMEASSISTANT_URL="ws://supervisor/core/api/websocket"
export HOMEASSISTANT_TOKEN="${SUPERVISOR_TOKEN}"
export MCP_SERVER_PORT="${PORT}"
export LOG_LEVEL="${LOG_LEVEL}"
export CONNECTION_TIMEOUT="${CONN_TIMEOUT}"

if bashio::config.true 'authentication_required'; then
    if bashio::config.has_value 'access_token'; then
        export EXTERNAL_ACCESS_TOKEN="${ACCESS_TOKEN}"
        bashio::log.info "Authentication token configured"
    else
        bashio::log.warning "Authentication required but no token set"
    fi
fi

# Start MCP server
cd /app
exec node dist/index.js