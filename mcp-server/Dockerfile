ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM $BUILD_FROM

# Install Node.js and build dependencies
# This layer will be cached and reused across builds
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++ \
    bash

# Set working directory
WORKDIR /app

# Copy only package files first (for better layer caching)
# This layer will only rebuild if package.json or package-lock.json changes
COPY package*.json ./

# Install dependencies separately from build
# This layer will be cached if dependencies don't change
RUN npm ci --only=production && \
    npm cache clean --force

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript project
# Install dev dependencies, build, then remove them
RUN npm ci && \
    npm run build && \
    npm prune --production && \
    rm -rf src/ tsconfig.json && \
    npm cache clean --force

# Copy run script last (least likely to change)
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Labels
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.0.4"

# Start the add-on
CMD [ "/run.sh" ]