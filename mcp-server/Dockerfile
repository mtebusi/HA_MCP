ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.21
FROM $BUILD_FROM

# Install Node.js and build dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++ \
    bash

# Set working directory
WORKDIR /app

# Copy all application files
COPY package*.json tsconfig.json ./
COPY src/ ./src/

# Install dependencies and build
RUN npm install && \
    npm run build && \
    npm prune --production && \
    rm -rf src/ tsconfig.json

# Copy run script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Labels
LABEL \
    io.hass.name="MCP Server for Claude" \
    io.hass.description="Model Context Protocol server for Claude AI integration" \
    io.hass.type="addon" \
    io.hass.version="1.0.3"

# Start the add-on
CMD [ "/run.sh" ]