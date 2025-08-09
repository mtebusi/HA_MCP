import { Tool } from '@modelcontextprotocol/sdk/types';

/**
 * Home Assistant MCP Tools
 * 
 * Streamlined toolset for Home Assistant automation enthusiasts.
 * Four core tools, dozens of operations, infinite possibilities.
 * 
 * Built by HA nerds, for HA nerds.
 */

// Input validation helpers
const ENTITY_ID_REGEX = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

function validateEntityId(entityId: string): boolean {
  return ENTITY_ID_REGEX.test(entityId);
}

function sanitizeHtml(input: string): string {
  // Remove script tags and other potentially dangerous HTML
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return sanitizeHtml(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
}

// Error handling wrapper with retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on validation errors
      if (error.message?.includes('required') || 
          error.message?.includes('Invalid') ||
          error.message?.includes('Access denied')) {
        throw error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

export const MCP_TOOLS: Tool[] = [
  {
    name: 'query',
    description: 'Pull data from your Home Assistant instance - entities, states, config, you name it',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'entities', 'state', 'history', 'areas', 'devices', 'services', 'config',
            'templates', 'integrations', 'addons', 'logs'
          ],
          description: 'What to query'
        },
        entity_id: {
          type: 'string',
          description: 'Entity ID (e.g., light.kitchen, sensor.temperature_office)',
          pattern: '^[a-z0-9_]+(\\.[a-z0-9_]+)+$'
        },
        domain: {
          type: 'string',
          description: 'Filter by domain (light, switch, sensor, etc.)'
        },
        area_id: {
          type: 'string',
          description: 'Filter by area'
        },
        device_id: {
          type: 'string',
          description: 'Filter by device'
        },
        state_filter: {
          type: 'string',
          description: 'Filter by state value'
        },
        start_time: {
          type: 'string',
          format: 'date-time',
          description: 'History start time (ISO 8601)'
        },
        end_time: {
          type: 'string',
          format: 'date-time',
          description: 'History end time (ISO 8601)'
        },
        include_attributes: {
          type: 'boolean',
          description: 'Include entity attributes',
          default: true
        }
      },
      required: ['operation'],
      additionalProperties: false
    }
  },
  {
    name: 'control',
    description: 'Make things happen - toggle switches, run scripts, create automations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'call_service', 'toggle', 'set_value', 'scene_activate', 'script_run',
            'reload_integration', 'create_automation', 'backup_create', 'recorder_purge'
          ],
          description: 'Action to perform'
        },
        domain: {
          type: 'string',
          description: 'Service domain'
        },
        service: {
          type: 'string',
          description: 'Service name'
        },
        target: {
          type: 'object',
          properties: {
            entity_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target entities'
            },
            device_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target devices'
            },
            area_id: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Target areas'
            }
          },
          additionalProperties: false
        },
        data: {
          type: 'object',
          description: 'Service data',
          additionalProperties: true
        },
        value: {
          description: 'Value for set_value operation'
        },
        scene_id: {
          type: 'string',
          description: 'Scene to activate'
        },
        script_id: {
          type: 'string',
          description: 'Script to run'
        },
        integration: {
          type: 'string',
          description: 'Integration to reload'
        },
        alias: {
          type: 'string',
          description: 'Automation name'
        },
        trigger: {
          description: 'Automation trigger config'
        },
        action: {
          description: 'Automation action config'
        },
        condition: {
          description: 'Automation condition config'
        },
        keep_days: {
          type: 'integer',
          minimum: 0,
          description: 'Days to keep in recorder'
        }
      },
      required: ['operation'],
      additionalProperties: false
    }
  },
  {
    name: 'monitor',
    description: 'Track events, debug automations, peek under the hood',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'subscribe', 'unsubscribe', 'get_events', 'fire_event',
            'diagnostics', 'trace_automation', 'websocket_commands'
          ],
          description: 'Monitoring operation'
        },
        event_type: {
          type: 'string',
          description: 'Event type to monitor',
          enum: [
            'state_changed', 'service_registered', 'homeassistant_start',
            'homeassistant_stop', 'component_loaded', 'automation_triggered',
            'script_started', 'custom'
          ]
        },
        custom_event_type: {
          type: 'string',
          description: 'Custom event type'
        },
        entity_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter state changes by entity'
        },
        event_data: {
          type: 'object',
          description: 'Event data payload',
          additionalProperties: true
        },
        subscription_id: {
          type: 'string',
          description: 'Subscription to cancel'
        },
        automation_id: {
          type: 'string',
          description: 'Automation to trace'
        },
        command: {
          type: 'object',
          description: 'Raw WebSocket command',
          additionalProperties: true
        }
      },
      required: ['operation'],
      additionalProperties: false
    }
  },
  {
    name: 'assist',
    description: 'Smart helpers for automation wizards and performance tuners',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'suggest_automation', 'analyze_patterns', 'optimize_energy',
            'security_check', 'troubleshoot', 'explain_state',
            'validate_config', 'performance_analysis', 'generate_lovelace',
            'migration_check', 'blueprint_import'
          ],
          description: 'Assistant operation'
        },
        context: {
          type: 'string',
          description: 'Natural language context'
        },
        entities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Entities to analyze'
        },
        time_range: {
          type: 'string',
          enum: ['hour', 'day', 'week', 'month'],
          description: 'Analysis time range',
          default: 'day'
        },
        automation_type: {
          type: 'string',
          enum: ['time_based', 'state_based', 'presence', 'environmental'],
          description: 'Automation category'
        },
        issue_description: {
          type: 'string',
          description: 'Problem description'
        },
        blueprint_url: {
          type: 'string',
          format: 'uri',
          description: 'Blueprint URL to import'
        },
        title: {
          type: 'string',
          description: 'Dashboard title'
        },
        use_friendly_names: {
          type: 'boolean',
          description: 'Use friendly names in output',
          default: true
        }
      },
      required: ['operation'],
      additionalProperties: false
    }
  }
];

/**
 * Tool operation handlers - where the magic happens
 */
export const TOOL_HANDLERS: Record<string, Record<string, Function>> = {
  query: {
    entities: async (ws: any, args: any) => {
      const states = await ws.getStates();
      let filtered = states;
      
      if (args.domain) {
        filtered = filtered.filter((e: any) => e.entity_id.startsWith(`${args.domain}.`));
      }
      if (args.area_id) {
        filtered = filtered.filter((e: any) => e.area_id === args.area_id);
      }
      if (args.device_id) {
        filtered = filtered.filter((e: any) => e.device_id === args.device_id);
      }
      if (args.state_filter) {
        filtered = filtered.filter((e: any) => e.state === args.state_filter);
      }
      if (!args.include_attributes) {
        filtered = filtered.map((e: any) => ({
          entity_id: e.entity_id,
          state: e.state,
          last_changed: e.last_changed
        }));
      }
      
      return filtered;
    },

    state: async (ws: any, args: any) => {
      if (!args.entity_id) {
        throw new Error('entity_id required');
      }
      
      // Validate entity ID format
      if (!validateEntityId(args.entity_id)) {
        throw new Error(`Invalid entity_id format: ${args.entity_id}`);
      }
      
      const states = await ws.getStates();
      const entity = states.find((e: any) => e.entity_id === args.entity_id);
      if (!entity) {
        throw new Error(`Entity ${args.entity_id} not found`);
      }
      return entity;
    },

    areas: async (ws: any) => ws.getAreas(),
    devices: async (ws: any) => ws.getDevices(),
    services: async (ws: any, args: any) => {
      const services = await ws.getServices();
      return args.domain ? services[args.domain] : services;
    },
    config: async (ws: any) => ws.getConfig(),

    templates: async (ws: any) => {
      const result = await ws.callService('template', 'reload', {}, {});
      return { message: 'Templates reloaded', result };
    },

    integrations: async (ws: any) => {
      const config = await ws.getConfig();
      return {
        components: config.components,
        custom_components: config.custom_components || [],
        version: config.version
      };
    },

    addons: async (ws: any) => {
      try {
        return await ws.callSupervisorAPI('/addons');
      } catch (error) {
        return { error: 'Supervisor API not available' };
      }
    },

    logs: async (ws: any, args: any) => {
      const domain = args.domain || 'homeassistant';
      return ws.callService('system_log', 'list', { domain }, {});
    },

    history: async (ws: any, args: any) => {
      // TODO: Implement HTTP API integration for history
      // For now, use WebSocket command if available
      if (!args.entity_id) {
        throw new Error('entity_id required for history query');
      }
      
      const command: any = {
        type: 'history/history_during_period',
        entity_ids: Array.isArray(args.entity_id) ? args.entity_id : [args.entity_id]
      };
      
      if (args.start_time) command.start_time = args.start_time;
      if (args.end_time) command.end_time = args.end_time;
      if (args.minimal_response !== undefined) command.minimal_response = args.minimal_response;
      if (args.no_attributes !== undefined) command.no_attributes = args.no_attributes;
      
      try {
        return await ws.sendCommand(command);
      } catch (error) {
        // Fallback message if command not available
        return { 
          message: 'History API not available via WebSocket',
          error: (error as Error).message,
          fallback: 'HTTP API integration required for full history support'
        };
      }
    }
  },
  
  control: {
    call_service: async (ws: any, args: any) => {
      if (!args.domain || !args.service) {
        throw new Error('domain and service required');
      }
      
      // Sanitize service data to prevent XSS
      const sanitizedData = args.data ? sanitizeInput(args.data) : {};
      
      // Validate entity IDs in target
      if (args.target?.entity_id) {
        const entityIds = Array.isArray(args.target.entity_id) 
          ? args.target.entity_id 
          : [args.target.entity_id];
        
        for (const id of entityIds) {
          if (!validateEntityId(id)) {
            throw new Error(`Invalid entity_id format: ${id}`);
          }
        }
      }
      
      return withRetry(() => 
        ws.callService(args.domain, args.service, sanitizedData, args.target || {})
      );
    },

    toggle: async (ws: any, args: any) => {
      if (!args.target?.entity_id) {
        throw new Error('entity_id required in target');
      }
      const domain = args.target.entity_id.split('.')[0];
      return ws.callService(domain, 'toggle', {}, args.target);
    },

    set_value: async (ws: any, args: any) => {
      if (!args.target?.entity_id || args.value === undefined) {
        throw new Error('entity_id and value required');
      }
      const domain = args.target.entity_id.split('.')[0];
      
      const valueServices: Record<string, { service: string; field: string }> = {
        light: { service: 'turn_on', field: 'brightness' },
        climate: { service: 'set_temperature', field: 'temperature' },
        fan: { service: 'set_percentage', field: 'percentage' },
        cover: { service: 'set_cover_position', field: 'position' },
        number: { service: 'set_value', field: 'value' },
        input_number: { service: 'set_value', field: 'value' }
      };
      
      const config = valueServices[domain];
      if (!config) {
        throw new Error(`Cannot set value for domain: ${domain}`);
      }
      
      return ws.callService(domain, config.service, { [config.field]: args.value }, args.target);
    },

    scene_activate: async (ws: any, args: any) => {
      if (!args.scene_id) {
        throw new Error('scene_id required');
      }
      return ws.callService('scene', 'turn_on', {}, { entity_id: args.scene_id });
    },

    script_run: async (ws: any, args: any) => {
      if (!args.script_id) {
        throw new Error('script_id required');
      }
      return ws.callService('script', 'turn_on', args.data || {}, { entity_id: args.script_id });
    },

    reload_integration: async (ws: any, args: any) => {
      if (!args.integration) {
        throw new Error('integration required');
      }
      
      const reloadMap: Record<string, string> = {
        automation: 'automation.reload',
        script: 'script.reload',
        scene: 'scene.reload',
        group: 'group.reload',
        zone: 'zone.reload',
        template: 'template.reload',
        person: 'person.reload'
      };
      
      const service = reloadMap[args.integration];
      if (!service) {
        throw new Error(`No reload service for: ${args.integration}`);
      }
      
      const [domain, action] = service.split('.');
      return ws.callService(domain, action, {}, {});
    },

    create_automation: async (ws: any, args: any) => {
      if (!args.alias || !args.trigger || !args.action) {
        throw new Error('alias, trigger, and action required');
      }
      
      return ws.callService('automation', 'create', {
        alias: args.alias,
        description: args.description || '',
        trigger: Array.isArray(args.trigger) ? args.trigger : [args.trigger],
        condition: args.condition || [],
        action: Array.isArray(args.action) ? args.action : [args.action],
        mode: args.mode || 'single'
      }, {});
    },

    backup_create: async (ws: any, args: any) => {
      return ws.callService('backup', 'create', {
        name: args.name || `Backup_${new Date().toISOString().split('T')[0]}`
      }, {});
    },

    recorder_purge: async (ws: any, args: any) => {
      const params: any = {};
      if (args.keep_days !== undefined) params.keep_days = args.keep_days;
      if (args.repack) params.repack = args.repack;
      if (args.apply_filter) params.apply_filter = args.apply_filter;
      
      return ws.callService('recorder', 'purge', params, {});
    }
  },
  
  monitor: {
    subscribe: async (ws: any, args: any) => {
      const eventType = args.custom_event_type || args.event_type || 'state_changed';
      const result = await ws.subscribeEvents(eventType);
      
      return {
        subscription_id: result.id,
        event_type: eventType,
        filter: args.entity_filter,
        message: `Subscribed to ${eventType}`
      };
    },

    unsubscribe: async (ws: any, args: any) => {
      if (!args.subscription_id) {
        throw new Error('subscription_id required');
      }
      await ws.unsubscribeEvents(args.subscription_id);
      return { message: `Unsubscribed from ${args.subscription_id}` };
    },

    get_events: async () => {
      return { message: 'Use subscribe to monitor events' };
    },

    fire_event: async (ws: any, args: any) => {
      const eventType = args.custom_event_type || args.event_type;
      if (!eventType) {
        throw new Error('event_type required');
      }
      await ws.fireEvent(eventType, args.event_data || {});
      return { message: `Event ${eventType} fired` };
    },

    diagnostics: async (ws: any) => {
      const diagnostics: any = {
        uptime: null,
        database_size: null,
        error_count: 0,
        warning_count: 0
      };
      
      try {
        diagnostics.health = await ws.callService('system_health', 'info', {}, {});
      } catch (e) {
        // Service might not be available
      }
      
      try {
        diagnostics.recorder = await ws.callService('recorder', 'get_statistics', {}, {});
      } catch (e) {
        // Recorder stats might not be available
      }
      
      return diagnostics;
    },

    trace_automation: async (ws: any, args: any) => {
      if (!args.automation_id) {
        throw new Error('automation_id required');
      }
      
      return ws.callService('automation', 'trace', {
        entity_id: args.automation_id,
        limit: args.limit || 5
      }, {});
    },

    websocket_commands: async (ws: any, args: any) => {
      if (!args.command || !args.command.type) {
        throw new Error('command with type required');
      }
      return ws.sendRawCommand(args.command);
    }
  },

  assist: {
    suggest_automation: async (ws: any, args: any) => {
      const states = await ws.getStates();
      const suggestions = [];
      
      if (args.automation_type === 'time_based') {
        suggestions.push({
          trigger: { platform: 'sun', event: 'sunset' },
          action: { service: 'light.turn_on' },
          description: 'Lights on at sunset'
        });
      }
      
      if (args.automation_type === 'presence') {
        const motionSensors = states.filter((e: any) => 
          e.entity_id.includes('motion') || e.entity_id.includes('occupancy')
        );
        if (motionSensors.length > 0) {
          suggestions.push({
            trigger: { platform: 'state', entity_id: motionSensors[0].entity_id, to: 'on' },
            action: { service: 'light.turn_on' },
            description: 'Motion-activated lighting'
          });
        }
      }
      
      return { suggestions, analyzed: states.length };
    },
    
    analyze_patterns: async (ws: any) => {
      const states = await ws.getStates();
      const analysis: any = {
        total_entities: states.length,
        domains: {},
        unavailable: 0
      };
      
      states.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        analysis.domains[domain] = (analysis.domains[domain] || 0) + 1;
        if (entity.state === 'unavailable') {
          analysis.unavailable++;
        }
      });
      
      return analysis;
    },
    
    optimize_energy: async (ws: any) => {
      const states = await ws.getStates();
      const recommendations = [];
      
      const lightsOn = states.filter((e: any) => 
        e.entity_id.startsWith('light.') && e.state === 'on'
      );
      
      if (lightsOn.length > 3) {
        recommendations.push({
          action: 'Review active lights',
          entities: lightsOn.map((l: any) => l.entity_id),
          impact: 'high'
        });
      }
      
      return { recommendations, analyzed: states.length };
    },
    
    security_check: async (ws: any) => {
      const states = await ws.getStates();
      const issues = [];
      
      const locks = states.filter((e: any) => e.entity_id.startsWith('lock.'));
      const unlocked = locks.filter((l: any) => l.state === 'unlocked');
      
      if (unlocked.length > 0) {
        issues.push({
          severity: 'warning',
          type: 'unlocked_doors',
          entities: unlocked.map((d: any) => d.entity_id)
        });
      }
      
      return { 
        status: issues.length === 0 ? 'secure' : 'review_needed',
        issues
      };
    },
    
    troubleshoot: async (ws: any, args: any) => {
      const states = await ws.getStates();
      const unavailable = states.filter((e: any) => e.state === 'unavailable');
      
      return {
        issue: args.issue_description,
        unavailable_count: unavailable.length,
        unavailable_entities: unavailable.slice(0, 10).map((e: any) => e.entity_id),
        suggestions: unavailable.length > 0 ? [
          'Check device power',
          'Verify network connectivity',
          'Review integration logs'
        ] : ['System appears healthy']
      };
    },
    
    explain_state: async (ws: any, args: any) => {
      if (!args.entities || args.entities.length === 0) {
        throw new Error('entities required');
      }
      
      const states = await ws.getStates();
      const explanations: any = {};
      
      for (const entityId of args.entities) {
        const entity = states.find((e: any) => e.entity_id === entityId);
        if (entity) {
          const domain = entityId.split('.')[0];
          explanations[entityId] = {
            state: entity.state,
            friendly_name: entity.attributes?.friendly_name,
            last_changed: entity.last_changed,
            explanation: getStateExplanation(domain, entity.state, entity)
          };
        }
      }
      
      return explanations;
    },

    validate_config: async (ws: any) => {
      const check = await ws.callService('homeassistant', 'check_config', {}, {});
      return {
        valid: !check.errors || check.errors.length === 0,
        errors: check.errors || [],
        warnings: check.warnings || []
      };
    },

    performance_analysis: async (ws: any) => {
      const states = await ws.getStates();
      const analysis: any = {
        total_entities: states.length,
        by_domain: {},
        stale_entities: [],
        unavailable: []
      };
      
      states.forEach((entity: any) => {
        const domain = entity.entity_id.split('.')[0];
        analysis.by_domain[domain] = (analysis.by_domain[domain] || 0) + 1;
        
        if (entity.state === 'unavailable') {
          analysis.unavailable.push(entity.entity_id);
        }
        
        const hoursSinceChange = (Date.now() - new Date(entity.last_changed).getTime()) / 3600000;
        if (hoursSinceChange > 24 && !entity.entity_id.includes('sun.')) {
          analysis.stale_entities.push({
            entity_id: entity.entity_id,
            hours: Math.round(hoursSinceChange)
          });
        }
      });
      
      return analysis;
    },

    generate_lovelace: async (_ws: any, args: any) => {
      if (!args.entities || args.entities.length === 0) {
        throw new Error('entities required');
      }
      
      const cards: any[] = [];
      const byDomain: Record<string, string[]> = {};
      
      args.entities.forEach((entityId: string) => {
        const domain = entityId.split('.')[0];
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(entityId);
      });
      
      Object.entries(byDomain).forEach(([domain, entities]) => {
        switch (domain) {
          case 'light':
            cards.push({ type: 'light', entity: entities[0] });
            break;
          case 'sensor':
          case 'binary_sensor':
            cards.push({ type: 'history-graph', entities, hours_to_show: 24 });
            break;
          case 'climate':
            cards.push({ type: 'thermostat', entity: entities[0] });
            break;
          default:
            cards.push({ type: 'entities', entities });
        }
      });
      
      return {
        title: args.title || 'Dashboard',
        views: [{ title: 'Home', cards }]
      };
    },

    migration_check: async (ws: any) => {
      const states = await ws.getStates();
      const config = await ws.getConfig();
      
      const issues: any = {
        deprecated: [],
        legacy: [],
        suggestions: []
      };
      
      states.forEach((entity: any) => {
        if (entity.entity_id.includes('__')) {
          issues.legacy.push({
            entity_id: entity.entity_id,
            issue: 'Double underscore in entity ID'
          });
        }
      });
      
      const [year, month] = config.version.split('.').map(Number);
      if (year === 2024 && month < 12) {
        issues.suggestions.push('Consider updating to latest 2024.12');
      }
      
      return issues;
    },

    blueprint_import: async (ws: any, args: any) => {
      if (!args.blueprint_url) {
        throw new Error('blueprint_url required');
      }
      
      return ws.callService('blueprint', 'import', {
        url: args.blueprint_url,
        domain: args.domain || 'automation'
      }, {});
    }
  }
};

function getStateExplanation(domain: string, state: string, entity: any): string {
  const explanations: Record<string, any> = {
    light: {
      on: 'Light is on',
      off: 'Light is off'
    },
    switch: {
      on: 'Switch is active',
      off: 'Switch is inactive'
    },
    lock: {
      locked: 'Locked and secure',
      unlocked: 'Unlocked - not secure'
    }
  };
  
  if (domain === 'sensor') {
    return `Reading: ${state} ${entity.attributes?.unit_of_measurement || ''}`.trim();
  }
  
  if (domain === 'climate') {
    return `Set to ${state}°${entity.attributes?.temperature_unit || 'C'}`;
  }
  
  return explanations[domain]?.[state] || `State: ${state}`;
}