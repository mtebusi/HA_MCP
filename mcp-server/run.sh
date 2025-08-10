#!/usr/bin/with-contenv bashio

set -e

CONFIG_PATH=/data/options.json

# Read configuration
PORT="$(bashio::config 'port')"
AUTH_MODE="$(bashio::config 'authentication_mode')"
EXTERNAL_URL="$(bashio::config 'external_url')"
LOG_LEVEL="$(bashio::config 'log_level')"
CONN_TIMEOUT="$(bashio::config 'connection_timeout')"
MAX_CLIENTS="$(bashio::config 'max_clients')"
ENABLE_FILTERING="$(bashio::config 'enable_entity_filtering')"
CONNECTION_MODE="$(bashio::config 'connection_mode')"

bashio::log.info "Starting MCP Server for Claude v1.0.7"
bashio::log.info "Connection mode: ${CONNECTION_MODE:-sse}"
bashio::log.info "Port: ${PORT}"
bashio::log.info "Authentication mode: ${AUTH_MODE:-none}"
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

# Handle authentication based on mode
case "${AUTH_MODE}" in
    ha_oauth2)
        bashio::log.info "HomeAssistant OAuth2 authentication enabled"
        export AUTH_MODE="ha_oauth2"
        export AUTH_PROXY_PORT=$((PORT + 300))
        
        # Get external URL for OAuth redirects
        if bashio::config.has_value 'external_url'; then
            export EXTERNAL_URL="${EXTERNAL_URL}"
            bashio::log.info "External URL: ${EXTERNAL_URL}"
        else
            # Try to auto-detect
            if bashio::config.has_value 'internal_url'; then
                export EXTERNAL_URL="$(bashio::config 'internal_url')"
            else
                export EXTERNAL_URL="http://homeassistant.local:8123"
            fi
            bashio::log.info "Using default external URL: ${EXTERNAL_URL}"
        fi
        
        bashio::log.info ""
        bashio::log.info "==================================================="
        bashio::log.info "  Claude Desktop Connection Instructions:"
        bashio::log.info "==================================================="
        bashio::log.info ""
        bashio::log.info "1. Open Claude Desktop Settings → Connectors"
        bashio::log.info "2. Click 'Add Custom Connector'"
        bashio::log.info "3. Enter this Discovery URL:"
        bashio::log.info "   http://<your-ha-ip>:${AUTH_PROXY_PORT}/.well-known/oauth-authorization-server"
        bashio::log.info ""
        bashio::log.info "You will be redirected to log in to HomeAssistant"
        bashio::log.info "==================================================="
        ;;
        
    none|*)
        bashio::log.warning "No authentication configured - server is open!"
        bashio::log.warning "This is NOT recommended for production use"
        bashio::log.warning "Set authentication_mode to 'ha_oauth2' for security"
        export AUTH_MODE="none"
        ;;
esac

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
    
    case "${AUTH_MODE}" in
        ha_oauth2)
            bashio::log.info "HomeAssistant OAuth2 authentication is active"
            bashio::log.info "MCP SSE endpoint: http://<your-ha-ip>:${PORT}/sse"
            bashio::log.info "OAuth2 discovery: http://<your-ha-ip>:${AUTH_PROXY_PORT}/.well-known/oauth-authorization-server"
            ;;
        none|*)
            bashio::log.info "No authentication configured - server is OPEN"
            bashio::log.info "MCP SSE endpoint: http://<your-ha-ip>:${PORT}/sse"
            ;;
    esac
    
    exec node dist/sse-server.js
fi