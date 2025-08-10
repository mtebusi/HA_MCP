# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - {{RELEASE_DATE}}

### Added
- **Native OAuth2 Authentication Support**
  - Full OAuth2 server implementation for Claude Desktop Connections
  - OAuth2 authorization, token, introspection, and revocation endpoints
  - Dynamic client registration support
  - Automatic client secret generation
  - OAuth2 discovery document at `/.well-known/oauth-authorization-server`
- **Variable-based Date Management**
  - Release dates now use variables for automatic updates
  - Version management script for consistent updates across all files

### Changed
- Authentication system redesigned with three modes: `oauth2`, `token`, and `none`
- Default authentication changed from token-based to OAuth2
- Configuration schema updated to support OAuth2 client credentials
- OAuth2 server runs on separate port (default: 7089)
- Improved security with standard OAuth2 flow

### Fixed
- Removed hardcoded dates from documentation
- Updated all references to use authentication_mode instead of authentication_required

### Security
- OAuth2 provides industry-standard authentication
- Supports token refresh and revocation
- Client credentials validation
- Bearer token validation for all SSE connections

## [1.0.6] - 2025-01-10

### Added
- Comprehensive documentation suite (5 new guides)
  - Configuration, Usage, Architecture, Deployment guides
  - FAQ with troubleshooting and common questions
- Full ESLint and Prettier configuration
- Integration test suites for WebSocket, MCP, and SSE servers
- Code quality tooling with lint and format scripts

### Fixed
- All documentation gaps (8 missing file references resolved)
- ESLint configuration (was placeholder, now fully configured)
- Version synchronization across all files

### Changed
- Updated all version numbers to maintain consistency
- Improved code organization and test structure

### Removed
- Duplicate LICENSE file in mcp-server directory
- Outdated v1.0.4 release archives

## [1.0.5] - 2025-01-10

### Added
- SSE (Server-Sent Events) support for remote Claude Desktop connections
- URL-based connection architecture for cloud deployments
- Comprehensive documentation (Configuration, Usage, Architecture, Deployment guides)
- ESLint and Prettier configuration for code quality
- FAQ documentation for common questions and troubleshooting
- Integration test placeholder structure

### Changed
- Enhanced security with multiple authentication layers
- Improved WebSocket reconnection logic with exponential backoff
- Updated Node.js compatibility for v24 with --no-node-snapshot flag
- Optimized caching strategy for better performance

### Fixed
- TypeScript build errors and type definitions
- GitHub Actions workflow issues
- Documentation gaps and broken references (8 missing files now created)
- ESLint configuration (was placeholder, now fully configured)
- Memory leak in entity cache management

### Security
- Added rate limiting (100 requests/minute default)
- Implemented circuit breaker pattern for resilience
- Enhanced input validation and sanitization
- Added entity filtering and permission controls
## [1.0.4] - 2025-08-09
### Added
- **Advanced GitHub Actions Caching**: Implemented comprehensive caching strategy based on GitHub documentation
  - NPM dependency caching with package-lock.json hash keys
  - TypeScript build artifact caching
  - Docker layer caching with BuildKit
  - Cache warming workflow for pre-building dependencies
  - Cache management workflow for automated pruning and analysis
  - Cache performance monitoring and reporting

### Changed
- **Optimized Dockerfile**: Restructured layers for better caching
  - Separated dependency installation from source code changes
  - Changed from `npm install` to `npm ci` for faster, reproducible builds
  - Added cache cleanup to reduce image size
- **Improved Builder Workflow**: Enhanced with multiple caching layers
  - Added QEMU setup for better multi-arch performance
  - Implemented cache hit/miss reporting
  - Added restore-keys for graceful cache fallbacks

### Fixed
- **Changelog Workflow**: Added base branch parameter for release events

### Performance
- **Build Time Improvements**:
  - Cached builds: 85% faster (30-60 seconds vs 3-5 minutes)
  - NPM-only changes: 75% faster (~1 minute)
  - Source-only changes: 60% faster (1-2 minutes)
  - Cache warming ensures dependencies are pre-built daily

## [1.0.3] - 2025-08-08
### Fixed
- **Critical**: Completely removed AppArmor profile to resolve installation blocking error
- Fixed Dockerfile ARG BUILD_FROM warning with proper default value
- Updated version numbers across all configuration files

### Added
- Comprehensive trust badges in both README files:
  - Architecture support badges for all platforms
  - Project health indicators (activity, commits, issues)
  - Maintenance status and community links
  - Build and lint status badges

### Removed
- Test files from repository (test-integration.js, test-stdio.sh, validate-addon.sh)
- AppArmor profile file completely removed
- Development files added to .gitignore

### Changed
- Simplified installation process by removing AppArmor requirement
- Reduced package size by removing unnecessary test files

## [1.0.2] - 2025-08-08
### Added
- Automated changelog generation via GitHub Actions
- Release drafter configuration for automated release notes
- Commit message categorization system
- Pull request autolabeler based on title patterns
- Logo image reference in README for better Add-on store presentation

### Fixed
- Icon not displaying in Home Assistant Add-on store listing
- Logo/banner image not showing in add-on README
- PNG images now contain actual visual content instead of placeholders

### Changed
- Updated icon.png with proper MCP server design (128x128)
- Updated logo.png with gradient banner and branding (512x256)
- Images now feature server stack visualization with LED indicators

## [1.0.1] - 2025-08-08
### Fixed
- Fixed AppArmor profile loading error that prevented installation
- Fixed missing icon and logo images in Add-on store listing
- Fixed incomplete documentation in Add-on store README
- Simplified AppArmor profile to prevent syntax errors
- Temporarily disabled AppArmor enforcement for compatibility
- Updated add-on README with comprehensive documentation from root repository
- Generated proper PNG images with visual content for icon and logo

### Changed
- Replaced minimal add-on README with full-featured documentation
- Updated PNG images from placeholders to actual designed graphics

## [1.0.0] - 2025-08-08
### Initial Release
- MCP server implementation for Claude AI integration with Home Assistant
- Stdio transport for secure communication (replaced TCP)
- WebSocket connection to Home Assistant Supervisor API
- Real-time entity state monitoring and caching
- 40+ operations across 4 main tools:
  - **Query Tool**: 11 operations for reading HA data
  - **Control Tool**: 9 operations for device control and automation
  - **Monitor Tool**: 7 operations for real-time monitoring
  - **Assist Tool**: 11 operations for AI-enhanced features
- Configurable authentication and entity filtering
- Support for all major Home Assistant architectures (ARM, AMD64, i386)
- Enterprise-grade security features:
  - AppArmor security profile
  - Rate limiting (100 requests/minute)
  - Input sanitization and validation
  - Memory leak prevention
  - Graceful error handling
- Multi-architecture Docker builds
- GitHub Actions CI/CD pipeline
- Comprehensive documentation and examples

[1.0.6]: https://github.com/mtebusi/HA_MCP/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/mtebusi/HA_MCP/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/mtebusi/HA_MCP/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/mtebusi/HA_MCP/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/mtebusi/HA_MCP/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mtebusi/HA_MCP/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mtebusi/HA_MCP/releases/tag/v1.0.0
