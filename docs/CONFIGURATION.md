# Configuration Guide

Complete configuration reference for the MCP Server for Claude Home Assistant Add-on.

## Table of Contents

- [Add-on Configuration](#add-on-configuration)
- [Claude Desktop Configuration](#claude-desktop-configuration)
- [Environment Variables](#environment-variables)
- [Security Settings](#security-settings)
- [Performance Tuning](#performance-tuning)
- [Entity Filtering](#entity-filtering)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Examples](#configuration-examples)

## Add-on Configuration

### Basic Settings

Configuration is done through the Home Assistant Add-on UI. Navigate to:
**Settings** → **Add-ons** → **MCP Server for Claude** → **Configuration**

#### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | integer | `6789` | TCP port for MCP server (1024-65535) |
| `authentication_required` | boolean | `true` | Require authentication token |
| `access_token` | string | `null` | Authentication token (auto-generated if null) |
| `log_level` | select | `info` | Logging verbosity level |

#### Connection Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connection_timeout` | integer | `30` | Connection timeout in seconds (5-300) |
| `max_clients` | integer | `5` | Maximum concurrent connections (1-10) |

#### Security Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable_entity_filtering` | boolean | `false` | Enable entity access filtering |
| `allowed_domains` | list | `[]` | Entity domains to expose |
| `blocked_entities` | list | `[]` | Specific entities to block |

### Detailed Option Descriptions

#### Port
```yaml
port: 6789
```
The TCP port where the MCP server listens. Must be unique and not used by other services.
- Range: 1024-65535
- Common alternatives: 6790, 8089, 9001

#### Authentication Required
```yaml
authentication_required: true
```
When enabled, requires a valid access token for all connections.
- Recommended: Always keep enabled for security
- Disable only for testing in isolated environments

#### Access Token
```yaml
access_token: "your-secure-token-here"
```
Authentication token for Claude Desktop connection.
- If null, a token is auto-generated on first start
- Use strong, random tokens (32+ characters)
- Store securely and never commit to version control

#### Log Level
```yaml
log_level: info
```
Controls the verbosity of logging output.
- `debug`: All messages including debug info
- `info`: Normal operational messages
- `warning`: Warnings and errors only
- `error`: Only error messages

#### Connection Timeout
```yaml
connection_timeout: 30
```
Time in seconds before idle connections are closed.
- Minimum: 5 seconds
- Maximum: 300 seconds
- Higher values maintain connections longer but use more resources

#### Max Clients
```yaml
max_clients: 5
```
Maximum number of simultaneous Claude Desktop connections.
- Range: 1-10
- Each client uses approximately 10-20MB memory
- Higher values allow more concurrent users

#### Entity Filtering
```yaml
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - sensor
  - climate
blocked_entities:
  - switch.critical_system
  - lock.safe
```
Control which entities Claude can access.
- `allowed_domains`: Only entities from these domains are accessible
- `blocked_entities`: Specific entities to block (overrides allowed_domains)
- Use format: `domain.entity_name`

## Claude Desktop Configuration

### Configuration File Locations

Find your Claude Desktop configuration file:

| Operating System | Configuration Path |
|-----------------|-------------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

### Basic Configuration

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "addon_local_mcp_claude",
        "node",
        "/app/dist/index.js"
      ],
      "env": {
        "SUPERVISOR_TOKEN": "YOUR_LONG_LIVED_TOKEN",
        "HOMEASSISTANT_URL": "ws://supervisor/core/api/websocket"
      }
    }
  }
}
```

### Remote Connection Configuration

For connecting to Home Assistant from a different machine:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "npx",
      "args": [
        "-y",
        "homeassistant-mcp-server"
      ],
      "env": {
        "HOMEASSISTANT_URL": "ws://YOUR_HA_IP:8123/api/websocket",
        "HOMEASSISTANT_TOKEN": "YOUR_LONG_LIVED_TOKEN",
        "MCP_TOKEN": "YOUR_MCP_ACCESS_TOKEN"
      }
    }
  }
}
```

### Multiple Instance Configuration

Connect to multiple Home Assistant instances:

```json
{
  "mcpServers": {
    "home": {
      "command": "docker",
      "args": ["exec", "-i", "addon_local_mcp_claude", "node", "/app/dist/index.js"],
      "env": {
        "SUPERVISOR_TOKEN": "HOME_TOKEN",
        "HOMEASSISTANT_URL": "ws://supervisor/core/api/websocket"
      }
    },
    "vacation": {
      "command": "npx",
      "args": ["-y", "homeassistant-mcp-server"],
      "env": {
        "HOMEASSISTANT_URL": "ws://vacation.home:8123/api/websocket",
        "HOMEASSISTANT_TOKEN": "VACATION_TOKEN"
      }
    }
  }
}
```

## Environment Variables

### Server Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPERVISOR_TOKEN` | Home Assistant Supervisor token | `eyJ0eXAiOiJKV1...` |
| `HOMEASSISTANT_URL` | WebSocket URL for Home Assistant | `ws://supervisor/core/api/websocket` |
| `HOMEASSISTANT_TOKEN` | Long-lived access token | `eyJ0eXAiOiJKV1...` |
| `MCP_TOKEN` | MCP server access token | `your-secure-token` |
| `MCP_PORT` | Override default port | `6790` |
| `LOG_LEVEL` | Override log level | `debug` |
| `NODE_ENV` | Node environment | `production` |

### Setting Environment Variables

#### In Add-on Configuration
Environment variables are set automatically based on add-on configuration.

#### For Development
```bash
export HOMEASSISTANT_URL="ws://localhost:8123/api/websocket"
export HOMEASSISTANT_TOKEN="your-token"
export LOG_LEVEL="debug"
npm run dev
```

#### In Docker
```bash
docker run -e HOMEASSISTANT_URL="ws://192.168.1.100:8123/api/websocket" \
           -e HOMEASSISTANT_TOKEN="your-token" \
           -e MCP_TOKEN="access-token" \
           homeassistant-mcp-server
```

## Security Settings

### Authentication Best Practices

1. **Always Enable Authentication**
   ```yaml
   authentication_required: true
   ```

2. **Use Strong Tokens**
   - Minimum 32 characters
   - Mix of letters, numbers, special characters
   - Regenerate periodically

3. **Secure Token Storage**
   - Never commit tokens to git
   - Use environment variables
   - Store in secure password manager

### Entity Access Control

#### Whitelist Approach
Only allow specific domains:
```yaml
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - sensor
  - binary_sensor
blocked_entities: []
```

#### Blacklist Approach
Allow all except specific entities:
```yaml
enable_entity_filtering: true
allowed_domains: []  # Empty means all domains
blocked_entities:
  - switch.main_power
  - lock.front_door
  - alarm_control_panel.home
```

#### Mixed Approach
Allow specific domains but block sensitive entities:
```yaml
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - sensor
  - climate
  - media_player
blocked_entities:
  - switch.server_power
  - switch.network_equipment
```

### Network Security

1. **Firewall Rules**
   ```bash
   # Allow only local network
   iptables -A INPUT -p tcp --dport 6789 -s 192.168.1.0/24 -j ACCEPT
   iptables -A INPUT -p tcp --dport 6789 -j DROP
   ```

2. **SSL/TLS** (Future feature)
   ```yaml
   ssl_enabled: true
   ssl_cert: /ssl/fullchain.pem
   ssl_key: /ssl/privkey.pem
   ```

## Performance Tuning

### Memory Optimization

```yaml
# Reduce memory usage
log_level: warning  # Less logging
max_clients: 2      # Fewer connections
connection_timeout: 30  # Shorter timeout
```

### High Performance

```yaml
# Maximum performance
log_level: error   # Minimal logging
max_clients: 10    # More connections
connection_timeout: 300  # Longer timeout
```

### Cache Settings

The server automatically caches:
- Entity states (5 second TTL)
- Service definitions (60 second TTL)
- Area/device lists (60 second TTL)

### Rate Limiting

Built-in rate limits:
- 100 requests per minute per tool
- 10 burst requests allowed
- Automatic backoff on limit

## Entity Filtering

### Domain Filtering Examples

#### Lights and Switches Only
```yaml
allowed_domains:
  - light
  - switch
```

#### Sensors and Binary Sensors
```yaml
allowed_domains:
  - sensor
  - binary_sensor
```

#### Media and Climate
```yaml
allowed_domains:
  - media_player
  - climate
  - fan
```

### Entity Blocking Examples

#### Block Critical Infrastructure
```yaml
blocked_entities:
  - switch.router
  - switch.modem
  - switch.server_power
  - switch.nas_power
```

#### Block Security Devices
```yaml
blocked_entities:
  - lock.front_door
  - lock.back_door
  - alarm_control_panel.home
  - switch.security_system
```

#### Block Private Areas
```yaml
blocked_entities:
  - light.master_bedroom
  - switch.master_bathroom
  - camera.bedroom
```

### Pattern Matching

Entity IDs must match exactly:
```yaml
blocked_entities:
  - light.bedroom  # Blocks only light.bedroom
  # NOT: light.bedroom_*
  # NOT: *.bedroom
```

## Advanced Configuration

### Custom WebSocket Settings

```javascript
// In custom configuration
{
  "websocket": {
    "reconnect": true,
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10,
    "pingInterval": 30000,
    "pongTimeout": 5000
  }
}
```

### Resource Limits

```yaml
# System resource limits
resources:
  memory_limit: 256M
  cpu_limit: 0.5
  storage_limit: 100M
```

### Backup Configuration

```yaml
backup_exclude:
  - "*.log"
  - "*.cache"
  - "node_modules/"
  - ".npm/"
```

### Multi-Architecture Support

The add-on supports multiple architectures:
```yaml
arch:
  - armhf    # Raspberry Pi 2
  - armv7    # Raspberry Pi 3/4 32-bit
  - aarch64  # Raspberry Pi 3/4 64-bit
  - amd64    # Intel/AMD 64-bit
  - i386     # Intel/AMD 32-bit
```

## Configuration Examples

### Minimal Configuration

```yaml
# Bare minimum - uses all defaults
port: 6789
```

### Secure Configuration

```yaml
port: 6789
authentication_required: true
access_token: "very-long-random-secure-token-here-1234567890"
log_level: warning
connection_timeout: 30
max_clients: 2
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - sensor
  - climate
blocked_entities:
  - switch.critical_system
  - lock.all_doors
```

### Development Configuration

```yaml
port: 6789
authentication_required: false  # For testing only!
access_token: null
log_level: debug
connection_timeout: 300
max_clients: 10
enable_entity_filtering: false
```

### Family Configuration

```yaml
port: 6789
authentication_required: true
access_token: "family-shared-token"
log_level: info
connection_timeout: 60
max_clients: 5
enable_entity_filtering: true
allowed_domains:
  - light
  - switch
  - media_player
  - climate
  - scene
blocked_entities:
  - switch.router
  - switch.server
  - light.master_bedroom
```

### Guest Configuration

```yaml
port: 6790  # Different port for guest instance
authentication_required: true
access_token: "guest-access-token"
log_level: info
connection_timeout: 30
max_clients: 2
enable_entity_filtering: true
allowed_domains:
  - light
  - climate
  - media_player
blocked_entities:
  - light.bedroom
  - light.bathroom
  - switch.security
  - lock.all
  - alarm_control_panel.all
```

## Validation

### Configuration Validation

The add-on validates configuration on save:
- Port range: 1024-65535
- Timeout range: 5-300 seconds
- Max clients: 1-10
- Entity ID format: `domain.entity_name`

### Testing Configuration

1. **Check Add-on Logs**
   ```
   Settings → Add-ons → MCP Server → Logs
   ```

2. **Test Connection**
   ```bash
   curl http://YOUR_HA_IP:6789/health
   ```

3. **Verify in Claude Desktop**
   - Restart Claude Desktop
   - Check MCP server status in settings

## Migration

### From Previous Versions

#### From v1.0.0 to v1.0.4
No configuration changes required. New caching features are automatic.

#### From TCP to stdio
Update Claude Desktop configuration:
```json
// Old (TCP)
"command": "node",
"args": ["path/to/tcp-server.js"]

// New (stdio)
"command": "docker",
"args": ["exec", "-i", "addon_local_mcp_claude", "node", "/app/dist/index.js"]
```

## Troubleshooting Configuration

### Common Issues

1. **Port Already in Use**
   - Change to different port (6790, 8089, etc.)
   - Check for conflicting services

2. **Authentication Failures**
   - Verify token matches exactly
   - Check for extra spaces or quotes
   - Regenerate token if needed

3. **Entity Not Found**
   - Check entity filtering settings
   - Verify entity exists in Home Assistant
   - Check domain is in allowed_domains

4. **Connection Timeouts**
   - Increase connection_timeout value
   - Check network connectivity
   - Verify firewall rules

### Debug Mode

Enable debug logging to troubleshoot:
```yaml
log_level: debug
```

Then check logs for detailed information:
```
Settings → Add-ons → MCP Server → Logs
```

## Best Practices

1. **Start Simple**: Begin with default configuration
2. **Enable Security**: Always use authentication in production
3. **Filter Entities**: Only expose what Claude needs
4. **Monitor Logs**: Check logs regularly for issues
5. **Update Regularly**: Keep add-on and configuration current
6. **Document Changes**: Keep notes on configuration modifications
7. **Test Changes**: Test in development before production
8. **Backup Configuration**: Save configuration before major changes

## Next Steps

- Review [Security Guidelines](mcp-server/SECURITY.md)
- Read [Usage Guide](USAGE_GUIDE.md) for examples
- Check [API Documentation](mcp-server/API.md) for tool details
- Join [Community](https://community.home-assistant.io/) for help