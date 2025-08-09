#!/usr/bin/with-contenv bashio

set -e

CONFIG_PATH=/data/options.json

# Read configuration
PORT="$(bashio::config 'port')"
AUTH_REQUIRED="$(bashio::config 'authentication_required')"
ACCESS_TOKEN="$(bashio::config 'access_token')"
LOG_LEVEL="$(bashio::config 'log_level')"
CONN_TIMEOUT="$(bashio::config 'connection_timeout')"
MAX_CLIENTS="$(bashio::config 'max_clients')"
ENABLE_FILTERING="$(bashio::config 'enable_entity_filtering')"
CONNECTION_MODE="$(bashio::config 'connection_mode')"

bashio::log.info "Starting MCP Server for Claude v1.0.5"
bashio::log.info "Connection mode: ${CONNECTION_MODE:-sse}"
bashio::log.info "Port: ${PORT}"
bashio::log.info "Authentication: ${AUTH_REQUIRED}"
bashio::log.info "Log level: ${LOG_LEVEL}"
bashio::log.info "Max clients: ${MAX_CLIENTS}"

# Verify supervisor token
if [[ -z "${SUPERVISOR_TOKEN}" ]]; then
    bashio::log.error "SUPERVISOR_TOKEN not found. Check add-on permissions."
    exit 1
fi

# Configure environment
export HOMEASSISTANT_URL="ws://supervisor/core/api/websocket"
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export MCP_PORT="${PORT}"
export LOG_LEVEL="${LOG_LEVEL}"
export CONNECTION_TIMEOUT="${CONN_TIMEOUT}"
export MAX_CLIENTS="${MAX_CLIENTS}"
export CONNECTION_MODE="${CONNECTION_MODE:-sse}"

# Handle authentication
if bashio::config.true 'authentication_required'; then
    if bashio::config.has_value 'access_token'; then
        export ACCESS_TOKEN="${ACCESS_TOKEN}"
        bashio::log.info "Authentication token configured"
    else
        bashio::log.warning "Authentication required but no token set - generating random token"
        export ACCESS_TOKEN="$(cat /proc/sys/kernel/random/uuid)"
        bashio::log.warning "Generated token: ${ACCESS_TOKEN}"
        bashio::log.warning "Save this token in your add-on configuration!"
    fi
fi

# Handle entity filtering
if bashio::config.true 'enable_entity_filtering'; then
    if bashio::config.has_value 'allowed_domains'; then
        ALLOWED_DOMAINS="$(bashio::config 'allowed_domains')"
        export ALLOWED_DOMAINS="$(echo ${ALLOWED_DOMAINS} | jq -c '.')"
        bashio::log.info "Entity domain filtering enabled"
    fi
    
    if bashio::config.has_value 'blocked_entities'; then
        BLOCKED_ENTITIES="$(bashio::config 'blocked_entities')"
        export BLOCKED_ENTITIES="$(echo ${BLOCKED_ENTITIES} | jq -c '.')"
        bashio::log.info "Entity blocking enabled"
    fi
fi

# Function to cleanup on exit
cleanup() {
    bashio::log.info "Shutting down MCP Server..."
    if [[ -n "${SERVER_PID}" ]]; then
        kill -TERM "${SERVER_PID}" 2>/dev/null || true
        wait "${SERVER_PID}" 2>/dev/null || true
    fi
    bashio::log.info "MCP Server stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Build if needed
if [[ ! -d "/app/dist" ]]; then
    bashio::log.info "Building MCP server..."
    cd /app
    npm run build
fi

# Start the appropriate server based on connection mode
cd /app
if [[ "${CONNECTION_MODE}" == "stdio" ]]; then
    bashio::log.info "Starting MCP server in STDIO mode (legacy)..."
    exec node dist/index.js
else
    bashio::log.info "Starting MCP server in SSE/HTTP mode..."
    bashio::log.info "Claude Desktop can connect to:"
    bashio::log.info "  http://<your-ha-ip>:${PORT}/sse"
    if [[ -n "${ACCESS_TOKEN}" ]]; then
        bashio::log.info "  Authorization: Bearer ${ACCESS_TOKEN}"
    fi
    exec node dist/sse-server.js
fi