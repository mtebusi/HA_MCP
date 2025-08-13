# Claude AI MCP Bridge Documentation

## Overview

The Claude AI MCP Bridge enables seamless integration between Claude Desktop and your Home Assistant instance using the Model Context Protocol (MCP) with Server-Sent Events (SSE) transport.

## ✨ Zero-Configuration Setup

This add-on works immediately after installation with **zero configuration required**! Simply:

1. Install the add-on
2. Start it
3. Connect Claude Desktop using your Home Assistant URL
4. Begin controlling your smart home with natural language

## Features

### Natural Language Control
Control your entire smart home using conversational commands through Claude Desktop:
- Turn lights on/off
- Adjust thermostats
- Lock/unlock doors
- Activate scenes
- Query device states
- Execute automations
- Use Home Assistant's Assist API
- Access LLM tools and integrations

### Supported Home Assistant Domains
- All domains supported by Home Assistant's Assist API
- Custom integrations with LLM API support
- Template rendering and evaluation
- Area-based device control
- Service calls to any domain

## Installation

### Quick Start (Zero-Config)

1. **Add Repository**
   ```
   Settings → Add-ons → Add-on Store → ⋮ → Repositories
   Add: https://github.com/mtebusi/ha-mcp
   ```

2. **Install & Start**
   - Find "Claude AI MCP Bridge for Smart Home Control"
   - Click Install
   - Click Start (no configuration needed!)

3. **Connect Claude Desktop**
   - Open Claude Desktop
   - Settings → Custom Connectors → Add Remote MCP Server
   - Enter your Home Assistant URL (e.g., `http://homeassistant.local:8123`)
   - The add-on will be discovered automatically!

### Optional: SSL Configuration

For external access, you can optionally configure SSL:

```yaml
ssl: true
certfile: fullchain.pem
keyfile: privkey.pem
```

**Note:** SSL is not required for local network or ingress connections.

## Configuration Options (All Optional)

| Option | Description | Default |
|--------|-------------|---------|
| `log_level` | Logging verbosity | `info` |
| `ssl` | Enable HTTPS | `false` |
| `certfile` | SSL certificate file | - |
| `keyfile` | SSL private key file | - |
| `allowed_origins` | Custom CORS origins | Claude Desktop URLs |
| `session_timeout` | Session duration (seconds) | `3600` |
| `max_sessions` | Maximum concurrent sessions | `10` |
| `rate_limit` | Requests per minute | `100` |
| `llm_hass_api` | Enable LLM API integration | `assist` |
| `custom_prompt` | Custom LLM prompt | - |

## Usage Examples

### Basic Commands
```
"Turn on the living room lights"
"What's the temperature in the bedroom?"
"Lock the front door"
"Is the garage door open?"
```

### Advanced Commands with Assist API
```
"Turn off all lights except the bedroom"
"Set the house to night mode"
"Show me energy usage for the last week"
"What devices are using the most power?"
```

### Area-Based Control
```
"Turn off everything in the kitchen"
"Set all bedroom lights to 50%"
"Lock all doors in the house"
```

### Using Templates
```
"What's the average temperature across all sensors?"
"Show me which lights have been on for more than 2 hours"
"Calculate my daily energy cost"
```

## How It Works

### 1. Discovery
Claude Desktop discovers your add-on via the `.well-known/mcp.json` endpoint automatically.

### 2. Connection
The add-on establishes an SSE connection for real-time bidirectional communication.

### 3. Authentication
- **Ingress**: Automatically authenticated via Home Assistant
- **Direct**: Optional OAuth2 or anonymous access
- **Zero-config**: Works without any authentication setup

### 4. Tool Execution
Claude can execute Home Assistant tools including:
- Service calls
- State queries
- Intent processing
- Template rendering
- Area control
- LLM API tools

## API Endpoints

### Discovery Endpoint
```
GET /.well-known/mcp.json
```
Returns MCP server capabilities and configuration.

### SSE Stream
```
GET /mcp/sse
```
Establishes SSE connection for real-time communication.

### Health Check
```
GET /health
```
Returns server health status.

## Security

### Default Security (Zero-Config)
- Ingress connections are pre-authenticated
- Local network access is allowed
- No external exposure by default

### Enhanced Security (Optional)
- OAuth2 authentication
- SSL/TLS encryption
- Rate limiting
- Session management
- CORS protection

## Integration with Home Assistant LLM APIs

This add-on fully integrates with Home Assistant's LLM API system:

### Built-in Assist API
Automatically exposes Home Assistant's Assist API to Claude, allowing natural language control of all exposed entities.

### Custom LLM Tools
Integrations can register custom tools that become available to Claude:
- Custom service calls
- Integration-specific features
- Advanced automations

### Context Awareness
Claude receives context about:
- Available entities
- Areas and zones
- Device capabilities
- Service definitions

## Troubleshooting

### Claude Desktop Can't Connect
1. Ensure add-on is running (green dot)
2. Check your Home Assistant URL is correct
3. Try using the local URL: `http://homeassistant.local:8123`
4. Check add-on logs for errors

### Commands Not Working
1. Verify entities are exposed to Assist
2. Check Home Assistant logs
3. Ensure your user has appropriate permissions
4. Try simpler commands first

### View Logs
```bash
ha addons logs claude_ai_mcp
```

### Enable Debug Mode
```yaml
log_level: debug
```

## Advanced Features

### Custom Prompts
Configure custom prompts for specific use cases:
```yaml
custom_prompt: "You are a helpful home automation assistant. Always confirm before making changes to security devices."
```

### LLM API Selection
Choose which LLM APIs to expose:
```yaml
llm_hass_api: "assist,custom_integration"
```

### Rate Limiting
Adjust rate limits for your needs:
```yaml
rate_limit: 200  # Allow 200 requests per minute
```

## Performance Tips

1. **Use Ingress**: Provides the best performance and security
2. **Enable caching**: Reduces API calls to Home Assistant
3. **Optimize prompts**: Use specific, clear commands
4. **Batch operations**: Group multiple commands when possible

## Support

- **Issues**: [GitHub Issues](https://github.com/mtebusi/ha-mcp/issues)
- **Wiki**: [Documentation](https://github.com/mtebusi/ha-mcp/wiki)
- **Community**: [Home Assistant Community](https://community.home-assistant.io/)

## License

Apache License 2.0 - See [LICENSE](https://github.com/mtebusi/ha-mcp/blob/main/LICENSE)