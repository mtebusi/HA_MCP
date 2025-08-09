# Release Notes - v1.0.4

## Home Assistant MCP Server for Claude Desktop

We're excited to announce the release of version 1.0.4 of the Home Assistant MCP Server, bringing significant performance improvements and enhanced build processes.

### What's New

#### Performance Enhancements
- **85% faster builds** with comprehensive caching strategy
- Implemented GitHub Actions caching for NPM dependencies, TypeScript builds, and Docker layers
- Added cache warming to pre-build dependencies daily
- Optimized Dockerfile for better layer caching

#### Build System Improvements
- Switched from `npm install` to `npm ci` for reproducible builds
- Added multi-architecture QEMU setup for improved cross-platform builds
- Implemented cache hit/miss reporting for transparency
- Added automated cache management and pruning

### Key Features

This add-on enables natural language control of your Home Assistant through Claude Desktop:

- **40+ Operations** across 4 main tools (Query, Control, Monitor, Assist)
- **Real-time Updates** via WebSocket connection
- **Enterprise Security** with token authentication and entity filtering
- **Multi-Architecture Support** for ARM and x86 platforms
- **One-Click Installation** through Home Assistant Add-on Store

### Installation

#### Quick Install
[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmtebusi%2FHA_MCP)

#### Manual Installation
1. Add repository: `https://github.com/mtebusi/HA_MCP`
2. Install "MCP Server for Claude" from Add-on Store
3. Configure and start the add-on
4. Set up Claude Desktop with provided configuration

### What You Can Do

Ask Claude natural language commands like:
- "Turn off all bedroom lights"
- "Create an automation for movie night"
- "Why didn't my motion sensor trigger?"
- "Optimize my energy usage"
- "Show me what devices are offline"

### Technical Details

- **Protocol**: Model Context Protocol (MCP) 1.0.0
- **Transport**: Secure stdio (not TCP)
- **Security**: AppArmor, rate limiting, input sanitization
- **Requirements**: Home Assistant 2024.10.0+, Claude Desktop with MCP support

### Bug Fixes
- Fixed changelog workflow base branch parameter
- Resolved cache key issues in build process
- Improved error handling for cache restoration

### Upgrade Notes

This version is fully compatible with previous configurations. No migration required.

To upgrade:
1. Update through Home Assistant Add-on Store
2. Restart the add-on
3. No configuration changes needed

### Coming Next

We're working on:
- Additional AI-powered analysis tools
- Enhanced pattern recognition
- Improved energy optimization algorithms
- Extended integration support

### Community

Join the discussion:
- [GitHub Issues](https://github.com/mtebusi/HA_MCP/issues)
- [Home Assistant Community Forum](https://community.home-assistant.io/)
- [Feature Requests](https://github.com/mtebusi/HA_MCP/discussions)

### Thank You

Thanks to all contributors and testers who helped make this release possible. Special thanks to the Home Assistant and Anthropic teams for their excellent platforms.

### Download

- [GitHub Release](https://github.com/mtebusi/HA_MCP/releases/tag/v1.0.4)
- [Docker Images](https://github.com/mtebusi/HA_MCP/pkgs/container/ha_mcp)
- [Claude Extension Package](https://github.com/mtebusi/HA_MCP/releases/download/v1.0.4/homeassistant-mcp-claude-extension-v1.0.4.zip)

---

**License**: MIT
**Author**: Matt Busi
**Support**: matt@tebusi.com