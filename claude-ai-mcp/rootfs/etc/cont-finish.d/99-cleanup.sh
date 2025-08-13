#!/usr/bin/with-contenv bashio
# ==============================================================================
# Home Assistant Add-on: Claude AI MCP Bridge
# Cleanup on container stop
# ==============================================================================

bashio::log.info "Performing cleanup..."

# Clean up temporary files
rm -rf /tmp/mcp-*
rm -rf /data/sessions/*
rm -rf /data/cache/*

# Stop any remaining processes
pkill -f "node" || true

bashio::log.info "Cleanup complete"