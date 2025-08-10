# Frequently Asked Questions (FAQ)

## General Questions

### What is the HomeAssistant MCP Server?

The HomeAssistant MCP Server is an add-on that enables Claude Desktop to communicate with your HomeAssistant instance using the Model Context Protocol (MCP). It allows you to control your smart home devices using natural language through Claude.

### What can I do with this add-on?

With this add-on, you can:
- Control lights, switches, and other devices using natural language
- Query device states and sensor readings
- Create and manage automations
- Access historical data and trends
- Execute complex home automation scenarios
- Get insights about your home's energy usage and patterns

### Is this official HomeAssistant software?

No, this is a community-developed add-on that bridges HomeAssistant with Claude Desktop. It follows HomeAssistant add-on standards but is not officially maintained by the HomeAssistant team.

## Installation Questions

### What are the minimum requirements?

- HomeAssistant 2024.1.0 or later
- 256MB RAM available
- 100MB storage space
- Claude Desktop installed on your computer
- Active internet connection (for Claude Desktop)

### How do I install the add-on?

1. Add the repository URL to your HomeAssistant add-on stores
2. Find "HomeAssistant MCP Server" in the add-on store
3. Click Install and wait for completion
4. Configure with your preferences
5. Start the add-on

### Why can't I find the add-on in the store?

Possible reasons:
- Repository not added correctly
- HomeAssistant version too old (need 2024.1.0+)
- Supervisor not running or outdated
- Network issues preventing repository access

### Do I need to open any ports?

For SSE mode (remote access), port 8099 needs to be accessible. For local stdio mode, no additional ports are required.

## Configuration Questions

### How do I generate a long-lived access token?

1. Go to your HomeAssistant profile (click your username)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Give it a memorable name
5. Copy the token immediately (it won't be shown again)

### What's the difference between SSE and stdio modes?

- **SSE (Server-Sent Events)**: Allows remote connections, uses HTTP/HTTPS, suitable for cloud deployments
- **stdio (Standard I/O)**: Local only, more secure, uses process communication, ideal for local installations

### How do I connect Claude Desktop?

1. Open Claude Desktop settings
2. Go to MCP Servers section
3. Add the configuration provided by the add-on
4. Insert your long-lived access token
5. Restart Claude Desktop

### Can I limit which devices Claude can access?

Yes! You can configure:
- `entity_domains`: Limit to specific device types (lights, switches, etc.)
- `allowed_entities`: Whitelist specific devices
- `excluded_entities`: Blacklist sensitive devices

## Security Questions

### Is this secure?

The add-on implements multiple security layers:
- Token-based authentication
- Entity filtering and permissions
- Rate limiting to prevent abuse
- Input validation and sanitization
- Optional SSL/TLS encryption
- No external data sharing

### Can Claude access my personal data?

Claude can only access:
- Device states and attributes you've allowed
- Service calls you've permitted
- Historical data for allowed entities

Claude cannot access:
- Personal files or documents
- Passwords or credentials
- System configuration
- Devices you've excluded

### What happens to my data?

- All communication is between your HomeAssistant and Claude Desktop
- No data is stored on external servers
- Temporary caching is local only
- Logs can be configured to exclude sensitive information

### Should I expose this to the internet?

We recommend:
- Use VPN for remote access when possible
- Enable SSL/TLS if exposing to internet
- Use strong, unique tokens
- Regularly rotate access tokens
- Monitor access logs

## Troubleshooting Questions

### Why can't Claude connect to my HomeAssistant?

Common causes:
1. Token is invalid or expired
2. Add-on is not running
3. Network connectivity issues
4. Firewall blocking connection
5. Wrong URL in Claude Desktop configuration

### Why are some devices not appearing?

Check:
- Entity domain is included in configuration
- Device is not in excluded_entities list
- Device is available in HomeAssistant
- Cache may need refreshing (wait 60 seconds)

### Why are commands failing?

Possible reasons:
- Rate limit exceeded (wait a minute)
- Service not available for that entity
- Entity doesn't support the requested action
- HomeAssistant is restarting or updating

### How do I check if the add-on is working?

1. Check add-on logs in HomeAssistant
2. Visit health endpoint: `http://YOUR_HA:8099/health`
3. Try a simple command in Claude: "What devices do I have?"
4. Check WebSocket connection status in logs

## Performance Questions

### Why is the response slow?

- First request after startup takes longer (cache warming)
- Large number of entities can slow queries
- Network latency between Claude and HomeAssistant
- Rate limiting may be throttling requests

### How can I improve performance?

1. Limit entity_domains to only what you need
2. Increase cache_ttl_seconds for stable entities
3. Use local connection mode if possible
4. Ensure adequate resources (RAM/CPU)

### What are the resource requirements?

- Typical usage: 50-100MB RAM
- Peak usage: Up to 256MB RAM
- CPU: Minimal, typically <5%
- Network: Varies by usage, typically <1Mbps

## Feature Questions

### Can I create automations with Claude?

Yes, Claude can help you:
- Design automation logic
- Create automation YAML
- Trigger existing automations
- Query automation status
- Suggest automation improvements

### Can Claude learn my preferences?

Claude doesn't store conversation history between sessions, but you can:
- Create scenes for common settings
- Build automations for recurring tasks
- Use Claude to analyze patterns and suggest optimizations

### Can I use this with multiple HomeAssistant instances?

Currently, each add-on instance connects to one HomeAssistant. For multiple instances:
- Run separate add-on installations
- Configure different ports
- Add multiple MCP servers in Claude Desktop

### Does this work with HomeAssistant Cloud?

Yes, if you have remote access enabled through HomeAssistant Cloud:
1. Use your Nabu Casa URL
2. Configure SSE mode
3. Use your cloud access token

## Common Issues

### "Connection refused" error

- Verify add-on is running
- Check URL is correct
- Ensure port 8099 is not blocked
- Confirm network connectivity

### "Authentication failed" error

- Regenerate long-lived access token
- Verify token is copied correctly
- Check token has not expired
- Ensure no extra spaces in token

### "Entity not found" error

- Check exact entity name
- Verify entity exists in HomeAssistant
- Confirm entity domain is allowed
- Wait for cache refresh (60 seconds)

### "Rate limit exceeded" error

- Wait 60 seconds before retrying
- Reduce frequency of requests
- Increase rate_limit_per_minute in config
- Batch multiple commands together

## Advanced Questions

### Can I contribute to the project?

Yes! The project is open source. You can:
- Report issues on GitHub
- Submit pull requests
- Improve documentation
- Share automation examples
- Help other users in forums

### How do I enable debug logging?

Set log_level to "debug" in configuration:
```yaml
log_level: debug
```

Or set environment variable:
```bash
DEBUG=* npm start
```

### Can I use this with Node-RED?

While not directly integrated, you can:
- Use Claude to generate Node-RED flows
- Trigger Node-RED automations via HomeAssistant
- Query Node-RED entity states through HomeAssistant

### Is there an API I can use directly?

The MCP server exposes:
- `/health` - Health check endpoint
- `/sse` - SSE endpoint for MCP communication
- `/metrics` - Prometheus metrics (if enabled)

### How do I backup my configuration?

Configuration is stored in:
- `/data/options.json` - Add-on configuration
- Environment variables - Tokens and URLs
- Regular HomeAssistant backup includes add-on config

## Updates and Maintenance

### How do I update the add-on?

1. Check for updates in add-on info page
2. Read changelog for breaking changes
3. Backup your configuration
4. Click Update
5. Restart add-on after update

### Will updates break my setup?

We follow semantic versioning:
- Patch updates (1.0.x): Bug fixes, safe to update
- Minor updates (1.x.0): New features, backward compatible
- Major updates (x.0.0): May have breaking changes, read changelog

### How often should I update?

- Security updates: Immediately
- Bug fixes: As soon as convenient
- Feature updates: After reviewing changelog
- Major updates: After testing in non-production

## Getting Help

### Where can I get support?

- GitHub Issues: Bug reports and feature requests
- HomeAssistant Community Forum: General discussions
- Discord: Real-time help
- Documentation: Detailed guides

### How do I report a bug?

1. Check existing GitHub issues
2. Collect: Add-on version, HA version, logs
3. Create detailed issue with reproduction steps
4. Include relevant configuration (hide tokens!)

### How can I request a feature?

1. Check if already requested
2. Open GitHub issue with [Feature Request] tag
3. Describe use case and benefits
4. Consider submitting a pull request

## Legal and Privacy

### What data is collected?

No telemetry or usage data is collected. All data stays local to your installation.

### Is this free to use?

Yes, the add-on is open source and free. You need:
- HomeAssistant (free)
- Claude Desktop (requires Claude subscription)

### What's the license?

MIT License - free for personal and commercial use.

### Can I use this commercially?

Yes, but:
- No warranty or support guaranteed
- You're responsible for security
- Consider contributing back to the project