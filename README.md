# Claude MCP Server for Home Assistant

Enable Claude AI to control and interact with your Home Assistant instance through the Model Context Protocol (MCP).

## 🚀 Quick Start Guide

### Step 1: Install the Add-on in Home Assistant

1. **Add the Repository**
   - Open Home Assistant
   - Navigate to **Settings** → **Add-ons** → **Add-on Store**
   - Click the **⋮** (3-dot menu) → **Repositories**
   - Add this repository URL: `https://github.com/yourusername/homeassistant-mcp-server`
   - Click **Add** → **Close**

2. **Install the Add-on**
   - In the Add-on Store, scroll to find "Claude MCP Server"
   - Click on it, then click **Install**
   - Wait for installation to complete

### Step 2: Configure the Add-on

1. **Start the Add-on**
   - After installation, stay on the add-on page
   - Toggle **Start on boot** to ON (recommended)
   - Click **START**

2. **Configure Settings** (optional)
   - In the Configuration tab, you can set:
     - `external_access_token`: Optional security token for Claude Desktop
     - `log_level`: Set to "debug" for troubleshooting
   - Click **SAVE** if you make changes

3. **Verify it's Running**
   - Check the **Log** tab - you should see:
     ```
     [MCP Server] Listening on port 6789
     [MCP Server] Ready for Claude Desktop connections
     ```

### Step 3: Get Your Home Assistant Token

1. **Create a Long-Lived Access Token**
   - In Home Assistant, click your profile (bottom left)
   - Scroll down to **Long-Lived Access Tokens**
   - Click **Create Token**
   - Name it "Claude MCP" and click **OK**
   - **Copy the token immediately** (you won't see it again!)

### Step 4: Configure Claude Desktop

1. **Download the Client Script**
   - Save [claude-desktop-client.js](https://raw.githubusercontent.com/yourusername/homeassistant-mcp-server/main/claude-desktop-client.js) to your computer
   - Remember the full path (e.g., `/Users/you/claude-desktop-client.js`)

2. **Edit Claude Desktop Configuration**
   - Open Claude Desktop settings
   - Find and edit `claude_desktop_config.json`
   - Add this configuration:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": ["/path/to/claude-desktop-client.js"],
      "env": {
        "HOMEASSISTANT_HOST": "YOUR_HA_IP_ADDRESS",
        "HOMEASSISTANT_PORT": "6789",
        "HOMEASSISTANT_TOKEN": "YOUR_LONG_LIVED_TOKEN"
      }
    }
  }
}
```

Replace:
- `/path/to/claude-desktop-client.js` with your actual file path
- `YOUR_HA_IP_ADDRESS` with your Home Assistant IP (e.g., `192.168.1.100`)
- `YOUR_LONG_LIVED_TOKEN` with the token from Step 3

3. **Restart Claude Desktop**
   - Completely quit Claude Desktop
   - Start it again
   - The MCP server should now be connected!

## ✅ Testing Your Setup

Ask Claude:
- "What Home Assistant entities do I have?"
- "Turn on the living room lights"
- "What's the temperature in the bedroom?"
- "Show me all my areas and devices"

## 🛠️ Available Tools

Claude can now:
- **get_entities** - List and filter all your entities
- **get_entity_state** - Check any entity's current state
- **call_service** - Execute any Home Assistant service
- **get_areas** - List all configured areas
- **get_devices** - List all devices
- **get_services** - See available services
- **subscribe_events** - Monitor real-time events
- And more!

## 🔧 Troubleshooting

### Add-on Won't Start
- Check the add-on logs for errors
- Ensure port 6789 is not used by another add-on
- Verify Home Assistant API is enabled

### Claude Can't Connect
- Verify your Home Assistant IP address is correct
- Check if port 6789 is accessible from your computer
- Try using IP address instead of hostname
- Ensure the long-lived token is valid

### Connection Refused
- Make sure the add-on is running (green "Running" status)
- Check your firewall settings
- Verify the IP and port in Claude Desktop config

### Authentication Failed
- Double-check your long-lived access token
- Create a new token if the current one isn't working
- Ensure no extra spaces in the token

## 📋 Configuration Options

### Add-on Configuration
- `external_access_token`: (Optional) Additional security token
- `log_level`: debug, info, warning, or error
- `enable_debug`: Enable verbose debugging

### Network Requirements
- Port 6789 must be accessible from your Claude Desktop machine
- No SSL/HTTPS required (runs on local network)
- Works with Home Assistant Cloud or local instance

## 🔒 Security Notes

- The MCP server only exposes what your access token permits
- Runs isolated in a Docker container
- Only accessible on your local network
- Optional additional authentication token for extra security

## 📝 Examples

### Turn on a Light
```
You: Turn on the living room light
Claude: I'll turn on the living room light for you.
[Claude uses call_service tool with light.turn_on]
```

### Check Temperature
```
You: What's the current temperature in the bedroom?
Claude: Let me check the bedroom temperature sensor.
[Claude uses get_entity_state tool]
The bedroom temperature is currently 72°F.
```

### Complex Automation
```
You: Turn off all lights except the bedroom, and set the thermostat to 68
Claude: I'll help you with that. Let me:
1. Turn off all lights except the bedroom
2. Set the thermostat to 68°F
[Claude uses multiple call_service tools]
```

## 🤝 Contributing

Issues and PRs welcome at: https://github.com/yourusername/homeassistant-mcp-server

## 📄 License

MIT License - See LICENSE file for details