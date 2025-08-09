ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies  
RUN npm ci --production && \
    npm install -g typescript

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Copy run script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Expose MCP server port
EXPOSE 6789

# Start the add-on
CMD [ "/run.sh" ]