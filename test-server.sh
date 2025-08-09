#!/bin/bash

# Test script to verify the Home Assistant MCP server works

echo "Home Assistant MCP Server Test"
echo "==============================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to .env and configure your Home Assistant settings."
    exit 1
fi

# Source the .env file
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$HOMEASSISTANT_URL" ] || [ -z "$HOMEASSISTANT_TOKEN" ]; then
    echo "ERROR: Missing required environment variables!"
    echo "Please ensure HOMEASSISTANT_URL and HOMEASSISTANT_TOKEN are set in .env"
    exit 1
fi

echo "Configuration:"
echo "  URL: $HOMEASSISTANT_URL"
echo "  Token: [REDACTED]"
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

echo "Starting MCP server..."
echo "Press Ctrl+C to stop"
echo ""

# Run the server
node dist/index.js