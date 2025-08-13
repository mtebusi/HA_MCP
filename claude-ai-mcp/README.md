# Claude AI MCP Bridge for Home Assistant

Connect Claude Desktop to your Home Assistant instance using the Model Context Protocol (MCP).

## About

This add-on enables you to control your entire smart home using natural language through Claude Desktop. It implements the Model Context Protocol with Server-Sent Events (SSE) transport for real-time bidirectional communication.

## Features

- 🚀 **Zero-Configuration Setup** - Works immediately after installation
- 🗣️ **Natural Language Control** - Control devices conversationally
- 🏠 **Full Home Assistant Integration** - Access all exposed entities
- 🔐 **Secure by Default** - OAuth2 authentication and SSL support
- 🤖 **LLM API Integration** - Works with Home Assistant's Assist API
- 📊 **Real-time Communication** - SSE transport for instant responses
- 🌍 **Multi-Architecture** - Supports ARM, x86, and more

## Installation

1. Add this repository to your Home Assistant Add-on Store
2. Install the "Claude AI MCP Bridge" add-on
3. Start the add-on (no configuration required!)
4. Connect Claude Desktop to your Home Assistant URL

## Quick Start

After installation, simply connect Claude Desktop to:
```
http://homeassistant.local:8123
```

The add-on will be automatically discovered via the MCP discovery protocol.

## Example Commands

- "Turn on the living room lights"
- "What's the temperature in the bedroom?"
- "Lock all doors"
- "Set the house to night mode"
- "Show me which devices are using the most energy"

## Support

For documentation, see the [DOCS](./DOCS.md) file.
For issues, visit [GitHub Issues](https://github.com/mtebusi/ha-mcp/issues).

## License

Apache License 2.0