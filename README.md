# MCP Server for Claude - Home Assistant Add-on

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)
[![GitHub Release](https://img.shields.io/github/v/release/mtebusi/HA_MCP?include_prereleases)](https://github.com/mtebusi/HA_MCP/releases)
[![License](https://img.shields.io/github/license/mtebusi/HA_MCP)](LICENSE)
[![Lint](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml)
[![Build](https://github.com/mtebusi/HA_MCP/actions/workflows/ha-addon-build.yml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/ha-addon-build.yml)

[![Supports aarch64 Architecture](https://img.shields.io/badge/aarch64-yes-green.svg)](https://github.com/mtebusi/HA_MCP)
[![Supports amd64 Architecture](https://img.shields.io/badge/amd64-yes-green.svg)](https://github.com/mtebusi/HA_MCP)
[![Supports armhf Architecture](https://img.shields.io/badge/armhf-yes-green.svg)](https://github.com/mtebusi/HA_MCP)
[![Supports armv7 Architecture](https://img.shields.io/badge/armv7-yes-green.svg)](https://github.com/mtebusi/HA_MCP)
[![Supports i386 Architecture](https://img.shields.io/badge/i386-yes-green.svg)](https://github.com/mtebusi/HA_MCP)

[![GitHub Activity](https://img.shields.io/github/commit-activity/m/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/graphs/commit-activity)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/commits)
[![GitHub Issues](https://img.shields.io/github/issues/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/mtebusi/HA_MCP)](https://github.com/mtebusi/HA_MCP/pulls)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/mtebusi/HA_MCP/graphs/commit-activity)
[![Community Forum](https://img.shields.io/badge/Community-Forum-41BDF5.svg)](https://community.home-assistant.io/)

**Control your Home Assistant smart home with Claude AI using natural language.** This add-on implements the Model Context Protocol (MCP) to give Claude Desktop direct, secure access to your Home Assistant instance. Turn lights on/off, create automations, debug issues, analyze energy usage, and manage your entire smart home through conversational AI.

## Table of Contents

- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [One-Click Install](#one-click-install)
  - [Manual Installation](#manual-installation)
- [Configuration](#configuration)
  - [Add-on Setup](#add-on-setup)
  - [Claude Desktop Setup](#claude-desktop-setup)
- [Usage](#usage)
  - [Available Tools](#available-tools)
  - [Example Commands](#example-commands)
- [Documentation](#documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)

## Key Features

- **Natural Language Control** - Talk to Claude like a human to control devices
- **40+ Operations** - Query states, call services, create automations, analyze patterns
- **Enterprise Security** - Supervisor tokens, rate limiting, input sanitization, entity filtering
- **Real-time Updates** - WebSocket connection for instant state changes
- **Multi-Architecture** - Full support for all Raspberry Pi models (Zero/1/3/4/5), Intel/AMD, and legacy x86
- **Easy Installation** - One-click add to Home Assistant
- **Ingress Support** - Works with Nabu Casa and remote access

## Quick Start

Get up and running in 5 minutes:

1. **Add Repository** - Click the "Add to Home Assistant" button above
2. **Install Add-on** - Find "MCP Server for Claude" in your Add-on Store
3. **Configure** - Set your access token and preferences
4. **Connect Claude** - Add the configuration to Claude Desktop
5. **Start Using** - Ask Claude to control your smart home!

## Installation

### ⚠️ Important for v1.1.3 and Earlier Users
**You MUST uninstall the old version before installing v1.1.5:**
1. Go to **Settings** → **Add-ons**
2. Click on **MCP Server for Claude**
3. Click **Uninstall**
4. Refresh your browser (Ctrl+F5 / Cmd+Shift+R)
5. Follow the installation steps below

### One-Click Install

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)

Click the button above to automatically add this repository to your Home Assistant instance.

### Manual Installation

1. Navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click **⋮** → **Repositories**
3. Add: `https://github.com/mtebusi/HA_MCP`
4. Click **Add**
5. **Refresh the Add-on Store** (pull down to refresh on mobile, F5 on desktop)
6. Find and install **MCP Server for Claude v1.1.5**

## Configuration

### Add-on Setup

1. Find **MCP Server for Claude** in the Add-on Store
2. Click **Install**
3. Configure settings in the **Configuration** tab:

| Setting | Description | Default |
|---------|-------------|---------|
| `port` | TCP port for MCP server | `6789` |
| `log_level` | Logging verbosity | `info` |
| `connection_timeout` | WebSocket connection timeout (seconds) | `30` |
| `max_clients` | Maximum concurrent connections | `5` |
| `enable_entity_filtering` | Filter accessible entities | `false` |
| `allowed_domains` | Entity domains to expose | _(all)_ |
| `blocked_entities` | Specific entities to block | _(none)_ |

4. Start the add-on and enable **Start on boot**

### Claude Desktop Setup

#### Connection URLs

Use one of these URLs in Claude Desktop based on your setup:

- **Local Network**: `http://homeassistant.local:6789`
- **IP Address**: `http://<your-ha-ip>:6789`
- **Nabu Casa (Remote)**: `https://<your-id>.ui.nabu.casa:6789`

1. **Configure Claude Desktop:**
   
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

   For Nabu Casa users, replace the URL with:
   ```
   "https://<your-id>.ui.nabu.casa:6789/sse"
   ```

2. **Restart Claude Desktop**

The add-on automatically handles authentication using supervisor tokens - no manual token configuration needed!

## Usage

### Available Tools

The MCP server provides 4 main tools with multiple operations:

#### Query Tool
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

#### Control Tool
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

#### Monitor Tool
Real-time monitoring and events:
- `subscribe` - Subscribe to events
- `unsubscribe` - Unsubscribe from events
- `get_events` - Get event stream
- `fire_event` - Fire custom events
- `diagnostics` - System diagnostics
- `trace_automation` - Debug automations
- `websocket_commands` - Raw WebSocket commands

#### Assist Tool
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

### Example Commands

Ask Claude natural language questions and commands like:

#### Device Control
- *"Turn off all the lights in the bedroom"*
- *"Set the thermostat to 72 degrees"*
- *"Lock all doors and arm the security system"*
- *"Is the garage door open?"*

#### Automation Creation
- *"Create an automation that dims lights when I start watching TV"*
- *"Set up a morning routine that gradually turns on lights"*
- *"Alert me if any door is left open for more than 5 minutes"*

#### Analysis & Optimization
- *"Which devices are using the most energy?"*
- *"Show me patterns in my heating usage"*
- *"Are there any devices that are unavailable?"*
- *"Optimize my automations for energy savings"*

#### Troubleshooting Tasks
- *"Why didn't my motion sensor trigger last night?"*
- *"Debug my sunrise automation"*
- *"What events fired in the last hour?"*
- *"Check the health of my Z-Wave network"*

## Security

- **Authentication**: Supervisor tokens for secure access
- **Network**: Isolated container environment with ingress support
- **Access**: Only required Home Assistant APIs via Supervisor
- **Rate Limiting**: 100 requests per minute per tool
- **Filtering**: Entity-level access control
- **Input Validation**: All inputs sanitized and validated

## Documentation

- **[API Reference](mcp-server/API.md)** - Complete MCP tools documentation
- **[Configuration Guide](CONFIGURATION.md)** - Detailed configuration options
- **[Usage Guide](USAGE_GUIDE.md)** - Examples and best practices
- **[Architecture](ARCHITECTURE.md)** - System design and components
- **[Troubleshooting](mcp-server/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Security](mcp-server/SECURITY.md)** - Security guidelines and best practices
- **[Development](DEVELOPMENT.md)** - Contributing and development setup
- **[Changelog](mcp-server/CHANGELOG.md)** - Version history and updates

## Troubleshooting

### Common Issues

#### Add-on Won't Start
- Check the add-on logs for specific errors
- Verify port 6789 is not in use by another service
- Ensure Home Assistant API is enabled in your configuration

#### Claude Can't Connect
- Verify the add-on is running (green badge in UI)
- Check your firewall allows connections on port 6789
- Ensure the access token matches exactly (no extra spaces)
- Confirm Docker is running on your system

#### Commands Fail or Timeout
- Check the add-on logs for detailed error messages
- Verify the entity exists and is available
- Some services may require additional permissions
- Check if the integration is properly loaded

#### Performance Issues
- Monitor the number of active connections
- Reduce log level from `debug` to `info`
- Enable entity filtering to reduce data transfer
- Check system resources (CPU, memory)

For detailed troubleshooting, see the [full troubleshooting guide](mcp-server/TROUBLESHOOTING.md).

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

- **[GitHub Issues](https://github.com/mtebusi/HA_MCP/issues)** - Report bugs and request features
- **[Discussions](https://github.com/mtebusi/HA_MCP/discussions)** - Ask questions and share ideas
- **[Community Forum](https://community.home-assistant.io/)** - Home Assistant community support
- **[Discord](https://discord.gg/home-assistant)** - Real-time chat with the community

## Contributing

We welcome contributions! Please see our [Development Guide](DEVELOPMENT.md) for details on:

- Setting up your development environment
- Running tests
- Submitting pull requests
- Code style guidelines
- Adding new features

## Compatibility

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

## Related Projects

- [Model Context Protocol](https://github.com/anthropics/mcp) - The protocol specification
- [Home Assistant](https://www.home-assistant.io/) - Open source home automation
- [Claude Desktop](https://claude.ai/desktop) - Anthropic's AI assistant

## License

MIT - See [LICENSE](LICENSE) file

---

**Keywords**: Home Assistant, Claude AI, MCP, Model Context Protocol, smart home, home automation, AI assistant, natural language processing, IoT, voice control, Anthropic, Claude Desktop, home assistant addon, hassio, automation, smart devices, artificial intelligence, LLM, websocket, real-time, TypeScript, Docker