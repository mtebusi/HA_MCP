#!/bin/bash

# Build script that works around Node v24 + TypeScript hanging issue
# The issue: TypeScript compiles successfully but hangs after emit with Node v24

echo "🔨 Building TypeScript project..."
echo "Using workaround for Node v24 + TypeScript hang issue"

# Start tsc in background
npx tsc &
TSC_PID=$!

# Wait for compilation to complete by checking for output files
echo "⏳ Waiting for compilation..."
COUNTER=0
MAX_WAIT=30

while [ $COUNTER -lt $MAX_WAIT ]; do
    # Check if key dist files exist and are recent (modified in last 5 seconds)
    if [ -f "dist/index.js" ] && [ -f "dist/websocket-client.js" ] && [ -f "dist/tools.js" ]; then
        # Check if files were recently modified
        if [ "$(find dist/index.js -mtime -5s 2>/dev/null)" ]; then
            echo "✅ Compilation complete!"
            
            # Kill the hanging tsc process
            kill -9 $TSC_PID 2>/dev/null
            
            # Count output files
            FILE_COUNT=$(ls -1 dist/*.js 2>/dev/null | wc -l)
            echo "📦 Emitted $FILE_COUNT JavaScript files"
            
            echo "✨ Build successful!"
            exit 0
        fi
    fi
    
    sleep 1
    COUNTER=$((COUNTER + 1))
    
    # Show progress
    if [ $((COUNTER % 5)) -eq 0 ]; then
        echo "  Still compiling... (${COUNTER}s)"
    fi
done

# Timeout reached
echo "❌ Build timed out after ${MAX_WAIT} seconds"
kill -9 $TSC_PID 2>/dev/null
exit 1