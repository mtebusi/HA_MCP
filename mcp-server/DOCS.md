# Claude MCP Server v1.0.7

Finally, a proper way to let Claude control your Home Assistant setup. No more copy-pasting YAML, no more explaining your entity names - just natural conversation with an AI that actually understands your smart home.

## What This Does

This add-on creates a bridge between Claude Desktop and your Home Assistant instance using the Model Context Protocol (MCP). Think of it as giving Claude a proper API key to your house - but with guardrails.

Claude can:
- See all your devices, areas, and automations
- Toggle lights, switches, locks (anything you let it)
- Create new automations on the fly
- Debug why that one automation never fires
- Suggest energy optimizations
- Generate Lovelace dashboards
- Much more...

## Setup

### Home Assistant Side

After installing the add-on, you'll want to tweak a few settings:

**Port** - Default is 6789. Change it if something else is camping there.

**Authentication Required** - Default is now `false` for Claude Desktop Connections. Only enable this if you're using direct API access or want an extra layer of security.

**Access Token** - Optional! Leave empty when using Claude Desktop Connections (recommended). Only set this if you enabled authentication for direct API access.

**Log Level** - `info` is fine for normal use. `debug` if things get weird.

**Entity Filtering** - Got secrets? Block specific entities or entire domains from Claude's view.

### Claude Desktop Side

#### Option 1: Claude Desktop Connections (Recommended - No Token Needed!)

The easy way - let Claude handle the authentication:

1. Make sure `authentication_required` is `false` in the add-on config
2. In Claude Desktop, go to Settings → Connectors
3. Add a Custom Connector with URL: `http://<your-ha-ip>:6789/sse`
4. That's it! Claude handles the rest

#### Option 2: Direct Configuration (Legacy)

For advanced users or specific network setups:

1. Enable authentication in the add-on and set/note your access token
2. Grab a long-lived access token from your HA profile  
3. Add the config to Claude Desktop config file (see README for paths)
4. Restart Claude Desktop

## The Tools

We've condensed everything into four main tools to keep things clean:

### Query
Pull any data from HA - entities, states, areas, devices, services, config, logs, you name it. This is Claude's eyes into your system.

### Control  
The fun stuff. Call services, toggle things, run scripts, create automations, even trigger backups. With great power...

### Monitor
Real-time event tracking, automation traces, diagnostics. Perfect for debugging that automation that fires at 3am for no reason.

### Assist
The smart features - pattern analysis, energy optimization, security checks, config validation, migration help. This is where Claude really shines.

## Real Examples

**You**: "Why didn't my motion light automation work last night?"
**Claude**: *Uses monitor tool to trace automation, finds condition blocked it*

**You**: "Create an automation that dims the lights when we start watching TV"
**Claude**: *Uses control tool to create automation with media player triggers*

**You**: "Check if I left anything unlocked"
**Claude**: *Uses assist tool for security check, lists any unlocked doors*

## Performance

The add-on maintains a local cache of entity states to keep things snappy. It uses WebSocket subscriptions for real-time updates, so Claude always has current data. 

Memory usage is minimal (~50MB), CPU usage is basically nothing unless you're hammering it with requests.

## Security Notes

- Runs in a Docker container with AppArmor enabled
- Only accesses HA through the official Supervisor API  
- Can only see/control what you give it permission for
- All actions are logged

## Troubleshooting

### Claude can't connect
1. Check the add-on is actually running (green badge in UI)
2. Verify the port isn't blocked by a firewall
3. If using Claude Desktop Connections, ensure `authentication_required` is `false`
4. If using direct connection with auth, verify the access token matches exactly (no extra spaces!)

### Commands fail or timeout
- Check the add-on logs for errors
- Verify Home Assistant API is enabled
- Some services might not be available in your setup

### Entity not found errors
- Entity might be filtered out (check your filtering config)
- Entity ID might have changed (HA loves to do this)
- Integration might be offline

## Advanced Usage

Got comfortable? Try these:

- Use websocket_commands for raw WebSocket access (monitor tool)
- Import blueprints directly from URLs (assist tool)  
- Generate complete Lovelace configs from entity lists
- Trace multiple automation runs to find patterns

## Limitations

- History queries need the HTTP API (not available via WebSocket)
- Some integrations don't expose all their services
- Can't modify the add-on's own configuration (that would be too meta)

## Support

Running into issues? Check the [GitHub repo](https://github.com/mtebusi/HA_MCP) or the add-on logs first. Most problems are token or network related.

Remember: Claude can only do what you could do through the UI. If it's not working manually, Claude won't magically fix it.