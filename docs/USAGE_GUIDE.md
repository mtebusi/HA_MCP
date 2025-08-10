# Usage Guide

## Getting Started with HomeAssistant MCP Server

This guide walks you through using the HomeAssistant MCP Server with Claude Desktop to control your smart home using natural language.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Common Commands](#common-commands)
4. [Advanced Features](#advanced-features)
5. [Automation Examples](#automation-examples)
6. [Troubleshooting](#troubleshooting)

## Installation

### Step 1: Install the Add-on

1. Open HomeAssistant
2. Navigate to **Settings** → **Add-ons**
3. Click **Add-on Store**
4. Search for "MCP Server"
5. Click **Install**
6. Start the add-on

### Step 2: Generate Access Token

1. Go to your HomeAssistant profile
2. Scroll to **Long-Lived Access Tokens**
3. Click **Create Token**
4. Name it "Claude MCP"
5. Copy the token (you won't see it again!)

### Step 3: Configure Claude Desktop

1. Open Claude Desktop
2. Go to Settings → MCP Servers
3. Add the configuration provided by the add-on
4. Paste your access token
5. Restart Claude Desktop

## Basic Usage

### Connecting to Your Home

Once configured, Claude can interact with your HomeAssistant instance. Start with simple queries:

```
"What devices do I have?"
"Show me all lights"
"What's the temperature in the living room?"
```

### Controlling Devices

#### Lights
```
"Turn on the living room lights"
"Dim the bedroom light to 50%"
"Set the kitchen light to warm white"
"Turn off all lights"
```

#### Climate
```
"Set the thermostat to 72 degrees"
"What's the current temperature?"
"Turn on the AC"
"Set heating mode"
```

#### Switches and Outlets
```
"Turn on the coffee maker"
"Is the garage door closed?"
"Turn off the TV"
```

### Getting Information
```
"What's the status of all sensors?"
"Show me motion sensors that detected movement"
"What's the humidity in the bathroom?"
"List all unavailable devices"
```

## Common Commands

### Device Discovery
- `"List all devices"` - Shows all available entities
- `"What lights are on?"` - Shows active lights
- `"Show me all sensors"` - Lists sensor entities
- `"Find all battery-powered devices"` - Searches for battery entities

### State Queries
- `"What's the state of [device name]?"` - Get specific device state
- `"Show me everything that's on"` - List active devices
- `"What changed in the last hour?"` - Recent state changes
- `"Are there any errors?"` - Check for device issues

### Bulk Operations
- `"Turn off everything"` - Power down all controllable devices
- `"Turn on all lights in the living room"` - Group control
- `"Set all thermostats to 70"` - Bulk climate control
- `"Lock all doors"` - Security group action

## Advanced Features

### Scene Management
```
"Activate movie night scene"
"Create a new scene called 'Morning Routine'"
"What scenes are available?"
"Run bedtime scene"
```

### Automation Queries
```
"Show me all automations"
"Is the morning automation enabled?"
"Disable the vacation automation"
"What automations ran today?"
```

### Energy Monitoring
```
"What's my current power usage?"
"Which devices use the most energy?"
"Show me solar production"
"Calculate daily energy cost"
```

### Security Features
```
"Are all doors locked?"
"Show me camera status"
"Did anyone come home today?"
"Arm the security system"
```

## Automation Examples

### Example 1: Morning Routine
```
"Every day at 7 AM:
- Turn on kitchen lights
- Set thermostat to 72
- Start the coffee maker
- Turn on the news"
```

### Example 2: Away Mode
```
"When everyone leaves:
- Turn off all lights
- Set thermostat to eco mode
- Lock all doors
- Enable security cameras"
```

### Example 3: Bedtime
```
"At 10 PM on weekdays:
- Dim bedroom lights to 20%
- Turn off downstairs lights
- Set thermostat to 68
- Lock front door"
```

### Example 4: Weather Response
```
"When it starts raining:
- Close all windows
- Turn on porch light
- Send notification"
```

## Natural Language Examples

The MCP server understands context and natural language:

### Contextual Commands
- "It's too dark in here" → Increases brightness
- "I'm cold" → Adjusts heating
- "Going to bed" → Activates bedtime routine
- "Movie time" → Dims lights, adjusts TV settings

### Complex Queries
- "Turn on lights in rooms with people"
- "Set all lights to match sunset color"
- "Prepare the house for guests"
- "Optimize energy usage"

### Conditional Actions
- "If motion detected, turn on lights"
- "When temperature drops below 65, turn on heat"
- "Alert me if any door opens after 11 PM"

## Tips and Best Practices

### 1. Naming Conventions
- Use clear, descriptive device names
- Group devices by room or function
- Avoid special characters in names

### 2. Entity Organization
- Create areas for each room
- Use labels for device types
- Group related devices

### 3. Performance Optimization
- Limit queries to specific domains when possible
- Use caching for frequently accessed states
- Batch multiple commands together

### 4. Security Considerations
- Regularly rotate access tokens
- Limit entity exposure to necessary items
- Review automation permissions
- Monitor access logs

### 5. Troubleshooting Commands
```
"Test connection to HomeAssistant"
"Show me the last error"
"Refresh all entity states"
"Clear the cache"
"Check service availability"
```

## Working with Data

### Querying Historical Data
```
"Show me temperature trends for today"
"When was the front door last opened?"
"How long were lights on yesterday?"
"Graph energy usage this week"
```

### Exporting Information
```
"Export all sensor data to CSV"
"Create a report of device states"
"List all automations in JSON format"
"Generate energy usage summary"
```

## Integration with Other Services

### Calendar Integration
```
"Turn on porch light during calendar events"
"Set vacation mode based on calendar"
"Adjust thermostat for work schedule"
```

### Weather Integration
```
"Adjust blinds based on sun position"
"Turn on heat if cold weather coming"
"Water garden if no rain forecast"
```

### Presence Detection
```
"Turn on lights when I arrive"
"Set away mode when everyone leaves"
"Send alert if motion when not home"
```

## Troubleshooting

### Connection Issues

**Problem**: Claude can't connect to HomeAssistant
```
"Test HomeAssistant connection"
"Verify MCP server status"
"Check authentication"
```

**Solution**: 
1. Verify add-on is running
2. Check token validity
3. Confirm network connectivity
4. Review firewall settings

### Entity Not Found

**Problem**: Device commands fail
```
"Refresh entity list"
"Search for [device name]"
"Show similar device names"
```

**Solution**:
1. Check exact entity name
2. Verify device is available
3. Confirm entity domain is enabled
4. Refresh entity cache

### Performance Issues

**Problem**: Slow responses
```
"Check server performance"
"Show cache statistics"
"List active connections"
```

**Solution**:
1. Reduce entity domains
2. Increase cache TTL
3. Lower rate limits
4. Optimize automations

### Command Failures

**Problem**: Commands don't execute
```
"Show last error"
"Test service call"
"Validate command syntax"
```

**Solution**:
1. Check service availability
2. Verify entity supports action
3. Review permission settings
4. Check rate limiting

## Getting Help

### Built-in Help
- "Help" - Show available commands
- "How do I [task]?" - Get specific guidance
- "What can you do?" - List capabilities
- "Show examples" - See command examples

### Diagnostic Commands
- "Run diagnostics"
- "Check system health"
- "Show debug information"
- "Generate support bundle"

### Support Resources
- HomeAssistant Forums
- GitHub Issues
- Discord Community
- Official Documentation

## Best Practices Summary

1. **Start Simple**: Begin with basic commands before complex automations
2. **Use Natural Language**: Claude understands context and intent
3. **Be Specific**: Use exact device names when known
4. **Batch Commands**: Group related actions for efficiency
5. **Monitor Logs**: Check logs for issues and optimization opportunities
6. **Regular Maintenance**: Update tokens, review permissions, clean up unused entities
7. **Test Carefully**: Verify automations in safe conditions first
8. **Document Custom Setup**: Keep notes on complex configurations