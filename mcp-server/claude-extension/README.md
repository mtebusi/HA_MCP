# Home Assistant MCP Server for Claude Desktop

## Quick Setup Guide

This extension enables Claude Desktop to control your Home Assistant smart home using natural language.

## Prerequisites

1. Home Assistant 2024.10.0 or newer
2. Claude Desktop with MCP support
3. Home Assistant Supervisor access

## Installation Steps

### 1. Install the Home Assistant Add-on

Click to add the repository to your Home Assistant:

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)

Or manually:
1. Go to Settings → Add-ons → Add-on Store
2. Click ⋮ → Repositories
3. Add: `https://github.com/mtebusi/HA_MCP`
4. Install "MCP Server for Claude"

### 2. Configure the Add-on

In the add-on Configuration tab:
- Keep default port (6789) unless needed
- Enable authentication (recommended)
- Set an access token if using authentication
- Configure entity filtering if desired

Start the add-on and enable "Start on boot"

### 3. Get Your Supervisor Token

1. Go to your Home Assistant profile
2. Scroll to "Long-Lived Access Tokens"
3. Create a new token named "Claude MCP"
4. Copy the token (you'll need it next)

### 4. Configure Claude Desktop

1. Locate your Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Open the `config.json` file from this package

3. Replace `YOUR_SUPERVISOR_TOKEN_HERE` with your token from step 3

4. Copy the entire contents to your Claude Desktop config file

5. Restart Claude Desktop

## Verification

After restarting Claude Desktop, you should see the Home Assistant MCP server in the MCP menu.

Test with commands like:
- "What lights are on?"
- "Turn off the bedroom lights"
- "Show me the temperature sensors"

## Available Tools

### Query Tool
- List entities, areas, devices
- Get states and history
- View configurations and logs

### Control Tool  
- Call services
- Toggle devices
- Create automations
- Run scripts

### Monitor Tool
- Subscribe to events
- Trace automations
- View diagnostics

### Assist Tool
- Pattern analysis
- Energy optimization
- Security checks
- Configuration validation

## Troubleshooting

### Connection Issues
- Verify the add-on is running (green badge)
- Check the Supervisor token is correct
- Ensure no firewall blocking port 6789

### Commands Not Working
- Check add-on logs for errors
- Verify entity isn't filtered
- Ensure service is available

## Support

- [GitHub Issues](https://github.com/mtebusi/HA_MCP/issues)
- [Documentation](https://github.com/mtebusi/HA_MCP/blob/main/README.md)
- [Home Assistant Community](https://community.home-assistant.io/)

## Security Notes

- Uses secure stdio transport (not TCP)
- Token-based authentication
- Entity-level access control
- All actions are logged

## License

MIT - See [LICENSE](https://github.com/mtebusi/HA_MCP/blob/main/LICENSE)