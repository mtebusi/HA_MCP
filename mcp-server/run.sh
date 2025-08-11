#!/usr/bin/with-contenv bash
# ==============================================================================
# Start the MCP Server service
# s6-overlay compatible startup script
# ==============================================================================

set -e

# Wait for Supervisor to be ready
bashio::log.info "Starting MCP Server Add-on..."
if ! bashio::supervisor.ping; then
    bashio::log.warning "Supervisor API not immediately available, waiting..."
    sleep 2
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
port=$(bashio::config 'port' '3000')
log_level=$(bashio::config 'log_level' 'info')
connection_timeout=$(bashio::config 'connection_timeout' '30000')
max_clients=$(bashio::config 'max_clients' '10')
enable_entity_filtering=$(bashio::config 'enable_entity_filtering' 'false')

# Verify supervisor token is available
if [[ -z "${SUPERVISOR_TOKEN}" ]]; then
    bashio::log.error "Supervisor token not found!"
    bashio::log.info "This add-on must be run within Home Assistant"
    exit 1
fi

# Get HomeAssistant connection info - use supervisor API
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN}"
export HASSIO_TOKEN="${SUPERVISOR_TOKEN}"  # Compatibility alias
export HA_BASE_URL="http://supervisor/core"
export HOMEASSISTANT_URL="http://supervisor/core"
export PORT="${port}"
export PORT_SSE="${port}"  # For SSE server
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

bashio::log.info "Starting MCP Server for Claude v1.2.1..."
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

# Verify main entry point exists
if [[ ! -f "/app/dist/index.js" ]]; then
    bashio::log.error "Main entry point /app/dist/index.js not found!"
    exit 1
fi

# Handle graceful shutdown
cleanup() {
    bashio::log.info "Shutting down MCP Server..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the Node.js application
bashio::log.info "Starting MCP server..."
cd /app

# Use exec to replace the shell with node process for proper signal handling
exec node dist/index.js 2>&1 | while read line; do
    bashio::log.info "MCP: ${line}"
done