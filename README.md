# Home Assistant MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Home Assistant through WebSocket API. This server enables Claude Desktop to interact with your Home Assistant instance, control devices, monitor states, and manage automations.

## Features

- **Real-time WebSocket Connection**: Maintains persistent connection with automatic reconnection
- **State Management**: Real-time entity state updates and caching
- **Service Execution**: Call any Home Assistant service with full parameter support
- **Event Subscriptions**: Subscribe to Home Assistant events for real-time monitoring
- **Device & Area Management**: Query and filter entities by areas and devices
- **Configuration Validation**: Validate automation configurations before deployment
- **Comprehensive Error Handling**: Robust error handling with automatic recovery

## Prerequisites

- Node.js 18+ 
- Home Assistant instance with WebSocket API enabled
- Long-lived access token from Home Assistant
- Claude Desktop application

## Installation

1. Clone or download this repository:
```bash
git clone <repository-url>
cd HA_MCP
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your Home Assistant details:
```env
HOMEASSISTANT_URL=ws://localhost:8123/api/websocket
HOMEASSISTANT_TOKEN=your_long_lived_access_token_here
```

### Getting a Long-Lived Access Token

1. Open Home Assistant web interface
2. Click on your profile (bottom left)
3. Scroll down to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Give it a name (e.g., "MCP Server")
6. Copy the token and save it in your `.env` file

## Configuration for Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS/Linux
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": ["/absolute/path/to/HA_MCP/dist/index.js"],
      "env": {
        "HOMEASSISTANT_URL": "ws://localhost:8123/api/websocket",
        "HOMEASSISTANT_TOKEN": "your_long_lived_access_token_here"
      }
    }
  }
}
```

## Available Tools

### Entity Management

- **`get_entities`**: List all entities with optional filtering by domain, area, device, or state
- **`get_entity_state`**: Get detailed state and attributes of a specific entity

### Service Execution

- **`call_service`**: Call any Home Assistant service with data and target specification
- **`fire_event`**: Fire custom events in Home Assistant

### System Information

- **`get_areas`**: List all configured areas
- **`get_devices`**: List all devices with optional area filtering
- **`get_services`**: List available services with their parameters
- **`get_config`**: Get Home Assistant configuration

### Event Management

- **`subscribe_events`**: Subscribe to specific or all Home Assistant events

### Configuration Management

- **`validate_config`**: Validate automation configurations
- **`reload_config`**: Reload specific configuration types
- **`restart_homeassistant`**: Restart Home Assistant (with optional safe mode)

## Usage Examples

Once configured in Claude Desktop, you can interact with Home Assistant:

### Example Prompts

1. **"Show me all lights that are currently on"**
   - Uses `get_entities` with domain and state filters

2. **"Turn off all lights in the living room"**
   - Uses `call_service` with area targeting

3. **"What's the current temperature from the bedroom sensor?"**
   - Uses `get_entity_state` to retrieve sensor data

4. **"Create an automation that turns on lights at sunset"**
   - Uses `validate_config` to verify automation configuration

5. **"Subscribe to motion sensor events"**
   - Uses `subscribe_events` for real-time monitoring

## Resources

The server also provides MCP resources for direct data access:

- `ha://entities` - All entity states
- `ha://services` - Available services
- `ha://areas` - Configured areas
- `ha://devices` - All devices
- `ha://config` - System configuration

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Project Structure

```
HA_MCP/
├── src/
│   ├── index.ts           # Main MCP server implementation
│   ├── websocket-client.ts # WebSocket client with reconnection logic
│   ├── tools.ts           # Tool definitions
│   └── types.ts           # TypeScript type definitions
├── dist/                  # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
└── README.md            # This file
```

## Troubleshooting

### Connection Issues

1. Verify Home Assistant is accessible at the configured URL
2. Ensure the access token is valid and not expired
3. Check firewall settings allow WebSocket connections
4. For SSL connections, ensure certificates are valid

### Common Errors

- **"Authentication failed"**: Check your access token
- **"Connection timeout"**: Verify Home Assistant URL and network connectivity
- **"Entity not found"**: Ensure entity_id is correct and entity exists

### Debug Mode

Set the log level in your environment:
```env
LOG_LEVEL=debug
```

## Security Considerations

- Store access tokens securely (use `.env` file, never commit to version control)
- Use SSL/TLS for remote connections (`wss://` instead of `ws://`)
- Regularly rotate access tokens
- Limit token permissions if possible

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- MCP Server: Open an issue in this repository
- Home Assistant: Visit [Home Assistant Community](https://community.home-assistant.io/)
- Claude Desktop: Contact Anthropic support