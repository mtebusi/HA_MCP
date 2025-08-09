#!/bin/bash

echo "🧪 Running tests..."
echo "Using workaround for Node v24 + vitest hang issue"

# Create a temporary test runner that forces CommonJS
cat > test-runner.cjs << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting vitest...');

const vitest = spawn('node', [
  path.join(__dirname, 'node_modules', 'vitest', 'dist', 'cli.js'),
  'run',
  '--no-color'
], {
  stdio: 'inherit',
  env: process.env
});

// Monitor and force exit after tests complete
let lastOutput = Date.now();
vitest.on('exit', (code) => {
  console.log(`\nTests completed with code: ${code}`);
  process.exit(code || 0);
});

// Force exit if hanging
setTimeout(() => {
  console.log('\n⚠️ Test runner timeout - forcing exit');
  vitest.kill('SIGKILL');
  process.exit(1);
}, 60000);
EOF

# Run the test runner
node test-runner.cjs
RESULT=$?

# Clean up
rm -f test-runner.cjs

exit $RESULT