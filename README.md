# Home Assistant Claude AI MCP Integration

[![Builder](https://github.com/mtebusi/ha-mcp/actions/workflows/builder.yaml/badge.svg)](https://github.com/mtebusi/ha-mcp/actions/workflows/builder.yaml)
[![Lint](https://github.com/mtebusi/ha-mcp/actions/workflows/lint.yaml/badge.svg)](https://github.com/mtebusi/ha-mcp/actions/workflows/lint.yaml)
[![GitHub Release](https://img.shields.io/github/release/mtebusi/ha-mcp.svg?style=flat)](https://github.com/mtebusi/ha-mcp/releases)
[![License](https://img.shields.io/github/license/mtebusi/ha-mcp.svg?style=flat)](LICENSE)

Connect Claude Desktop to your Home Assistant instance using the Model Context Protocol (MCP).

## 🚀 Features

- **Zero-Configuration Setup** - Works immediately after installation
- **Natural Language Control** - Control your entire smart home conversationally
- **Full Home Assistant Integration** - Access all exposed entities and services
- **Secure by Default** - OAuth2 authentication and SSL support
- **Real-time Communication** - Server-Sent Events (SSE) transport
- **Multi-Architecture Support** - ARM, x86, and more

## 📦 Installation

### Quick Start

1. **Add Repository to Home Assistant**
   ```
   Settings → Add-ons → Add-on Store → ⋮ → Repositories
   Add: https://github.com/mtebusi/ha-mcp
   ```

2. **Install the Add-on**
   - Find "Claude AI MCP Bridge for Smart Home Control"
   - Click Install
   - Click Start

3. **Connect Claude Desktop**
   - Open Claude Desktop
   - Settings → Custom Connectors → Add Remote MCP Server
   - Enter: `http://homeassistant.local:8123`
   - The add-on will be discovered automatically!

## 🎯 Usage

Once connected, you can control your Home Assistant with natural language:

- "Turn on the living room lights"
- "What's the temperature in the bedroom?"
- "Lock all doors"
- "Set the house to night mode"
- "Show me energy usage for today"

## 📚 Documentation

- [Add-on Documentation](claude-ai-mcp/DOCS.md)
- [Changelog](claude-ai-mcp/CHANGELOG.md)
- [Configuration Guide](claude-ai-mcp/DOCS.md#configuration-options-all-optional)

## 🏗️ Repository Structure

```
ha-mcp/
├── claude-ai-mcp/        # Main Home Assistant add-on
│   ├── mcp-server/       # TypeScript MCP server implementation
│   ├── rootfs/           # Add-on filesystem overlay
│   ├── config.yaml       # Add-on configuration
│   └── Dockerfile        # Container build instructions
├── .github/              # GitHub Actions workflows
└── repository.yaml       # Home Assistant repository metadata
```

## 🛠️ Development

### Prerequisites

- Node.js 20+
- TypeScript 5+
- Docker
- Home Assistant development environment

### Building Locally

```bash
# Clone the repository
git clone https://github.com/mtebusi/ha-mcp.git
cd ha-mcp

# Install dependencies
cd claude-ai-mcp/mcp-server
npm install

# Build TypeScript
npm run build

# Build Docker image
docker build -t claude-ai-mcp claude-ai-mcp/
```

### Testing

```bash
# Run TypeScript tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Home Assistant](https://www.home-assistant.io/) for the amazing smart home platform
- [Anthropic](https://www.anthropic.com/) for Claude and the Model Context Protocol
- The Home Assistant community for continuous support and feedback

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/mtebusi/ha-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mtebusi/ha-mcp/discussions)
- **Community**: [Home Assistant Community](https://community.home-assistant.io/)

## 🔗 Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Home Assistant Add-on Development](https://developers.home-assistant.io/docs/add-ons/)
- [Claude Desktop](https://claude.ai/desktop)

---

Made with ❤️ for the Home Assistant Community