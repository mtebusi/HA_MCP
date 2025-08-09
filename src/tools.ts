import { EntityState, Area, Device, HistoryState, LogbookEntry } from './types.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'get_entities',
    description: 'List all entities or filter by domain, area, or device. Returns entity IDs, states, and attributes.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Filter by domain (e.g., "light", "switch", "sensor")',
        },
        area_id: {
          type: 'string',
          description: 'Filter by area ID',
        },
        device_id: {
          type: 'string',
          description: 'Filter by device ID',
        },
        state: {
          type: 'string',
          description: 'Filter by state value (e.g., "on", "off", "unavailable")',
        },
      },
    },
  },
  {
    name: 'get_entity_state',
    description: 'Get the current state and all attributes of a specific entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The entity ID (e.g., "light.living_room")',
        },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'call_service',
    description: 'Call any Home Assistant service with optional data and target specification.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Service domain (e.g., "light", "switch", "script")',
        },
        service: {
          type: 'string',
          description: 'Service name (e.g., "turn_on", "toggle", "reload")',
        },
        service_data: {
          type: 'object',
          description: 'Optional data to pass to the service',
        },
        target: {
          type: 'object',
          description: 'Target specification with entity_id, device_id, or area_id',
          properties: {
            entity_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
            },
            device_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
            },
            area_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
              ],
            },
          },
        },
        return_response: {
          type: 'boolean',
          description: 'Whether to return the service response (for services that provide data)',
        },
      },
      required: ['domain', 'service'],
    },
  },
  {
    name: 'get_history',
    description: 'Retrieve historical state data for entities within a time range.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of entity IDs to get history for',
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (defaults to 1 day ago)',
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (defaults to now)',
        },
        minimal_response: {
          type: 'boolean',
          description: 'Return minimal response without attributes',
        },
        significant_changes_only: {
          type: 'boolean',
          description: 'Only return significant state changes',
        },
      },
    },
  },
  {
    name: 'get_areas',
    description: 'List all areas configured in Home Assistant.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_devices',
    description: 'List all devices in Home Assistant with their properties.',
    inputSchema: {
      type: 'object',
      properties: {
        area_id: {
          type: 'string',
          description: 'Filter devices by area ID',
        },
      },
    },
  },
  {
    name: 'subscribe_events',
    description: 'Subscribe to Home Assistant events for real-time updates.',
    inputSchema: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
          description: 'Event type to subscribe to (e.g., "state_changed", "call_service"). Leave empty for all events.',
        },
      },
    },
  },
  {
    name: 'get_services',
    description: 'List all available services with their parameters and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Filter services by domain',
        },
      },
    },
  },
  {
    name: 'get_logbook',
    description: 'Get logbook entries showing what happened in Home Assistant.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'Filter by entity ID',
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format',
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format',
        },
      },
    },
  },
  {
    name: 'fire_event',
    description: 'Fire a custom event in Home Assistant.',
    inputSchema: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
          description: 'The type of event to fire',
        },
        event_data: {
          type: 'object',
          description: 'Optional data to include with the event',
        },
      },
      required: ['event_type'],
    },
  },
  {
    name: 'validate_config',
    description: 'Validate Home Assistant automation configuration (triggers, conditions, actions).',
    inputSchema: {
      type: 'object',
      properties: {
        trigger: {
          type: 'array',
          description: 'Trigger configuration to validate',
        },
        condition: {
          type: 'array',
          description: 'Condition configuration to validate',
        },
        action: {
          type: 'array',
          description: 'Action configuration to validate',
        },
      },
    },
  },
  {
    name: 'get_config',
    description: 'Get Home Assistant configuration including version, location, and unit system.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'restart_homeassistant',
    description: 'Restart Home Assistant core.',
    inputSchema: {
      type: 'object',
      properties: {
        safe_mode: {
          type: 'boolean',
          description: 'Restart in safe mode (disables custom components)',
        },
      },
    },
  },
  {
    name: 'reload_config',
    description: 'Reload specific configuration without restarting.',
    inputSchema: {
      type: 'object',
      properties: {
        config_type: {
          type: 'string',
          enum: ['core', 'automation', 'script', 'scene', 'group', 'all'],
          description: 'Type of configuration to reload',
        },
      },
      required: ['config_type'],
    },
  },
];