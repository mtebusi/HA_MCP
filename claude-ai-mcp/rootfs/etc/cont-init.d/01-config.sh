#!/usr/bin/with-contenv bashio
# ==============================================================================
# Home Assistant Add-on: Claude AI MCP Bridge
# Configure the add-on for zero-config operation
# ==============================================================================

declare ingress_entry

bashio::log.info "Configuring Claude AI MCP Bridge..."

# Verify build artifacts exist
if [ ! -f "/app/mcp-server/dist/index.js" ]; then
    bashio::log.error "MCP server build artifacts not found!"
    bashio::log.error "The Docker image may be corrupted. Please reinstall the add-on."
    exit 1
fi

# Check if running with ingress
if bashio::addon.ingress_enabled; then
    ingress_entry=$(bashio::addon.ingress_entry)
    bashio::log.info "Ingress is enabled at: ${ingress_entry}"
    export INGRESS_ENABLED="true"
    export INGRESS_ENTRY="${ingress_entry}"
else
    bashio::log.info "Ingress is disabled, using direct connection"
    export INGRESS_ENABLED="false"
fi

# Configure SSL if certificates are available (optional)
if bashio::config.has_value 'ssl' && bashio::config.true 'ssl'; then
    if bashio::config.has_value 'certfile' && bashio::config.has_value 'keyfile'; then
        certfile=$(bashio::config 'certfile')
        keyfile=$(bashio::config 'keyfile')
        
        if bashio::fs.file_exists "/ssl/${certfile}" && bashio::fs.file_exists "/ssl/${keyfile}"; then
            bashio::log.info "SSL certificates found, enabling HTTPS"
            export SSL_ENABLED="true"
            export SSL_CERT="/ssl/${certfile}"
            export SSL_KEY="/ssl/${keyfile}"
        else
            bashio::log.warning "SSL certificates not found, falling back to HTTP"
            export SSL_ENABLED="false"
        fi
    else
        bashio::log.info "SSL configuration incomplete, using HTTP"
        export SSL_ENABLED="false"
    fi
else
    bashio::log.info "SSL not configured, using HTTP (this is fine for local/ingress connections)"
    export SSL_ENABLED="false"
fi

# Set default allowed origins if not configured
if ! bashio::config.has_value 'allowed_origins'; then
    export ALLOWED_ORIGINS="https://claude.ai,https://app.claude.ai,https://mcp-proxy.anthropic.com"
    bashio::log.info "Using default allowed origins for Claude Desktop"
else
    origins=$(bashio::config 'allowed_origins' | jq -r 'join(",")')
    export ALLOWED_ORIGINS="${origins}"
    bashio::log.info "Using custom allowed origins"
fi

# Configure session management with defaults
export SESSION_TIMEOUT=$(bashio::config 'session_timeout' '3600')
export MAX_SESSIONS=$(bashio::config 'max_sessions' '10')
export RATE_LIMIT=$(bashio::config 'rate_limit' '100')

# Configure LLM API integration
if bashio::config.has_value 'llm_hass_api'; then
    export LLM_HASS_API=$(bashio::config 'llm_hass_api')
    bashio::log.info "LLM API configured: ${LLM_HASS_API}"
fi

if bashio::config.has_value 'custom_prompt'; then
    export CUSTOM_PROMPT=$(bashio::config 'custom_prompt')
    bashio::log.info "Custom prompt configured"
fi

# Create required directories
mkdir -p /data/sessions
mkdir -p /data/cache
mkdir -p /var/log/mcp-server

# Log registry information
bashio::log.info "Docker image registry: ${REGISTRY:-Docker Hub}"
bashio::log.info "Image: mtebusi/ha-claude-ai-mcp:${BUILD_VERSION:-latest}"

bashio::log.info "Configuration complete - add-on is ready!"
bashio::log.info "Zero-config mode: Connect Claude Desktop to discover endpoint"