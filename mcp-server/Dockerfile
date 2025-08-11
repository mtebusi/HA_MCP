# Multi-architecture base image support
# BUILD_FROM will be set by the HomeAssistant builder or our build process
ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM ${BUILD_FROM}

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

# Copy run script (fallback if S6 is not available)
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Copy S6 services configuration if using S6 overlay
# Create the services directory structure
RUN mkdir -p /etc/services.d/mcp-server

# Copy our service files
COPY rootfs/etc/services.d/mcp-server/run /etc/services.d/mcp-server/run
COPY rootfs/etc/services.d/mcp-server/finish /etc/services.d/mcp-server/finish

# Ensure correct permissions for all scripts
RUN chmod +x /etc/services.d/mcp-server/run && \
    chmod +x /etc/services.d/mcp-server/finish && \
    # Verify critical components from base image
    if [ ! -f /init ]; then \
        echo "ERROR: /init not found in base image!" && \
        echo "Base image may not be a proper HomeAssistant base image" && \
        exit 1; \
    fi && \
    chmod +x /init && \
    # Verify bashio is available
    if [ ! -f /usr/bin/bashio ]; then \
        echo "WARNING: bashio not found, S6 overlay may not be properly installed"; \
    fi

# Labels for Home Assistant
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.1.4" \
    io.hass.arch="armhf|armv7|aarch64|amd64|i386" \
    maintainer="Matt Busi"

# Health check - check if the node process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD pgrep -f "node dist/index.js" > /dev/null 2>&1 || exit 1

# Use S6 overlay init system from base image
CMD ["/init"]