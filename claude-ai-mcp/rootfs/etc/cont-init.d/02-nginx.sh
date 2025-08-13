#!/usr/bin/with-contenv bashio
# ==============================================================================
# Home Assistant Add-on: Claude AI MCP Bridge
# Configure nginx for ingress if enabled
# ==============================================================================

declare ingress_entry
declare ingress_port

# Only configure nginx if ingress is enabled
if bashio::addon.ingress_enabled; then
    bashio::log.info "Configuring nginx for ingress..."
    
    ingress_entry=$(bashio::addon.ingress_entry)
    ingress_port=$(bashio::addon.ingress_port)
    
    # Generate nginx configuration from template
    bashio::var.json \
        entry "${ingress_entry}" \
        port "${ingress_port}" \
        | tempio \
            -template /usr/share/tempio/nginx.gtpl \
            -out /etc/nginx/servers/ingress.conf
    
    bashio::log.info "Nginx configuration complete"
else
    bashio::log.info "Ingress is disabled, skipping nginx configuration"
fi