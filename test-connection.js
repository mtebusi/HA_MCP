#!/usr/bin/env node

/**
 * Test script to verify MCP server connection
 * Run this to test if your MCP server is accessible
 * 
 * Usage: node test-connection.js <host> <port> [token]
 * Example: node test-connection.js 192.168.1.100 6789 your-token
 */

const net = require('net');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node test-connection.js <host> <port> [token]');
  console.log('Example: node test-connection.js 192.168.1.100 6789');
  process.exit(1);
}

const HOST = args[0];
const PORT = parseInt(args[1]);
const TOKEN = args[2] || '';

console.log(`Testing connection to ${HOST}:${PORT}...`);

const client = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log('✅ Connected successfully!');
  
  if (TOKEN) {
    console.log('Sending authentication token...');
    client.write(TOKEN + '\n');
  } else {
    console.log('No token provided, testing without authentication');
    client.end();
    console.log('✅ Connection test successful!');
    process.exit(0);
  }
});

client.on('data', (data) => {
  const response = data.toString().trim();
  if (response === 'AUTH_OK') {
    console.log('✅ Authentication successful!');
    client.end();
    process.exit(0);
  } else if (response === 'AUTH_FAILED') {
    console.log('❌ Authentication failed - check your token');
    client.end();
    process.exit(1);
  }
});

client.on('error', (error) => {
  console.log(`❌ Connection failed: ${error.message}`);
  console.log('\nTroubleshooting:');
  console.log('1. Check if the add-on is running in Home Assistant');
  console.log('2. Verify the IP address and port are correct');
  console.log('3. Check your firewall settings');
  console.log('4. Make sure port 6789 is not blocked');
  process.exit(1);
});

client.on('close', () => {
  console.log('Connection closed');
});

setTimeout(() => {
  console.log('❌ Connection timeout - server not responding');
  client.destroy();
  process.exit(1);
}, 5000);