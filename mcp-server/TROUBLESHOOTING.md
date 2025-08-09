# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Add-on Won't Install
**Symptoms**: Installation fails or hangs

**Solutions**:
1. Check Home Assistant version (requires 2024.10.0+)
2. Verify sufficient disk space (need ~100MB)
3. Check Supervisor logs for errors:
   ```
   Settings → System → Logs → Supervisor
   ```
4. Try manual repository refresh:
   ```
   Settings → Add-ons → ⋮ → Reload
   ```

#### Add-on Won't Start
**Symptoms**: Add-on shows as stopped after starting

**Solutions**:
1. Check add-on logs for specific errors
2. Verify port 6789 is not in use:
   ```bash
   netstat -an | grep 6789
   ```
3. Check configuration is valid (no typos in YAML)
4. Ensure Supervisor API access is enabled

### Connection Issues

#### Claude Can't Connect to MCP Server
**Symptoms**: "MCP server not found" or connection timeout

**Solutions**:
1. Verify add-on is running (green badge)
2. Check Docker container name:
   ```bash
   docker ps | grep mcp_claude
   ```
3. Confirm correct container name in config:
   ```json
   "args": ["exec", "-i", "addon_local_mcp_claude", ...]
   ```
4. Test connection manually:
   ```bash
   docker exec addon_local_mcp_claude echo "Connected"
   ```

#### Authentication Failures
**Symptoms**: "Invalid token" or "Authentication required"

**Solutions**:
1. Verify token matches exactly (no extra spaces)
2. Check token hasn't expired (regenerate if needed)
3. Ensure authentication is configured consistently:
   - Add-on config: `authentication_required: true`
   - Claude config: Token in environment variable
4. Try disabling authentication temporarily for testing

#### WebSocket Connection Errors
**Symptoms**: "WebSocket connection failed" in logs

**Solutions**:
1. Verify Supervisor token is valid:
   ```bash
   echo $SUPERVISOR_TOKEN
   ```
2. Check Home Assistant API is enabled:
   ```
   Configuration → System → Network → Advanced
   ```
3. Test WebSocket manually:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        http://supervisor/core/api/websocket
   ```

### Operational Issues

#### Commands Time Out
**Symptoms**: Commands don't complete or return timeout errors

**Solutions**:
1. Check Home Assistant responsiveness
2. Increase connection timeout in add-on config:
   ```yaml
   connection_timeout: 60
   ```
3. Review system resources (CPU, memory)
4. Check for blocking automations or scripts

#### Entity Not Found
**Symptoms**: "Entity xyz.abc not found" errors

**Solutions**:
1. Verify entity exists in Home Assistant:
   ```
   Developer Tools → States → Filter entities
   ```
2. Check entity filtering configuration:
   - Is domain allowed?
   - Is specific entity blocked?
3. Entity might be unavailable (device offline)
4. Entity ID might have changed (common after updates)

#### Service Call Failures
**Symptoms**: "Service xyz not found" or service errors

**Solutions**:
1. Verify service exists:
   ```
   Developer Tools → Services → Search
   ```
2. Check service parameters are correct
3. Ensure integration is loaded and working
4. Some services require specific entity states

### Performance Issues

#### Slow Response Times
**Symptoms**: Commands take long to execute

**Solutions**:
1. Check add-on resource usage:
   ```
   Settings → Add-ons → MCP Server → Logs
   ```
2. Review cache settings and clear if needed
3. Reduce number of monitored entities
4. Check network latency to Home Assistant

#### High Memory Usage
**Symptoms**: Add-on using excessive memory

**Solutions**:
1. Enable entity filtering to reduce cache size
2. Restart add-on to clear memory
3. Check for memory leaks in logs
4. Reduce max_clients setting

#### Rate Limiting Triggered
**Symptoms**: "Rate limit exceeded" errors

**Solutions**:
1. Default limit is 100 requests/minute
2. Space out rapid commands
3. Use batch operations when possible
4. Check for automation loops causing excessive calls

### Claude Desktop Issues

#### MCP Menu Not Showing
**Symptoms**: No MCP option in Claude Desktop

**Solutions**:
1. Verify config file location is correct
2. Check JSON syntax is valid:
   ```bash
   python -m json.tool < claude_desktop_config.json
   ```
3. Restart Claude Desktop completely
4. Check Claude Desktop version supports MCP

#### Tools Not Available
**Symptoms**: Claude says tools are not available

**Solutions**:
1. Check MCP server is in config
2. Verify server started successfully
3. Look for initialization errors in logs
4. Try reconnecting MCP server

### Debugging Steps

#### Enable Debug Logging
1. Set log level in add-on config:
   ```yaml
   log_level: debug
   ```
2. Restart add-on
3. Review detailed logs for issues

#### Check Container Logs
```bash
docker logs addon_local_mcp_claude --tail 100 -f
```

#### Test Basic Connectivity
```bash
# Test supervisor access
curl -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
     http://supervisor/core/api/

# Test WebSocket
wscat -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
      -c ws://supervisor/core/api/websocket
```

#### Validate Configuration
```bash
# Check add-on config
ha addons config local_mcp_claude

# Validate JSON syntax
jsonlint claude_desktop_config.json
```

### Getting Help

If issues persist:

1. **Collect Information**:
   - Add-on version
   - Home Assistant version
   - Error messages from logs
   - Configuration (sanitized)

2. **Check Resources**:
   - [GitHub Issues](https://github.com/mtebusi/HA_MCP/issues)
   - [Home Assistant Community](https://community.home-assistant.io/)
   - [Discord Server](https://discord.gg/home-assistant)

3. **Create Issue**:
   - Use issue templates
   - Include all collected information
   - Describe steps to reproduce
   - Mention attempted solutions

### Quick Fixes

#### Reset Everything
```bash
# 1. Stop add-on
# 2. Clear config
# 3. Reinstall add-on
# 4. Reconfigure from scratch
```

#### Emergency Disable
If automation goes wrong:
1. Stop add-on immediately
2. Disable problematic automations
3. Review logs before restarting

#### Rollback Version
If update causes issues:
1. Note current version
2. Uninstall add-on
3. Install previous version from releases
4. Restore previous configuration