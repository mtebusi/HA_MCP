# Changelog

All notable changes to the Claude AI MCP Bridge add-on will be documented in this file.

## [1.0.0] - 2024-08-13

### Added
- Initial release of Claude AI MCP Bridge for Home Assistant
- Zero-configuration setup - works immediately after installation
- Full implementation of Model Context Protocol (MCP) v1.0
- Server-Sent Events (SSE) transport for real-time communication
- Complete Home Assistant API integration
- Support for all Home Assistant service domains
- Natural language processing via Assist API
- Area-based device control
- Template rendering support
- OAuth2 authentication (optional)
- SSL/TLS support (optional)
- Health monitoring and metrics endpoints
- Rate limiting and session management
- Multi-architecture support (ARM, x86, etc.)
- Ingress support for secure access
- AppArmor security profile
- Comprehensive error handling
- Debug logging modes

### Features
- Turn devices on/off with natural language
- Query device states and history
- Execute automations and scenes
- Control climate devices
- Lock/unlock smart locks
- Media player control
- Custom service calls
- LLM API integration
- Resource providers for entity context
- Prompt templates for common tasks

### Security
- Secure by default configuration
- CORS protection
- Session-based authentication
- Rate limiting per session
- AppArmor confinement
- SSL certificate support

### Developer Experience
- TypeScript implementation
- Comprehensive type definitions
- ESLint configuration
- Jest testing framework
- Health check endpoints
- Prometheus metrics
- Extensive logging

## [0.9.0-beta] - 2024-08-10

### Added
- Beta release for testing
- Core MCP functionality
- Basic Home Assistant integration

## Notes

This add-on follows semantic versioning. For detailed documentation, see [DOCS.md](./DOCS.md).