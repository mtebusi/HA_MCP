// Type definitions for Home Assistant entities and WebSocket messages

export interface HAConfig {
  url: string;
  token: string;
  verifySSL?: boolean;
}

export interface WSMessage {
  id?: number;
  type: string;
  success?: boolean;
  error?: {
    code: string;
    message: string;
  };
  result?: any;
  event?: any;
  [key: string]: any;
}

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_class?: string;
    unit_of_measurement?: string;
    icon?: string;
    [key: string]: any;
  };
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
}

export interface ServiceDomain {
  [service: string]: {
    name: string;
    description: string;
    fields: {
      [field: string]: {
        name?: string;
        description?: string;
        required?: boolean;
        example?: any;
        default?: any;
        selector?: any;
      };
    };
    target?: {
      entity?: {
        domain?: string | string[];
        device_class?: string | string[];
      };
      device?: {
        integration?: string;
        manufacturer?: string;
        model?: string;
      };
    };
    response?: {
      optional: boolean;
      description?: string;
    };
  };
}

export interface Area {
  area_id: string;
  name: string;
  picture?: string | null;
  aliases: string[];
}

export interface Device {
  id: string;
  name: string;
  name_by_user?: string | null;
  manufacturer?: string;
  model?: string;
  sw_version?: string;
  area_id?: string | null;
  configuration_url?: string | null;
  connections: Array<[string, string]>;
  identifiers: Array<[string, string]>;
  via_device_id?: string | null;
  disabled_by?: string | null;
  entry_type?: string | null;
}

export interface HistoryState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface LogbookEntry {
  when: string;
  name: string;
  message?: string;
  entity_id?: string;
  domain?: string;
  context_id?: string;
  context_user_id?: string | null;
  context_event_type?: string;
  context_domain?: string;
  context_service?: string;
  context_entity_id?: string;
}