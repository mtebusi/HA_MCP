# MCP Server for Claude - Home Assistant Add-on

![Logo](logo.png)

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)
[![GitHub Release](https://img.shields.io/github/v/release/mtebusi/HA_MCP?include_prereleases)](https://github.com/mtebusi/HA_MCP/releases)
[![License](https://img.shields.io/github/license/mtebusi/HA_MCP)](LICENSE)
[![Lint Status](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml)
[![Build Status](https://github.com/mtebusi/HA_MCP/actions/workflows/builder.yaml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/builder.yaml)

### 🏗️ Supported Architectures

[![armhf](https://img.shields.io/badge/armhf-yes-green.svg)](https://github.com/mtebusi/HA_MCP) Raspberry Pi Zero/1
[![armv7](https://img.shields.io/badge/armv7-yes-green.svg)](https://github.com/mtebusi/HA_MCP) Raspberry Pi 3/4 (32-bit)
[![aarch64](https://img.shields.io/badge/aarch64-yes-green.svg)](https://github.com/mtebusi/HA_MCP) Raspberry Pi 4/5 (64-bit)
[![amd64](https://img.shields.io/badge/amd64-yes-green.svg)](https://github.com/mtebusi/HA_MCP) Intel/AMD
[![i386](https://img.shields.io/badge/i386-yes-green.svg)](https://github.com/mtebusi/HA_MCP) Legacy x86

### 📊 Project Health

[![GitHub Activity](https://img.shields.io/github/commit-activity/m/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/graphs/commit-activity)
[![Last Commit](https://img.shields.io/github/last-commit/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/commits)
[![Issues](https://img.shields.io/github/issues/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/issues)
[![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/mtebusi/HA_MCP/graphs/commit-activity)
[![Community](https://img.shields.io/badge/Community-Forum-41BDF5.svg)](https://community.home-assistant.io/)

**Control your Home Assistant smart home with Claude AI using natural language.** This add-on implements the Model Context Protocol (MCP) to give Claude Desktop direct, secure access to your Home Assistant instance. Turn lights on/off, create automations, debug issues, analyze energy usage, and manage your entire smart home through conversational AI.

## 🌟 Key Features

- **🗣️ Natural Language Control** - Talk to Claude like a human to control devices
- **🔧 40+ Operations** - Query states, call services, create automations, analyze patterns
- **🔒 Simplified Security** - Automatic supervisor token authentication
- **⚡ Real-time Updates** - WebSocket connection for instant state changes
- **🏗️ Universal Compatibility** - All Raspberry Pi models, Intel/AMD, and legacy systems
- **🚀 Easy Installation** - One-click add to Home Assistant
- **🌐 Ingress Support** - Works with Nabu Casa and remote access

## Installation

### ⚠️ Important for v1.1.3 and Earlier Users
**You MUST uninstall the old version first:**
1. Uninstall the existing MCP Server add-on
2. Refresh your browser
3. Follow the installation steps below

### Quick Install

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)

Click the button above to automatically add this repository to your Home Assistant instance.

### Manual Installation

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click **⋮** → **Repositories**
3. Add: `https://github.com/mtebusi/HA_MCP`
4. Click **Add**
5. Refresh the Add-on Store
6. Install **MCP Server for Claude v1.1.5**

## Configuration

### Add-on Setup

1. Find **MCP Server for Claude** in the Add-on Store
2. Click **Install**
3. Configure settings in the **Configuration** tab:

| Setting | Description | Default |
|---------|-------------|---------|
| `port` | TCP port for MCP server | `6789` |
| `log_level` | Logging verbosity | `info` |
| `connection_timeout` | WebSocket connection timeout | `30` |
| `max_clients` | Maximum concurrent connections | `5` |
| `enable_entity_filtering` | Filter accessible entities | `false` |
| `allowed_domains` | Entity domains to expose | _(all)_ |
| `blocked_entities` | Specific entities to block | _(none)_ |

4. Start the add-on and enable **Start on boot**

### Claude Desktop Configuration

Use one of these URLs based on your setup:
- **Local Network**: `http://homeassistant.local:6789`
- **IP Address**: `http://<your-ha-ip>:6789`
- **Nabu Casa**: `https://<your-id>.ui.nabu.casa:6789`

1. **Configure Claude Desktop**
   
   Edit `claude_desktop_config.json`:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "homeassistant": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-sse-client",
           "http://homeassistant.local:6789/sse"
         ]
       }
     }
   }
   ```

2. **Restart Claude Desktop** - Authentication is handled automatically!

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

## 💬 Example Commands

Ask Claude natural language questions and commands like:

### 🏠 Device Control
- *"Turn off all the lights in the bedroom"*
- *"Set the thermostat to 72 degrees"*
- *"Lock all doors and arm the security system"*
- *"Is the garage door open?"*

### 🤖 Automation Creation
- *"Create an automation that dims lights when I start watching TV"*
- *"Set up a morning routine that gradually turns on lights"*
- *"Alert me if any door is left open for more than 5 minutes"*

### 📊 Analysis & Optimization
- *"Which devices are using the most energy?"*
- *"Show me patterns in my heating usage"*
- *"Are there any devices that are unavailable?"*
- *"Optimize my automations for energy savings"*

### 🔍 Troubleshooting
- *"Why didn't my motion sensor trigger last night?"*
- *"Debug my sunrise automation"*
- *"What events fired in the last hour?"*
- *"Check the health of my Z-Wave network"*

## Security

- **Authentication**: Automatic supervisor token authentication
- **Network**: Isolated container with ingress support
- **Access**: Only required Home Assistant APIs via Supervisor
- **Rate Limiting**: 100 requests per minute per tool
- **Filtering**: Entity-level access control
- **Input Validation**: All inputs sanitized and validated

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

## 🔧 Compatibility

- **Home Assistant**: 2024.10.0 or newer
- **Claude Desktop**: Latest version with MCP support
- **Supported Devices**:
  - Raspberry Pi Zero/1 (armv6/armhf)
  - Raspberry Pi 3/4 32-bit (armv7)
  - Raspberry Pi 4/5 64-bit (aarch64/arm64)
  - Intel/AMD systems (amd64/x86_64)
  - Legacy 32-bit x86 (i386)
- **Operating Systems**: HassOS, Debian, Ubuntu, Alpine Linux
- **Integrations**: Works with all Home Assistant integrations

## 📚 Related Projects

- [Model Context Protocol](https://github.com/anthropics/mcp) - The protocol specification
- [Home Assistant](https://www.home-assistant.io/) - Open source home automation
- [Claude Desktop](https://claude.ai/desktop) - Anthropic's AI assistant

## License

MIT - See [LICENSE](LICENSE) file

---

**Keywords**: Home Assistant, Claude AI, MCP, Model Context Protocol, smart home, home automation, AI assistant, natural language processing, IoT, voice control, Anthropic, Claude Desktop, home assistant addon, hassio, automation, smart devices, artificial intelligence, LLM, websocket, real-time, TypeScript, Docker