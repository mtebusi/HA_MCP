// Home Assistant API Type Definitions

export interface HAConfig {
  external_url?: string;
  internal_url?: string;
  location_name?: string;
  elevation?: number;
  unit_system?: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  time_zone?: string;
  components?: string[];
  config_dir?: string;
  version?: string;
  state?: string;
}

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
  hidden_by?: string;
  disabled_by?: string;
}

export interface HARegistryEntity {
  entity_id: string;
  unique_id?: string;
  platform?: string;
  area_id?: string;
  device_id?: string;
  disabled_by?: string;
  hidden_by?: string;
  icon?: string;
  name?: string;
  config_entry_id?: string;
}

export interface HADevice {
  id: string;
  area_id?: string;
  config_entries?: string[];
  configuration_url?: string;
  connections?: Array<[string, string]>;
  disabled_by?: string;
  entry_type?: string;
  hw_version?: string;
  identifiers?: Array<[string, string]>;
  manufacturer?: string;
  model?: string;
  name?: string;
  name_by_user?: string;
  sw_version?: string;
  via_device_id?: string;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
  aliases?: string[];
}

export interface HAService {
  domain: string;
  services: Record<string, {
    name?: string;
    description?: string;
    fields?: Record<string, {
      name?: string;
      description?: string;
      example?: any;
      default?: any;
      required?: boolean;
      selector?: any;
    }>;
    target?: {
      entity?: boolean;
      device?: boolean;
      area?: boolean;
    };
  }>;
}

export interface HAConversationResponse {
  response: {
    speech: {
      plain: {
        speech: string;
        extra_data?: any;
      };
    };
    card?: any;
    language?: string;
    response_type?: string;
  };
  conversation_id?: string;
}

export interface HAIntentResponse {
  card?: any;
  speech?: {
    speech: string;
    extra_data?: any;
  };
  language?: string;
  response_type?: string;
}

export interface AuthRequest {
  client_id: string;
  redirect_uri: string;
  state: string;
  scope: string;
}

export interface Session {
  haToken?: string;
  userId: string;
  expires: number;
  type: 'authenticated' | 'anonymous' | 'ingress';
}

export interface LLMTool {
  name: string;
  description: string;
  parameters?: any;
  handler: (args: any) => Promise<any>;
}