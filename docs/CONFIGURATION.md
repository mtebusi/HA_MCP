# Configuration Guide

## Add-on Configuration Options

The HomeAssistant MCP Server add-on can be configured through the HomeAssistant UI or via YAML configuration.

### Basic Configuration

```yaml
connection_mode: "sse"  # or "stdio"
log_level: info
url: null  # Optional: external URL for SSE mode
entity_domains:
  - light
  - switch
  - sensor
  - climate
  - cover
  - media_player
rate_limit_per_minute: 100
cache_ttl_seconds: 60
```

### Configuration Parameters

#### connection_mode
- **Type**: `string`
- **Default**: `"sse"`
- **Options**: `"sse"`, `"stdio"`
- **Description**: Choose between Server-Sent Events (SSE) for remote connections or stdio for local connections.

#### log_level
- **Type**: `string`
- **Default**: `"info"`
- **Options**: `"debug"`, `"info"`, `"warning"`, `"error"`
- **Description**: Set the logging verbosity level.

#### url
- **Type**: `string` (optional)
- **Default**: `null`
- **Description**: External URL for SSE mode. If not set, the add-on will use the HomeAssistant internal URL.

#### entity_domains
- **Type**: `array`
- **Default**: `["light", "switch", "sensor", "climate", "cover", "media_player"]`
- **Description**: List of entity domains to expose to Claude. Limiting domains improves performance and security.

#### rate_limit_per_minute
- **Type**: `integer`
- **Default**: `100`
- **Range**: `10-1000`
- **Description**: Maximum number of API calls allowed per minute to prevent overload.

#### cache_ttl_seconds
- **Type**: `integer`
- **Default**: `60`
- **Range**: `10-300`
- **Description**: Time-to-live for cached entity states in seconds.

## Claude Desktop Configuration

### Method 1: SSE Connection (Recommended)

1. Open Claude Desktop settings
2. Navigate to MCP Servers
3. Add new server configuration:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse",
        "https://YOUR_HA_URL:8099/sse"
      ],
      "env": {
        "SSE_API_KEY": "YOUR_LONG_LIVED_TOKEN"
      }
    }
  }
}
```

### Method 2: Local Connection

For local HomeAssistant installations:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": [
        "/usr/local/lib/node_modules/@homeassistant/mcp-server/dist/index.js"
      ],
      "env": {
        "HA_TOKEN": "YOUR_LONG_LIVED_TOKEN",
        "HA_URL": "http://localhost:8123"
      }
    }
  }
}
```

## Advanced Configuration

### Security Settings

```yaml
# Restrict access to specific entity IDs
allowed_entities:
  - light.living_room
  - switch.bedroom_fan
  - sensor.temperature

# Exclude sensitive entities
excluded_entities:
  - lock.front_door
  - alarm_control_panel.home

# Enable additional security features
enable_command_validation: true
require_confirmation_for_services: true
```

### Performance Tuning

```yaml
# Optimize for large installations
websocket_options:
  max_reconnect_attempts: 10
  reconnect_interval_ms: 5000
  ping_interval_ms: 30000
  
# Memory management
max_cached_entities: 1000
entity_update_batch_size: 50
```

### Network Configuration

```yaml
# Proxy settings (if behind corporate firewall)
proxy:
  enabled: false
  host: "proxy.example.com"
  port: 8080
  auth:
    username: ""
    password: ""

# SSL/TLS settings
ssl:
  verify: true
  ca_cert: "/ssl/ca.pem"
  client_cert: "/ssl/client.pem"
  client_key: "/ssl/client-key.pem"
```

## Environment Variables

The add-on respects the following environment variables:

- `HA_TOKEN`: HomeAssistant long-lived access token
- `HA_URL`: HomeAssistant instance URL (default: http://supervisor/core)
- `LOG_LEVEL`: Override configuration log level
- `NODE_ENV`: Set to `production` for optimized performance
- `DEBUG`: Set to `*` for verbose debugging output

## Troubleshooting Configuration Issues

### Common Problems

1. **Connection Refused**
   - Verify the HomeAssistant URL is correct
   - Check if the add-on port (8099) is exposed
   - Ensure firewall rules allow the connection

2. **Authentication Failed**
   - Regenerate the long-lived access token
   - Verify token has necessary permissions
   - Check token hasn't expired

3. **Entities Not Appearing**
   - Review entity_domains configuration
   - Check excluded_entities list
   - Verify entities exist in HomeAssistant

4. **Performance Issues**
   - Reduce rate_limit_per_minute if hitting limits
   - Increase cache_ttl_seconds for stable entities
   - Limit entity_domains to necessary ones only

### Configuration Validation

Run the configuration validator:

```bash
npm run validate-config
```

This checks for:
- Valid YAML syntax
- Required fields present
- Value ranges and types
- Conflicting settings

## Migration from Previous Versions

### From v1.0.x to v1.1.x

The configuration structure has changed. Update your configuration:

**Old format:**
```yaml
token: "your-token"
url: "http://localhost:8123"
```

**New format:**
```yaml
connection_mode: "sse"
url: null  # Uses internal URL
# Token now stored securely via UI
```

## Best Practices

1. **Security First**
   - Always use HTTPS in production
   - Rotate tokens regularly
   - Limit entity exposure to necessary domains

2. **Performance Optimization**
   - Start with default cache settings
   - Monitor logs for rate limit warnings
   - Adjust batch sizes based on system resources

3. **Maintenance**
   - Keep configuration in version control
   - Document custom settings
   - Test configuration changes in development first

## Configuration Examples

### Minimal Configuration
```yaml
connection_mode: "sse"
log_level: "info"
```

### High-Security Configuration
```yaml
connection_mode: "stdio"
log_level: "warning"
entity_domains:
  - light
  - sensor
excluded_entities:
  - lock.*
  - alarm_control_panel.*
  - camera.*
rate_limit_per_minute: 50
enable_command_validation: true
require_confirmation_for_services: true
```

### Performance-Optimized Configuration
```yaml
connection_mode: "sse"
log_level: "error"
entity_domains:
  - light
  - switch
rate_limit_per_minute: 200
cache_ttl_seconds: 120
websocket_options:
  ping_interval_ms: 60000
max_cached_entities: 2000
```