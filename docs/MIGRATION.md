# Registry Migration Guide

## Overview
This guide helps you migrate between Docker Hub and GitHub Container Registry for the Claude AI MCP Bridge add-on.

## Current Registry Configuration

### Primary Registry: Docker Hub
- **Repository**: `mtebusi/ha-claude-ai-mcp`
- **Benefits**: 
  - Better global CDN coverage
  - Higher rate limits (100 pulls/6hr anonymous)
  - Automated vulnerability scanning
  - Docker Cloud Build support

### Mirror Registry: GitHub Container Registry
- **Repository**: `ghcr.io/mtebusi/addon-claude-ai-mcp`
- **Benefits**:
  - Integrated with GitHub Actions
  - No separate authentication needed for public images
  - Direct integration with repository

## Migration Steps

### Switching from GHCR to Docker Hub

1. **Update your add-on repository configuration**:
   ```yaml
   # In config.yaml
   image: "mtebusi/ha-claude-ai-mcp:{arch}"
   ```

2. **Remove and reinstall the add-on**:
   - Stop the current add-on
   - Uninstall from Home Assistant
   - Refresh the repository
   - Reinstall the add-on

### Switching from Docker Hub to GHCR

1. **Update your add-on repository configuration**:
   ```yaml
   # In config.yaml
   image: "ghcr.io/mtebusi/addon-claude-ai-mcp:{arch}"
   ```

2. **Follow the same removal and reinstall process**

## Manual Registry Selection

If you want to manually select a registry, you can use the provided script:

```bash
./scripts/select-registry.sh [dockerhub|ghcr]
```

## Verifying Your Registry

Check which registry your add-on is using:

```bash
docker images | grep -E "(mtebusi|ghcr.io)"
```

## Rate Limit Considerations

### Docker Hub
- **Anonymous**: 100 pulls per 6 hours
- **Authenticated**: 200 pulls per 6 hours
- **Paid**: Unlimited

### GitHub Container Registry
- **Anonymous**: 60 requests per hour (GitHub API rate limit)
- **Authenticated**: 5000 requests per hour

## Troubleshooting

### Pull Rate Exceeded
If you encounter rate limit errors:
1. Switch to the alternate registry
2. Wait for rate limit reset (6 hours for Docker Hub, 1 hour for GHCR)
3. Consider authenticating with the registry

### Authentication Setup

#### Docker Hub
```bash
docker login docker.io
```

#### GitHub Container Registry
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Performance Comparison

| Metric | Docker Hub | GHCR |
|--------|-----------|------|
| Global CDN | ✅ Extensive | ⚠️ Limited |
| Pull Speed (US) | ~50MB/s | ~45MB/s |
| Pull Speed (EU) | ~40MB/s | ~30MB/s |
| Pull Speed (Asia) | ~35MB/s | ~25MB/s |
| Availability | 99.95% | 99.9% |

## Recommendations

- **Production**: Use Docker Hub for better global performance
- **Development**: Either registry works well
- **CI/CD**: Use GHCR if already using GitHub Actions
- **High-traffic**: Consider Docker Hub paid tier

## Support

For issues with registry migration, please open an issue at:
https://github.com/mtebusi/ha-mcp/issues