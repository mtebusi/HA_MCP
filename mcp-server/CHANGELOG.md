# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.2]: https://github.com/mtebusi/HA_MCP/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mtebusi/HA_MCP/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mtebusi/HA_MCP/releases/tag/v1.0.0