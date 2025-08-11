#!/bin/bash
# ==============================================================================
# Fallback startup script for non-S6 environments
# Used when running outside of HomeAssistant supervisor
# ==============================================================================

set -e

echo "[INFO] Starting MCP Server in fallback mode (non-S6 environment)"

# Set default environment variables if not provided
export PORT="${PORT:-6789}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export CONNECTION_MODE="${CONNECTION_MODE:-sse}"
export AUTHENTICATION_MODE="${AUTHENTICATION_MODE:-token}"
export CONNECTION_TIMEOUT="${CONNECTION_TIMEOUT:-30000}"
export MAX_CLIENTS="${MAX_CLIENTS:-10}"

# Use provided tokens or defaults for testing
export SUPERVISOR_TOKEN="${SUPERVISOR_TOKEN:-test_token}"
export HASSIO_TOKEN="${HASSIO_TOKEN:-$SUPERVISOR_TOKEN}"
export HOMEASSISTANT_URL="${HOMEASSISTANT_URL:-http://localhost:8123}"
export SUPERVISOR="${SUPERVISOR:-$HOMEASSISTANT_URL}"

echo "[INFO] Configuration:"
echo "  Port: ${PORT}"
echo "  Log Level: ${LOG_LEVEL}"
echo "  HomeAssistant URL: ${HOMEASSISTANT_URL}"
echo "  Connection Mode: ${CONNECTION_MODE}"

# Check if dist directory exists
if [ ! -d "/app/dist" ]; then
    echo "[INFO] Building application..."
    cd /app
    npm run build || {
        echo "[ERROR] Build failed!"
        exit 1
    }
fi

# Check which server file to run
if [ -f "/app/dist/sse-server.js" ]; then
    SERVER_FILE="/app/dist/sse-server.js"
elif [ -f "/app/dist/index.js" ]; then
    SERVER_FILE="/app/dist/index.js"
else
    echo "[ERROR] No server file found!"
    exit 1
fi

echo "[INFO] Starting server: ${SERVER_FILE}"

# Handle graceful shutdown
cleanup() {
    echo "[INFO] Shutting down MCP Server..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the Node.js application
cd /app
exec node "${SERVER_FILE}"