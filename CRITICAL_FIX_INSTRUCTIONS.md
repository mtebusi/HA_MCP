# CRITICAL: Multi-Architecture Docker Build Fix

## Problem Summary
The HomeAssistant MCP add-on v1.1.4 multi-architecture builds are failing with:
1. "No such image: ghcr.io/mtebusi/addon-mcp-claude:1.1.4" - images aren't being created
2. "Default value for ARG ${BUILD_FROM} results in empty or invalid base image name"
3. Raspberry Pi users getting "exec format error" due to missing ARM builds

## Root Causes Identified
1. **Dockerfile Issue**: ARG BUILD_FROM had no default value, causing build warnings
2. **Builder Failure**: HomeAssistant builder was failing silently due to `continue-on-error: true`
3. **No Images Pushed**: The build process wasn't actually creating or pushing any images to ghcr.io

## Solutions Implemented

### 1. Fixed Dockerfile (Immediate Fix)
- Added default value for BUILD_FROM argument
- Now defaults to amd64 base image if not specified

### 2. Created Multiple Build Workflows

#### A. docker-multiarch.yml (Recommended)
- Uses Docker buildx directly with proper multi-platform support
- Builds all architectures in one workflow
- Includes image signing with cosign
- Proper caching for faster builds
- Verifies images after push

#### B. build-multiarch.yml
- Individual builds per architecture
- More control over each platform
- Creates manifest after all builds complete

#### C. ha-builder-fixed.yml  
- Uses HomeAssistant builder with fixes
- Removed continue-on-error to see real failures
- Includes verification step

### 3. Manual Build Script
- `scripts/build-multiarch.sh` for local/manual builds
- Can be run with: `./scripts/build-multiarch.sh --push --version 1.1.4`

## Quick Fix Steps

### Option 1: Use New Docker Buildx Workflow (Fastest)
```bash
# Trigger the new workflow manually
gh workflow run docker-multiarch.yml -f push_images=true -f version=1.1.4
```

### Option 2: Run Manual Build Script
```bash
# Set your GitHub token
export GITHUB_TOKEN=<your-token>

# Run the build script
./scripts/build-multiarch.sh --push --version 1.1.4 --tag-latest
```

### Option 3: Fix and Re-run Original Builder
The original builder.yaml has been fixed by:
- Removing `continue-on-error: true` to expose real errors
- Dockerfile now has proper BUILD_FROM default

## Verification Commands

After running any build solution, verify with:

```bash
# Check if images exist in registry
for arch in amd64 aarch64 armv7 armhf i386; do
  echo "Checking $arch..."
  docker pull ghcr.io/mtebusi/addon-mcp-claude:$arch-1.1.4
done

# Check multi-arch manifest
docker manifest inspect ghcr.io/mtebusi/addon-mcp-claude:1.1.4

# Or use docker buildx
docker buildx imagetools inspect ghcr.io/mtebusi/addon-mcp-claude:1.1.4
```

## Architecture Mapping

| HA Architecture | Base Image | Docker Platform |
|----------------|------------|-----------------|
| amd64 | ghcr.io/home-assistant/amd64-base:3.21 | linux/amd64 |
| aarch64 | ghcr.io/home-assistant/aarch64-base:3.21 | linux/arm64 |
| armv7 | ghcr.io/home-assistant/armv7-base:3.21 | linux/arm/v7 |
| armhf | ghcr.io/home-assistant/armhf-base:3.21 | linux/arm/v6 |
| i386 | ghcr.io/home-assistant/i386-base:3.21 | linux/386 |

## Testing on Raspberry Pi

Once images are pushed:

```bash
# On Raspberry Pi, pull the correct architecture
docker pull ghcr.io/mtebusi/addon-mcp-claude:1.1.4

# Test run
docker run --rm ghcr.io/mtebusi/addon-mcp-claude:1.1.4 node --version
```

## Monitoring Build Status

```bash
# Watch workflow runs
gh run list --workflow=docker-multiarch.yml

# View specific run logs
gh run view <run-id> --log

# Check package versions in registry
gh api user/packages/container/addon-mcp-claude/versions
```

## Troubleshooting

### If builds still fail:
1. Check Docker Hub rate limits
2. Ensure GITHUB_TOKEN has package write permissions
3. Verify base images are accessible
4. Check for registry storage quota

### If "exec format error" persists:
1. Verify correct architecture image was pulled
2. Check docker info for platform
3. Ensure QEMU is properly set up in workflow

## Next Steps

1. **Immediate**: Run `gh workflow run docker-multiarch.yml` to build and push all architectures
2. **Verify**: Check that all 5 architecture images are in ghcr.io
3. **Test**: Have a Raspberry Pi user test the ARM builds
4. **Monitor**: Watch for any build failures in future releases
5. **Consider**: Switching to the new docker-multiarch.yml as primary build workflow

## Success Criteria

✅ All 5 architectures build successfully
✅ Images are pushed to ghcr.io/mtebusi/addon-mcp-claude
✅ Multi-arch manifest is created
✅ Raspberry Pi users can install without "exec format error"
✅ Version 1.1.4 is available for all platforms