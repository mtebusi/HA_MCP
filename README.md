# MCP Server for Claude - Home Assistant Add-on

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)
[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE)

Model Context Protocol (MCP) server add-on enabling Claude AI to interact with and control Home Assistant.

## Installation

### Quick Install

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)

Click the button above to automatically add this repository to your Home Assistant instance.

### Manual Installation

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click **⋮** → **Repositories**
3. Add: `https://github.com/mtebusi/HA_MCP`
4. Click **Add**

## Configuration

### Add-on Setup

1. Find **MCP Server for Claude** in the Add-on Store
2. Click **Install**
3. Configure settings in the **Configuration** tab:

| Setting | Description | Default |
|---------|-------------|---------|
| `port` | TCP port for MCP server | `6789` |
| `authentication_required` | Require token for connections | `true` |
| `access_token` | Authentication token | _(auto-generated)_ |
| `log_level` | Logging verbosity | `info` |
| `max_clients` | Maximum concurrent connections | `5` |
| `enable_entity_filtering` | Filter accessible entities | `false` |
| `allowed_domains` | Entity domains to expose | _(all)_ |
| `blocked_entities` | Specific entities to block | _(none)_ |

4. Start the add-on and enable **Start on boot**

### Claude Desktop Configuration

1. **Create a Home Assistant Token**
   - Go to your profile → **Long-Lived Access Tokens**
   - Click **Create Token** → Name it "Claude MCP"
   - Copy the token immediately

2. **Download Client Script**
   ```bash
   curl -O https://raw.githubusercontent.com/mtebusi/HA_MCP/main/claude-desktop-client.js
   ```

3. **Configure Claude Desktop**
   
   Edit `claude_desktop_config.json`:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "homeassistant": {
         "command": "node",
         "args": ["/path/to/claude-desktop-client.js"],
         "env": {
           "HOMEASSISTANT_HOST": "YOUR_HA_IP",
           "HOMEASSISTANT_PORT": "6789",
           "HOMEASSISTANT_TOKEN": "YOUR_ACCESS_TOKEN"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop**

## Available Tools

The MCP server provides 4 main tools with multiple operations:

### 🔍 Query Tool
Read information from Home Assistant:
- `entities` - List and filter entities
- `state` - Get entity states
- `history` - Query historical data
- `areas` - List areas
- `devices` - List devices  
- `services` - Available services
- `config` - System configuration
- `templates` - Template sensors
- `integrations` - Loaded integrations
- `addons` - Installed add-ons
- `logs` - System logs

### 🎮 Control Tool
Execute actions in Home Assistant:
- `call_service` - Call any service
- `toggle` - Toggle entities
- `set_value` - Set entity values
- `scene_activate` - Activate scenes
- `script_run` - Run scripts
- `reload_integration` - Reload integrations
- `create_automation` - Create automations
- `backup_create` - Create backups
- `recorder_purge` - Purge recorder data

### 📊 Monitor Tool
Real-time monitoring and events:
- `subscribe` - Subscribe to events
- `unsubscribe` - Unsubscribe from events
- `get_events` - Get event stream
- `fire_event` - Fire custom events
- `diagnostics` - System diagnostics
- `trace_automation` - Debug automations
- `websocket_commands` - Raw WebSocket commands

### 🤖 Assist Tool
AI-enhanced operations:
- `suggest_automation` - Automation suggestions
- `analyze_patterns` - Pattern analysis
- `optimize_energy` - Energy optimization
- `security_check` - Security audit
- `troubleshoot` - System troubleshooting
- `explain_state` - State explanations
- `validate_config` - Configuration validation
- `performance_analysis` - Performance metrics
- `generate_lovelace` - Dashboard generation
- `migration_check` - Migration assistance
- `blueprint_import` - Import blueprints

## Examples

### Basic Usage
```
User: Show me all lights that are on
Claude: I'll query for all light entities that are currently on.
[Uses query tool with domain:"light" and state_filter:"on"]
```

### Advanced Automation
```
User: Create an automation that turns on lights at sunset
Claude: I'll create a sunset automation for your lights.
[Uses control tool with create_automation operation]
```

### System Analysis
```
User: Check my system performance and suggest optimizations
Claude: I'll analyze your system performance and provide recommendations.
[Uses assist tool with performance_analysis operation]
```

## Security

- **Rating**: 6/6 (Highest security rating)
- **AppArmor**: Enabled with strict profile
- **Network**: Isolated container environment
- **Access**: Only required Home Assistant APIs
- **Authentication**: Token-based with timeout
- **Filtering**: Entity-level access control

## Troubleshooting

### Add-on Issues
- Check logs in the add-on page
- Verify port availability
- Ensure Home Assistant API is enabled

### Connection Problems
- Verify IP address and port
- Check authentication token
- Test network connectivity

### Performance
- Monitor active connections
- Check entity cache size
- Review log level settings

## Development

### Architecture
```
Claude Desktop ←→ stdio ←→ MCP Server ←→ WebSocket ←→ Supervisor API ←→ Home Assistant
```

### Security Features
- **Transport**: Uses stdio instead of TCP for enhanced security
- **Rate Limiting**: 100 requests per minute per tool
- **Input Sanitization**: All inputs validated and sanitized
- **Memory Management**: Automatic cleanup with TTL cache
- **Error Boundaries**: Comprehensive error handling
- **Connection Limits**: Automatic retry with exponential backoff

### Building
```bash
cd mcp-server
npm install
npm run build
```

## Support

- [Issues](https://github.com/mtebusi/HA_MCP/issues)
- [Discussions](https://github.com/mtebusi/HA_MCP/discussions)

## License

MIT - See [LICENSE](LICENSE) file

[releases-shield]: https://img.shields.io/github/release/mtebusi/HA_MCP.svg
[releases]: https://github.com/mtebusi/HA_MCP/releases
[license-shield]: https://img.shields.io/github/license/mtebusi/HA_MCP.svg