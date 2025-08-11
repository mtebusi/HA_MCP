# Multi-architecture base image support
# BUILD_FROM will be set by the HomeAssistant builder or our build process
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.20
FROM ${BUILD_FROM}

# Ensure we're running as root during build
USER root

# Install Node.js and build dependencies
# Use architecture-agnostic installation
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    jq \
    ca-certificates \
    && node --version \
    && npm --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies and build
RUN npm ci --no-audit --no-fund && \
    npm run build && \
    npm prune --production --no-audit --no-fund && \
    rm -rf src/ tsconfig.json ~/.npm && \
    npm cache clean --force

# Fix MCP SDK import paths in compiled JavaScript
# This is a workaround for module resolution issues with the MCP SDK package
RUN find /app/dist -name "*.js" -type f -exec sed -i \
    -e 's|require("@modelcontextprotocol/sdk/server/index")|require("/app/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js")|g' \
    -e 's|require("@modelcontextprotocol/sdk/server/sse")|require("/app/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/sse.js")|g' \
    -e 's|require("@modelcontextprotocol/sdk/types")|require("/app/node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js")|g' \
    {} \;

# Copy main run script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Copy S6 services configuration
# Create the services directory structure with proper permissions
RUN mkdir -p /etc/services.d/mcp-server && \
    mkdir -p /etc/cont-init.d && \
    mkdir -p /etc/fix-attrs.d

# Copy init script
COPY rootfs/etc/cont-init.d/mcp-server-init.sh /etc/cont-init.d/mcp-server-init.sh

# Copy our service files
COPY rootfs/etc/services.d/mcp-server/run /etc/services.d/mcp-server/run
COPY rootfs/etc/services.d/mcp-server/finish /etc/services.d/mcp-server/finish

# Set proper permissions for S6 service files
RUN chmod 755 /etc/cont-init.d/mcp-server-init.sh && \
    chmod 755 /etc/services.d/mcp-server && \
    chmod 755 /etc/services.d/mcp-server/run && \
    chmod 755 /etc/services.d/mcp-server/finish && \
    # Ensure app directory has correct permissions
    chmod -R 755 /app && \
    # Verify bashio is available (it should be in the base image)
    if [ ! -f /usr/bin/bashio ]; then \
        echo "WARNING: bashio not found in base image"; \
    fi

# Labels for Home Assistant
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.2.0" \
    io.hass.arch="armhf|armv7|aarch64|amd64|i386" \
    maintainer="Matt Busi"

# Health check - check if the node process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD pgrep -f "node dist/index.js" > /dev/null 2>&1 || exit 1

# The base image already has ENTRYPOINT ["/init"]
# We don't need to specify CMD as the base image handles it