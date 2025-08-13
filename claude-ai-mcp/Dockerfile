# syntax=docker/dockerfile:1
ARG BUILD_FROM
FROM ${BUILD_FROM}

# Build arguments
ARG BUILD_DATE
ARG BUILD_ARCH
ARG BUILD_VERSION
ARG BUILD_REF

# Install Node.js and build dependencies
RUN \
    apk add --no-cache \
        nodejs \
        npm \
        nginx \
        curl \
    && npm install -g typescript

# Copy rootfs
COPY rootfs /

# Copy application code
WORKDIR /app
COPY mcp-server /app/mcp-server

# Install dependencies and build TypeScript
WORKDIR /app/mcp-server
RUN npm ci --production=false \
    && npm run build \
    && test -f dist/index.js \
    && npm ci --production \
    && npm cache clean --force

# Make scripts executable
RUN chmod +x /etc/services.d/mcp-server/run \
    && chmod +x /etc/services.d/mcp-server/finish \
    && chmod +x /etc/cont-init.d/*.sh \
    && chmod +x /etc/cont-finish.d/*.sh \
    && chmod +x /usr/bin/mcp-server

# Health check (using Node.js to avoid curl dependency)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8098/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Labels for both Docker Hub and Home Assistant
LABEL \
    io.hass.name="Claude AI MCP Bridge" \
    io.hass.description="Connect Claude Desktop to Home Assistant using Model Context Protocol" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="Matt Busi <me@mattbusi.com>" \
    org.opencontainers.image.title="Claude AI MCP Bridge" \
    org.opencontainers.image.description="Connect Claude Desktop to Home Assistant using Model Context Protocol" \
    org.opencontainers.image.vendor="Home Assistant Add-on" \
    org.opencontainers.image.authors="Matt Busi <me@mattbusi.com>" \
    org.opencontainers.image.licenses="Apache-2.0" \
    org.opencontainers.image.url="https://github.com/mtebusi/ha-mcp" \
    org.opencontainers.image.source="https://github.com/mtebusi/ha-mcp" \
    org.opencontainers.image.documentation="https://github.com/mtebusi/ha-mcp/blob/main/claude-ai-mcp/DOCS.md" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.revision="${BUILD_REF}" \
    org.opencontainers.image.version="${BUILD_VERSION}"