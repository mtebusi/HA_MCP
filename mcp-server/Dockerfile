ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM $BUILD_FROM

# Install Node.js and required runtime dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    jq \
    ca-certificates \
    && mkdir -p /data /app

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies, build, and cleanup in a single layer
# This minimizes the final image size
RUN npm ci --no-audit --no-fund && \
    npm run build && \
    npm prune --production --no-audit --no-fund && \
    rm -rf src/ tsconfig.json ~/.npm && \
    npm cache clean --force && \
    # Remove build dependencies
    apk del npm && \
    apk add --no-cache npm && \
    # Create necessary directories
    mkdir -p /data /config /ssl

# Copy run script with proper permissions
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Add health check script
RUN echo '#!/bin/sh' > /health.sh && \
    echo 'pgrep -f "node dist/index.js" > /dev/null 2>&1' >> /health.sh && \
    chmod +x /health.sh

# Labels for Home Assistant
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.0.5" \
    io.hass.arch="armhf|armv7|aarch64|amd64|i386" \
    maintainer="Matt Busi <matt@tebusi.com>"

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD /health.sh || exit 1

# Start the add-on
CMD [ "/run.sh" ]