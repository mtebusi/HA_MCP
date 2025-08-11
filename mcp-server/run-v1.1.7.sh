#!/usr/bin/with-contenv bashio
# ==============================================================================
# Start the MCP Server service v1.1.7
# s6-overlay compatible startup script with fallback support
# ==============================================================================

set -e

# Check if we're in an S6 environment with bashio available
if ! command -v bashio &> /dev/null; then
    echo "[INFO] Bashio not available, using fallback script"
    chmod +x /app/run-fallback.sh
    exec /app/run-fallback.sh
fi

# Check for supervisor token
if [[ -z "${SUPERVISOR_TOKEN}" ]] && [[ -z "${HASSIO_TOKEN}" ]]; then
    bashio::log.warning "No supervisor token found, attempting fallback mode"
    chmod +x /app/run-fallback.sh
    exec /app/run-fallback.sh
fi

# Get configuration from add-on options
declare port
declare log_level
declare connection_timeout
declare max_clients
declare enable_entity_filtering
declare allowed_domains
declare blocked_entities

# Read configuration with defaults
port=$(bashio::config 'port' '6789')
log_level=$(bashio::config 'log_level' 'info')
connection_timeout=$(bashio::config 'connection_timeout' '30000')
max_clients=$(bashio::config 'max_clients' '10')
enable_entity_filtering=$(bashio::config 'enable_entity_filtering' 'false')

# Get HomeAssistant connection info - use supervisor API
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export HASSIO_TOKEN="${HASSIO_TOKEN:-$SUPERVISOR_TOKEN}"
export HA_BASE_URL="http://supervisor/core"
export HOMEASSISTANT_URL="${HA_BASE_URL}"
export PORT="${port}"
export PORT_SSE="${port}"
export CONNECTION_MODE="sse"
export AUTHENTICATION_MODE="supervisor"
export LOG_LEVEL="${log_level}"
export CONNECTION_TIMEOUT="${connection_timeout}"
export MAX_CLIENTS="${max_clients}"
export ENABLE_ENTITY_FILTERING="${enable_entity_filtering}"

# Ingress configuration (if enabled)
if bashio::addon.ingress_entry; then
    export INGRESS_INTERFACE=$(bashio::addon.ip_address)
    export INGRESS_PORT=$(bashio::addon.ingress_port)
    bashio::log.info "Ingress enabled on ${INGRESS_INTERFACE}:${INGRESS_PORT}"
fi

# Handle array configs for filtering
if bashio::config.has_value 'allowed_domains'; then
    ALLOWED_DOMAINS=$(bashio::config 'allowed_domains' | jq -r 'join(",")')
    export ALLOWED_DOMAINS
    bashio::log.info "Domain filtering enabled: ${ALLOWED_DOMAINS}"
fi

if bashio::config.has_value 'blocked_entities'; then
    BLOCKED_ENTITIES=$(bashio::config 'blocked_entities' | jq -r 'join(",")')
    export BLOCKED_ENTITIES
    bashio::log.info "Entity blocking enabled: ${BLOCKED_ENTITIES}"
fi

bashio::log.info "Starting MCP Server for Claude v1.1.7..."
bashio::log.info "Port: ${port}"
bashio::log.info "Log Level: ${log_level}"
bashio::log.info "Connection Mode: SSE (Server-Sent Events)"
bashio::log.info "Authentication: HomeAssistant Supervisor Token"
bashio::log.info "Max Clients: ${max_clients}"
bashio::log.info "Connection Timeout: ${connection_timeout}ms"

# Verify the build exists
if [[ ! -d "/app/dist" ]]; then
    bashio::log.error "Application not built! Missing /app/dist directory"
    bashio::log.info "Attempting to build..."
    cd /app
    npm run build || {
        bashio::log.error "Build failed!"
        exit 1
    }
fi

# Determine which server file to run
if [[ -f "/app/dist/sse-server.js" ]]; then
    SERVER_FILE="/app/dist/sse-server.js"
    bashio::log.info "Using SSE server"
elif [[ -f "/app/dist/index.js" ]]; then
    SERVER_FILE="/app/dist/index.js"
    bashio::log.info "Using index server"
else
    bashio::log.error "No server file found!"
    exit 1
fi

# Handle graceful shutdown
cleanup() {
    bashio::log.info "Shutting down MCP Server..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the Node.js application
bashio::log.info "Starting MCP server: ${SERVER_FILE}"
cd /app

# Use exec to replace the shell with node process for proper signal handling
exec node "${SERVER_FILE}"