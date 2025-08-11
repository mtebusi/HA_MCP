ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM $BUILD_FROM

# Install Node.js and build dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    jq \
    ca-certificates

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

# Copy S6 services configuration
# Create the services directory structure first
RUN mkdir -p /etc/services.d/mcp-server

# Copy our service files
COPY rootfs/etc/services.d/mcp-server/run /etc/services.d/mcp-server/run
COPY rootfs/etc/services.d/mcp-server/finish /etc/services.d/mcp-server/finish

# Ensure correct permissions for S6 services
RUN chmod +x /etc/services.d/mcp-server/run && \
    chmod +x /etc/services.d/mcp-server/finish && \
    # Ensure /init from base image has correct permissions (should already be set)
    if [ -f /init ]; then chmod +x /init; fi

# Labels for Home Assistant
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.1.0" \
    io.hass.arch="armhf|armv7|aarch64|amd64|i386" \
    maintainer="Matt Busi"

# Health check - check if the node process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD pgrep -f "node dist/index.js" > /dev/null 2>&1 || exit 1

# Use S6 overlay init system from base image
CMD ["/init"]