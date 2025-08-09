# API Documentation

## MCP Tools Reference

The Home Assistant MCP Server provides 4 main tools with 40+ operations for comprehensive smart home control.

## Query Tool

Retrieve information from Home Assistant.

### Operations

#### `entities`
List and filter entities in Home Assistant.

**Parameters:**
- `domain` (string, optional): Filter by domain (e.g., "light", "switch")
- `area` (string, optional): Filter by area name
- `device` (string, optional): Filter by device name
- `state` (string, optional): Filter by current state

**Response:**
```json
{
  "entities": [
    {
      "entity_id": "light.bedroom",
      "state": "on",
      "attributes": {...},
      "last_changed": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### `state`
Get current state of specific entities.

**Parameters:**
- `entity_id` (string, required): Entity ID or comma-separated list

**Response:**
```json
{
  "entity_id": "light.bedroom",
  "state": "on",
  "attributes": {
    "brightness": 255,
    "color_temp": 370
  },
  "last_changed": "2024-01-01T12:00:00Z",
  "last_updated": "2024-01-01T12:00:00Z"
}
```

#### `history`
Query historical data for entities.

**Parameters:**
- `entity_id` (string, required): Entity to query
- `start_time` (string, optional): ISO 8601 start time
- `end_time` (string, optional): ISO 8601 end time
- `minimal_response` (boolean, optional): Return minimal data

**Response:**
```json
{
  "history": [
    {
      "entity_id": "sensor.temperature",
      "states": [
        {"state": "21.5", "last_changed": "..."},
        {"state": "22.0", "last_changed": "..."}
      ]
    }
  ]
}
```

#### `areas`
List all areas in Home Assistant.

**Response:**
```json
{
  "areas": [
    {
      "area_id": "bedroom",
      "name": "Bedroom",
      "picture": null,
      "aliases": []
    }
  ]
}
```

#### `devices`
List all devices.

**Parameters:**
- `area` (string, optional): Filter by area
- `integration` (string, optional): Filter by integration

**Response:**
```json
{
  "devices": [
    {
      "id": "device_123",
      "name": "Smart Bulb",
      "manufacturer": "Philips",
      "model": "Hue White",
      "area_id": "bedroom"
    }
  ]
}
```

#### `services`
List available services.

**Parameters:**
- `domain` (string, optional): Filter by domain

**Response:**
```json
{
  "services": {
    "light": {
      "turn_on": {
        "description": "Turn on lights",
        "fields": {...}
      }
    }
  }
}
```

#### `config`
Get system configuration.

**Response:**
```json
{
  "latitude": 52.5200,
  "longitude": 13.4050,
  "elevation": 34,
  "unit_system": "metric",
  "time_zone": "Europe/Berlin",
  "components": [...],
  "version": "2024.10.0"
}
```

#### `templates`
Evaluate template sensors.

**Parameters:**
- `template` (string, required): Jinja2 template to evaluate

**Response:**
```json
{
  "result": "21.5",
  "entities": ["sensor.temperature"]
}
```

#### `integrations`
List loaded integrations.

**Response:**
```json
{
  "integrations": [
    "hue",
    "mqtt",
    "zwave_js"
  ]
}
```

#### `addons`
List installed add-ons.

**Response:**
```json
{
  "addons": [
    {
      "name": "File editor",
      "slug": "core_configurator",
      "state": "started",
      "version": "5.6.0"
    }
  ]
}
```

#### `logs`
Retrieve system logs.

**Parameters:**
- `lines` (number, optional): Number of lines to return (default: 100)

**Response:**
```json
{
  "logs": [
    "2024-01-01 12:00:00 INFO Starting Home Assistant",
    "2024-01-01 12:00:01 INFO Loaded integration: hue"
  ]
}
```

## Control Tool

Execute actions in Home Assistant.

### Operations

#### `call_service`
Call any Home Assistant service.

**Parameters:**
- `domain` (string, required): Service domain
- `service` (string, required): Service name
- `target` (object, optional): Target entities/areas/devices
- `data` (object, optional): Service data

**Example:**
```json
{
  "domain": "light",
  "service": "turn_on",
  "target": {
    "entity_id": "light.bedroom"
  },
  "data": {
    "brightness": 128,
    "color_temp": 370
  }
}
```

#### `toggle`
Toggle entity states.

**Parameters:**
- `entity_id` (string, required): Entity to toggle

#### `set_value`
Set entity values directly.

**Parameters:**
- `entity_id` (string, required): Entity ID
- `value` (any, required): Value to set
- `attribute` (string, optional): Specific attribute to set

#### `scene_activate`
Activate a scene.

**Parameters:**
- `scene_id` (string, required): Scene entity ID

#### `script_run`
Execute a script.

**Parameters:**
- `script_id` (string, required): Script entity ID
- `data` (object, optional): Variables to pass

#### `reload_integration`
Reload an integration.

**Parameters:**
- `integration` (string, required): Integration to reload

#### `create_automation`
Create a new automation.

**Parameters:**
- `alias` (string, required): Automation name
- `description` (string, optional): Description
- `triggers` (array, required): Trigger configurations
- `conditions` (array, optional): Condition configurations
- `actions` (array, required): Action configurations

**Example:**
```json
{
  "alias": "Motion Light",
  "triggers": [
    {
      "platform": "state",
      "entity_id": "binary_sensor.motion",
      "to": "on"
    }
  ],
  "actions": [
    {
      "service": "light.turn_on",
      "entity_id": "light.hallway"
    }
  ]
}
```

#### `backup_create`
Create a system backup.

**Parameters:**
- `name` (string, optional): Backup name

#### `recorder_purge`
Purge old recorder data.

**Parameters:**
- `keep_days` (number, optional): Days to keep
- `repack` (boolean, optional): Repack database

## Monitor Tool

Real-time monitoring and event handling.

### Operations

#### `subscribe`
Subscribe to event stream.

**Parameters:**
- `event_type` (string, required): Event type to subscribe to
- `entity_id` (string, optional): Filter by entity

**Event Types:**
- `state_changed`: Entity state changes
- `call_service`: Service calls
- `automation_triggered`: Automation triggers
- `script_started`: Script executions
- Custom event types

#### `unsubscribe`
Unsubscribe from events.

**Parameters:**
- `subscription_id` (string, required): Subscription to cancel

#### `get_events`
Get buffered events.

**Parameters:**
- `subscription_id` (string, optional): Specific subscription
- `limit` (number, optional): Maximum events to return

#### `fire_event`
Fire a custom event.

**Parameters:**
- `event_type` (string, required): Event type
- `event_data` (object, optional): Event data

#### `diagnostics`
Get system diagnostics.

**Response:**
```json
{
  "healthy": true,
  "uptime": "7 days",
  "database_size": "450 MB",
  "errors": [],
  "warnings": []
}
```

#### `trace_automation`
Debug automation execution.

**Parameters:**
- `automation_id` (string, required): Automation entity ID
- `run_id` (string, optional): Specific run to trace

#### `websocket_commands`
Execute raw WebSocket commands.

**Parameters:**
- `type` (string, required): Command type
- `id` (number, optional): Message ID
- Additional parameters based on command

## Assist Tool

AI-enhanced operations and analysis.

### Operations

#### `suggest_automation`
Get automation suggestions based on patterns.

**Parameters:**
- `description` (string, required): What you want to automate
- `entities` (array, optional): Relevant entities

**Response:**
```json
{
  "suggestions": [
    {
      "name": "Suggested Automation",
      "yaml": "...",
      "explanation": "This automation will..."
    }
  ]
}
```

#### `analyze_patterns`
Analyze usage patterns.

**Parameters:**
- `entity_id` (string, optional): Specific entity to analyze
- `days` (number, optional): Days to analyze (default: 7)

**Response:**
```json
{
  "patterns": [
    {
      "type": "daily_schedule",
      "entity": "light.bedroom",
      "times": ["07:00", "22:00"],
      "confidence": 0.85
    }
  ]
}
```

#### `optimize_energy`
Get energy optimization suggestions.

**Response:**
```json
{
  "suggestions": [
    {
      "type": "schedule_adjustment",
      "entity": "climate.thermostat",
      "savings": "15%",
      "description": "Lower temperature at night"
    }
  ]
}
```

#### `security_check`
Perform security audit.

**Response:**
```json
{
  "issues": [
    {
      "severity": "warning",
      "type": "unlocked_door",
      "entity": "lock.front_door",
      "message": "Door has been unlocked for 2 hours"
    }
  ],
  "score": 85
}
```

#### `troubleshoot`
Diagnose system issues.

**Parameters:**
- `issue` (string, optional): Specific issue description

**Response:**
```json
{
  "findings": [
    {
      "type": "unavailable_device",
      "entity": "light.kitchen",
      "possible_causes": ["Device offline", "Integration error"],
      "solutions": ["Check power", "Restart integration"]
    }
  ]
}
```

#### `explain_state`
Explain why entity is in current state.

**Parameters:**
- `entity_id` (string, required): Entity to explain

**Response:**
```json
{
  "explanation": "Light is on because motion was detected 5 minutes ago",
  "triggers": ["binary_sensor.motion"],
  "automation": "automation.motion_lights"
}
```

#### `validate_config`
Validate YAML configuration.

**Parameters:**
- `config` (string, required): YAML configuration to validate

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

#### `performance_analysis`
Analyze system performance.

**Response:**
```json
{
  "metrics": {
    "response_time": "45ms",
    "database_queries": "120/min",
    "automations": {
      "total": 25,
      "average_execution": "230ms"
    }
  },
  "bottlenecks": []
}
```

#### `generate_lovelace`
Generate dashboard configuration.

**Parameters:**
- `entities` (array, required): Entities to include
- `style` (string, optional): Dashboard style preference

**Response:**
```json
{
  "dashboard": {
    "title": "Generated Dashboard",
    "views": [...],
    "yaml": "..."
  }
}
```

#### `migration_check`
Check for migration requirements.

**Response:**
```json
{
  "migrations": [
    {
      "type": "breaking_change",
      "component": "mqtt",
      "action_required": "Update configuration format"
    }
  ]
}
```

#### `blueprint_import`
Import automation blueprints.

**Parameters:**
- `url` (string, required): Blueprint URL
- `inputs` (object, optional): Blueprint inputs

**Response:**
```json
{
  "success": true,
  "automation_id": "automation.imported_blueprint",
  "message": "Blueprint imported successfully"
}
```

## Error Handling

All tools return errors in consistent format:

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity light.unknown does not exist",
    "details": {
      "entity_id": "light.unknown",
      "available_entities": ["light.bedroom", "light.kitchen"]
    }
  }
}
```

### Error Codes

- `ENTITY_NOT_FOUND`: Entity doesn't exist
- `SERVICE_NOT_FOUND`: Service not available
- `INVALID_PARAMETERS`: Parameter validation failed
- `PERMISSION_DENIED`: Access denied to resource
- `RATE_LIMITED`: Too many requests
- `CONNECTION_ERROR`: WebSocket connection failed
- `TIMEOUT`: Operation timed out
- `INTERNAL_ERROR`: Server error

## Rate Limits

- **Default**: 100 requests per minute per tool
- **Burst**: Up to 10 rapid requests allowed
- **Reset**: Limits reset every 60 seconds

## WebSocket Protocol

The MCP server uses WebSocket for real-time communication:

1. **Authentication**: Bearer token in connection header
2. **Message Format**: JSON with type and ID
3. **Subscriptions**: Event-based with automatic reconnection
4. **Keep-Alive**: Ping/pong every 30 seconds

## Best Practices

1. **Batch Operations**: Use array parameters when possible
2. **Caching**: Results cached for 5 seconds by default
3. **Error Recovery**: Implement exponential backoff on errors
4. **Filtering**: Use entity filtering to reduce data transfer
5. **Monitoring**: Subscribe only to needed events

## Examples

### Turn on lights in area
```javascript
await control({
  operation: "call_service",
  domain: "light",
  service: "turn_on",
  target: { area_id: "living_room" }
});
```

### Monitor motion sensors
```javascript
const sub = await monitor({
  operation: "subscribe",
  event_type: "state_changed",
  entity_id: "binary_sensor.motion_*"
});
```

### Analyze energy usage
```javascript
const analysis = await assist({
  operation: "optimize_energy"
});
console.log(analysis.suggestions);
```