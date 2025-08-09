# Usage Guide

This guide provides detailed instructions and examples for using the MCP Server for Claude with Home Assistant.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Commands](#basic-commands)
- [Advanced Usage](#advanced-usage)
- [Tool Operations](#tool-operations)
- [Common Scenarios](#common-scenarios)
- [Best Practices](#best-practices)
- [Tips and Tricks](#tips-and-tricks)

## Getting Started

Once you have the add-on installed and Claude Desktop configured, you can start using natural language commands to control your smart home.

### First Steps

1. **Test the connection**: Ask Claude "Can you see my Home Assistant devices?"
2. **List your areas**: "What areas are configured in my home?"
3. **Check device states**: "Are all my lights off?"
4. **View recent events**: "What happened in the last hour?"

## Basic Commands

### Device Control

#### Lights
```
"Turn on the living room lights"
"Dim the bedroom light to 50%"
"Set the kitchen lights to warm white"
"Turn off all lights except the hallway"
"Flash the porch light three times"
```

#### Climate
```
"Set the thermostat to 72 degrees"
"Turn on the air conditioning"
"What's the current temperature?"
"Set heating to eco mode"
"Schedule the heat to turn on at 6 AM"
```

#### Security
```
"Lock all doors"
"Is the garage door closed?"
"Arm the security system"
"Show me all unlocked doors"
"Did anyone open the front door today?"
```

#### Media
```
"Play music in the living room"
"Pause all media players"
"Set the TV volume to 30"
"What's playing on the bedroom speaker?"
"Turn off all media devices"
```

### Information Queries

#### Device States
```
"Show me all devices that are on"
"Which lights are currently dimmed?"
"List all unavailable devices"
"What's the battery level of my sensors?"
"Show me devices that haven't been used today"
```

#### Energy Monitoring
```
"How much energy am I using right now?"
"What used the most power yesterday?"
"Show my solar production for today"
"Compare this month's usage to last month"
"Which devices are energy vampires?"
```

#### System Status
```
"Is Home Assistant healthy?"
"Show me any system errors"
"When was the last backup?"
"What integrations are loaded?"
"Check for any failed automations"
```

## Advanced Usage

### Creating Automations

#### Simple Automations
```
"Create an automation that turns on the porch light at sunset"
"Make the bathroom fan turn on with the light"
"Alert me when the washer is done"
"Turn off everything when I leave home"
```

#### Complex Automations
```
"Create a morning routine that:
 - Gradually increases bedroom lights over 15 minutes
 - Starts the coffee maker
 - Turns on the bathroom heater
 - Plays the news on the kitchen speaker"

"Set up security lighting that:
 - Turns on outdoor lights when motion is detected
 - Sends me a notification with a camera snapshot
 - Turns lights off after 5 minutes of no motion"
```

### Pattern Analysis

```
"Analyze my heating patterns for the last week"
"When do I typically turn on lights in the evening?"
"Find energy waste patterns in my home"
"Show me unusual activity from yesterday"
"Predict my energy usage for tomorrow"
```

### Troubleshooting

```
"Why didn't my morning automation run?"
"Debug the motion sensor in the hallway"
"Show me what triggered the alarm last night"
"Trace the last run of my goodnight scene"
"Why is the bedroom light unavailable?"
```

## Tool Operations

### Query Tool Examples

#### Getting Entity Information
```
"List all light entities"
"Show me devices in the bedroom"
"What services are available for covers?"
"Get the state history for the front door sensor"
"Show me all automation entities"
```

#### Filtering and Searching
```
"Find all battery-powered devices"
"Show me entities that changed in the last hour"
"List all devices from the Philips Hue integration"
"Find all sensors with 'temperature' in the name"
"Show me all unavailable devices"
```

### Control Tool Examples

#### Service Calls
```
"Call the light.turn_on service for all bedroom lights with brightness 128"
"Execute the scene.romantic_dinner scene"
"Run the script.goodnight_routine script"
"Reload the Philips Hue integration"
"Create a backup named 'before_update'"
```

#### Direct Control
```
"Toggle the living room fan"
"Set the thermostat temperature to 68"
"Activate the movie_night scene"
"Stop all running scripts"
"Purge recorder data older than 7 days"
```

### Monitor Tool Examples

#### Event Subscriptions
```
"Subscribe to all state changes for motion sensors"
"Monitor when doors open or close"
"Watch for automation triggers"
"Track when lights turn on or off"
"Alert me to any errors"
```

#### Real-time Monitoring
```
"Show me events as they happen"
"Monitor the garage door for the next hour"
"Watch for any security-related events"
"Track temperature changes in real-time"
"Debug all service calls"
```

### Assist Tool Examples

#### Automation Suggestions
```
"Suggest automations based on my daily patterns"
"What automations would save me energy?"
"Recommend security improvements"
"Suggest lighting scenes for different times of day"
"How can I automate my morning routine?"
```

#### Optimization
```
"Optimize my heating schedule"
"Find ways to reduce standby power consumption"
"Suggest more efficient lighting settings"
"Analyze and improve my automation performance"
"Recommend device placement improvements"
```

## Common Scenarios

### Morning Routine
```
"Every weekday at 6:30 AM:
 - Slowly brighten bedroom lights
 - Turn on bathroom heater
 - Start coffee maker
 - Play weather report on bedroom speaker
 - Ensure garage door is closed"
```

### Leaving Home
```
"When everyone leaves:
 - Turn off all lights and media
 - Set thermostat to away mode
 - Lock all doors
 - Arm security system
 - Send confirmation notification"
```

### Movie Night
```
"Set up movie mode:
 - Dim living room lights to 20%
 - Turn on TV and sound system
 - Close blinds
 - Set thermostat to comfortable temperature
 - Pause any playing music"
```

### Bedtime
```
"At 10 PM:
 - Turn off all lights except bedroom
 - Lock all doors
 - Arm security system (home mode)
 - Set thermostat to night temperature
 - Turn on white noise machine"
```

### Vacation Mode
```
"While I'm away:
 - Randomly turn lights on/off to simulate presence
 - Keep thermostat at energy-saving temperature
 - Send daily status reports
 - Alert on any security events
 - Water plants every 3 days"
```

## Best Practices

### 1. Natural Language

Speak naturally to Claude. You don't need to use specific commands or syntax:
- ✅ "Turn off the bedroom light"
- ❌ "entity_id: light.bedroom state: off"

### 2. Context Awareness

Claude remembers context within a conversation:
```
You: "Show me all lights"
Claude: [Lists lights]
You: "Turn off the ones in the bedroom"  # Claude knows you mean lights
```

### 3. Batch Operations

Combine multiple actions in one request:
```
"Turn off all lights, lock the doors, and set the alarm"
```

### 4. Specific vs. General

Be as specific or general as needed:
- Specific: "Set the living room thermostat to 72°F"
- General: "Make it warmer"

### 5. Safety First

Claude will confirm before potentially disruptive actions:
```
You: "Turn off all devices"
Claude: "This will turn off all devices including critical ones. Shall I proceed?"
```

## Tips and Tricks

### 1. Use Descriptive Names

Name your devices and areas clearly:
- Good: "Living Room Ceiling Light"
- Bad: "Light 1"

### 2. Group Devices

Create groups for easier control:
```
"Turn off all bedroom devices"
"Dim all living room lights"
```

### 3. Create Shortcuts

Set up common scenarios:
```
"Activate morning routine"
"Set the house to sleep mode"
```

### 4. Monitor Patterns

Ask Claude to analyze your usage:
```
"What are my most common actions?"
"When do I usually arrive home?"
```

### 5. Preventive Maintenance

Regular check-ups:
```
"Check for any offline devices"
"Show me devices with low battery"
"Find any failed automations from this week"
```

### 6. Energy Awareness

Monitor and optimize:
```
"What's using the most energy right now?"
"Suggest ways to reduce my power bill"
"Show me standby power consumption"
```

### 7. Security Monitoring

Stay secure:
```
"Alert me if any door opens while I'm away"
"Check all entry points before bed"
"Review security events from today"
```

### 8. Learn from Examples

Ask Claude for examples:
```
"Show me example automations for motion lighting"
"How do other people automate their morning routine?"
```

### 9. Experiment Safely

Test automations:
```
"Create a test automation that just sends a notification"
"Simulate what would happen if motion is detected"
```

### 10. Documentation

Ask Claude to explain:
```
"Explain how this automation works"
"What does this error mean?"
"How can I improve this scene?"
```

## Advanced Tips

### Custom Dashboards
```
"Generate a dashboard for energy monitoring"
"Create a security overview dashboard"
"Build a dashboard for guest access"
```

### Integration with Other Services
```
"When I say goodnight to Alexa, run my bedtime routine"
"If IFTTT triggers webhook, turn on the lights"
"Send telegram message when washer is done"
```

### Conditional Logic
```
"Only turn on lights if it's dark outside"
"Alert me if door opens and nobody is home"
"Turn on heat if temperature drops below 65°F"
```

### Time-based Controls
```
"Turn on lights 30 minutes before sunset"
"Run vacuum every Monday at 10 AM"
"Water plants every 3 days at 8 AM"
```

### Presence Detection
```
"When my phone connects to WiFi, disarm security"
"Turn on lights when I arrive home after dark"
"Send notification if unknown device detected"
```

## Troubleshooting Common Issues

### Devices Not Responding
```
"Check if {device} is online"
"Restart the {integration} integration"
"Show me the last known state of {device}"
```

### Automation Problems
```
"Why didn't {automation} trigger?"
"Show me the trace for {automation}"
"Test {automation} conditions"
```

### Performance Issues
```
"What's causing high CPU usage?"
"Show me slow automations"
"Analyze database performance"
```

### Integration Errors
```
"Check {integration} configuration"
"Show errors for {integration}"
"Reload {integration}"
```

## Next Steps

- Explore the [API Documentation](mcp-server/API.md) for detailed tool operations
- Read the [Architecture Guide](ARCHITECTURE.md) to understand how it works
- Check the [Configuration Guide](CONFIGURATION.md) for advanced settings
- Join the [Community](https://community.home-assistant.io/) to share ideas

Remember: Claude is here to help! If you're unsure about something, just ask. Claude can explain, suggest, and guide you through any smart home task.