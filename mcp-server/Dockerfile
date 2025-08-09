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

# Copy source code
COPY src/ ./src/

# Install ALL dependencies (including dev)
RUN npm install

# Build TypeScript
RUN npm run build || (echo "Build failed, showing package.json:" && cat package.json && echo "Showing tsconfig.json:" && cat tsconfig.json && echo "Listing src directory:" && ls -la src/ && exit 1)

# Copy run script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Expose MCP server port
EXPOSE 6789

# Start the add-on
CMD [ "/run.sh" ]