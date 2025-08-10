# MCP Server for Claude - Home Assistant Add-on

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)
[![GitHub Release](https://img.shields.io/github/v/release/mtebusi/HA_MCP?include_prereleases)](https://github.com/mtebusi/HA_MCP/releases)
[![License](https://img.shields.io/github/license/mtebusi/HA_MCP)](LICENSE)
[![Lint](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/lint.yaml)
[![Builder](https://github.com/mtebusi/HA_MCP/actions/workflows/builder.yaml/badge.svg)](https://github.com/mtebusi/HA_MCP/actions/workflows/builder.yaml)

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
- **Enterprise Security** - AppArmor, rate limiting, input sanitization, entity filtering
- **Real-time Updates** - WebSocket connection for instant state changes
- **Multi-Architecture** - Supports ARM, AMD64, and i386 platforms
- **Easy Installation** - One-click add to Home Assistant

## Quick Start

Get up and running in 5 minutes:

1. **Add Repository** - Click the "Add to Home Assistant" button above
2. **Install Add-on** - Find "MCP Server for Claude" in your Add-on Store
3. **Configure** - Set your access token and preferences
4. **Connect Claude** - Add the configuration to Claude Desktop
5. **Start Using** - Ask Claude to control your smart home!

## Installation

### One-Click Install

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
| `authentication_mode` | Authentication method (ha_oauth2 or none) | `ha_oauth2` |
| `external_url` | Your HomeAssistant external URL for OAuth2 | _(auto-detect)_ |
| `log_level` | Logging verbosity | `info` |
| `max_clients` | Maximum concurrent connections | `5` |
| `enable_entity_filtering` | Filter accessible entities | `false` |
| `allowed_domains` | Entity domains to expose | _(all)_ |
| `blocked_entities` | Specific entities to block | _(none)_ |

4. Start the add-on and enable **Start on boot**

### Claude Desktop Setup

#### Simple OAuth2 Connection (No Configuration Required!)

The add-on uses your HomeAssistant's built-in authentication system:

1. **Start the Add-on** and check the logs for the Discovery URL

2. **In Claude Desktop:**
   - Go to **Settings** → **Connectors**
   - Click **Add Custom Connector**
   - Enter the Discovery URL from the add-on logs:
     ```
     http://<your-ha-ip>:7089/.well-known/oauth-authorization-server
     ```

3. **Authenticate:**
   - Claude will redirect you to your HomeAssistant login page
   - Log in with your HomeAssistant credentials
   - Authorize Claude Desktop to access your MCP server
   - You're connected! No tokens or secrets to manage

#### Method 2: Direct Configuration (Legacy)

For direct local connections or advanced setups:

1. **Generate an Access Token (if using authentication):**
   - In Home Assistant Add-on Configuration:
     - Set `authentication_required` to `true`
     - Either set a custom `access_token` or let the add-on generate one
     - Copy the token from the add-on logs

2. **Configure Claude Desktop:**
   
   Edit `claude_desktop_config.json`:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

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
           "SUPERVISOR_TOKEN": "YOUR_SUPERVISOR_TOKEN",
           "HOMEASSISTANT_URL": "ws://supervisor/core/api/websocket"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

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

- **Rating**: 6/6 (Highest security rating)
- **AppArmor**: Enabled with strict profile
- **Network**: Isolated container environment
- **Access**: Only required Home Assistant APIs
- **Authentication**: Token-based with timeout
- **Filtering**: Entity-level access control

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
- **Platforms**: ARM (Raspberry Pi), AMD64 (x86_64), i386
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