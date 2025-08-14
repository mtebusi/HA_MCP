import { HAConfig, HAEntity, HARegistryEntity, HADevice } from './types';

export class HomeAssistantBridge {
  private supervisorToken: string;
  private userToken: string | null = null;
  private baseUrl = 'http://supervisor/core';
  private wsConnection: any = null;
  
  constructor() {
    this.supervisorToken = process.env.SUPERVISOR_TOKEN || '';
    this.baseUrl = process.env.HASSIO_API || 'http://supervisor/core';
  }

  async connectWithToken(userToken: string) {
    this.userToken = userToken;
    await this.validateConnection();
  }

  async connectWithSupervisor() {
    this.userToken = this.supervisorToken;
    await this.validateConnection();
  }

  private async validateConnection() {
    try {
      const response = await this.callAPI('/api/');
      if (!response.ok) {
        throw new Error('Invalid connection');
      }
    } catch (error) {
      console.error('Connection validation failed:', error);
      throw error;
    }
  }

  async getAuthorizationUrl(requestId: string): Promise<string> {
    const response = await this.callAPI('/api/config', {
      headers: {
        'Authorization': `Bearer ${this.supervisorToken}`
      }
    });
    
    const config = await response.json() as HAConfig;
    const baseUrl = config.external_url || config.internal_url || 'http://homeassistant.local:8123';
    
    const params = new URLSearchParams({
      client_id: 'https://github.com/mtebusi/ha-mcp',
      redirect_uri: `${baseUrl}/auth/callback`,
      state: requestId,
      response_type: 'code'
    });
    
    return `${baseUrl}/auth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${this.supervisorToken}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: 'https://github.com/mtebusi/ha-mcp'
      })
    });
    
    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  async callService(domain: string, service: string, entityId?: string, data?: any) {
    const payload = {
      ...data,
      entity_id: entityId
    };
    
    const response = await this.callAPI(`/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    return response.json();
  }

  async getStates(entityId?: string) {
    const endpoint = entityId 
      ? `/api/states/${entityId}`
      : '/api/states';
    
    const response = await this.callAPI(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    return response.json();
  }

  async getHistory(entityId: string, startTime?: Date) {
    const params = new URLSearchParams();
    if (startTime) {
      params.set('start_time', startTime.toISOString());
    }
    params.set('filter_entity_id', entityId);
    
    const response = await this.callAPI(`/api/history/period?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    return response.json();
  }

  async executeIntent(text: string, language = 'en') {
    const response = await this.callAPI('/api/conversation/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language
      })
    });
    
    return response.json();
  }

  async processConversation(text: string, conversationId?: string, language = 'en') {
    const response = await this.callAPI('/api/conversation/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        conversation_id: conversationId,
        language
      })
    });
    
    return response.json();
  }

  async getAreas() {
    const response = await this.callAPI('/api/config/area_registry/list', {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    return response.json();
  }

  async getDevices() {
    const response = await this.callAPI('/api/config/device_registry/list', {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    return response.json();
  }

  async getServices() {
    const response = await this.callAPI('/api/services', {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    return response.json();
  }

  async getExposedEntities(): Promise<HARegistryEntity[]> {
    // Get entities exposed to assist/conversation
    const response = await this.callAPI('/api/config/entity_registry/list', {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      }
    });
    
    const entities = await response.json() as HARegistryEntity[];
    
    // Filter for exposed entities
    return entities.filter((entity) => 
      !entity.hidden_by && 
      !entity.disabled_by
    );
  }

  async getAreaDevices(areaId: string): Promise<HAEntity[]> {
    const devices = await this.getDevices() as HADevice[];
    const states = await this.getStates();
    const statesList: HAEntity[] = Array.isArray(states) ? states : [states];
    
    const areaDevices = devices.filter((device) => 
      device.area_id === areaId
    );
    
    const entities: HAEntity[] = [];
    for (const device of areaDevices) {
      const deviceEntities = statesList.filter((state) => 
        state.attributes?.device_id === device.id
      );
      entities.push(...deviceEntities);
    }
    
    return entities;
  }

  async renderTemplate(template: string) {
    const response = await this.callAPI('/api/template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ template })
    });
    
    return response.text();
  }

  private async callAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    return fetch(url, options);
  }
}