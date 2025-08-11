# CRITICAL FIX - v1.1.4 - Raspberry Pi / ARM Support

## ⚠️ IMPORTANT: Complete Reinstall Required

If you're experiencing any of these issues:
- "exec /init: exec format error" 
- "[FATAL tini (7)] exec /init failed: Permission denied"
- Add-on fails to start on Raspberry Pi
- OAuth authentication not working
- Nabu Casa connection issues

**You MUST completely uninstall and reinstall the add-on.**

## Fixed Issues

### 1. ARM Architecture Support (Raspberry Pi)
**Problem**: The add-on was completely broken on ARM devices (Raspberry Pi, etc.) due to incorrect Docker image architecture tags.

**Solution**: 
- Fixed GitHub Actions workflow to build proper multi-architecture images
- Corrected image naming from `{arch}-addon-mcp-claude` to `addon-mcp-claude`
- Added proper `build.json` for architecture-specific base images
- Fixed Dockerfile to properly use `BUILD_FROM` argument

### 2. Authentication Flow
**Problem**: Complex OAuth2 flow was broken, especially with Nabu Casa cloud access.

**Solution**:
- Simplified to use HomeAssistant supervisor token
- Removed complex OAuth2 server
- Added proper ingress support
- Works transparently with both local and Nabu Casa URLs

## Installation Instructions

### Step 1: Complete Removal (REQUIRED)
```bash
1. Go to Settings → Add-ons
2. Click on "MCP Server for Claude" (if installed)
3. Click "STOP" if running
4. Click "UNINSTALL"
5. Wait for complete removal
```

### Step 2: Refresh Add-on Store
```bash
1. Go to Settings → Add-ons → Add-on Store
2. Click the ⋮ (three dots) menu
3. Select "Check for updates" 
4. Wait for refresh to complete
```

### Step 3: Reinstall
```bash
1. Search for "MCP Server for Claude"
2. Click "INSTALL"
3. Wait for installation to complete
4. Click "START"
```

### Step 4: Verify Installation
Check the add-on logs for:
```
[MCP SSE Server] Server running on http://0.0.0.0:6789
[MCP SSE Server] Ready for Claude Desktop connections
[MCP SSE Server] Using supervisor token for authentication
```

## Claude Desktop Configuration

### For Local Access:
```json
{
  "mcpServers": {
    "homeassistant": {
      "url": "http://homeassistant.local:6789/sse"
    }
  }
}
```

### For Nabu Casa Access:
1. Get your add-on ingress URL from HomeAssistant
2. Use format: `https://[your-id].ui.nabu.casa/api/hassio_ingress/[slug]/sse`

## Architecture Verification

To verify your architecture is supported:
```bash
# On your HomeAssistant host
uname -m
```

Supported architectures:
- `armv7l` → armv7 (Raspberry Pi 2, 3)
- `aarch64` → aarch64 (Raspberry Pi 4, 64-bit OS)
- `x86_64` → amd64 (Intel/AMD systems)
- `armhf` → armhf (older ARM systems)
- `i686` → i386 (32-bit x86)

## Technical Details

### What Changed:

1. **Docker Image Naming**:
   - Before: `ghcr.io/mtebusi/{arch}-addon-mcp-claude` 
   - After: `ghcr.io/mtebusi/addon-mcp-claude`
   - The HomeAssistant builder automatically handles architecture selection

2. **Build Configuration**:
   - Added `build.json` with proper base images for each architecture
   - Fixed `BUILD_FROM` argument in Dockerfile
   - Corrected GitHub Actions workflow

3. **Authentication**:
   - Removed OAuth2 server (port 7089)
   - Now uses supervisor token for all authentication
   - Simplified to single port (6789)

4. **Ingress Support**:
   - Added proper ingress configuration
   - Works with Nabu Casa without additional auth
   - Simplified connection flow

## Testing Matrix

Verified on:
- ✅ Raspberry Pi 3B+ (armv7)
- ✅ Raspberry Pi 4 (aarch64) 
- ✅ Intel NUC (amd64)
- ✅ VirtualBox VM (amd64)
- ✅ Proxmox LXC (amd64)

## Troubleshooting

### Still Getting Architecture Errors?
1. Completely uninstall the add-on
2. Restart HomeAssistant
3. Clear browser cache
4. Reinstall the add-on

### Connection Issues?
1. Check add-on is running (green dot)
2. Check logs for errors
3. Verify port 6789 is not blocked
4. For Nabu Casa, ensure remote UI is enabled

### Build Verification
To verify the correct image is installed:
```bash
# SSH into HomeAssistant
docker images | grep mcp-claude
```

## Support

If you continue to experience issues after following these steps:
1. Create an issue at https://github.com/mtebusi/HA_MCP/issues
2. Include:
   - Your architecture (`uname -m` output)
   - Add-on logs
   - HomeAssistant version
   - Installation method (HAOS, Container, Core, Supervised)