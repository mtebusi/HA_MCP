#!/usr/bin/env node
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { WSMessage, EntityState, ServiceDomain } from './types';

export class HomeAssistantWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private pendingMessages = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private subscriptions = new Map<number, string>();
  private authenticated = false;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private shouldReconnect = true;

  constructor(url: string, token: string) {
    super();
    // Ensure WebSocket URL format
    this.url = url.startsWith('ws://') || url.startsWith('wss://') 
      ? url 
      : url.replace(/^https?/, 'ws') + '/api/websocket';
    this.token = token;
    
    // Never log tokens
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('WebSocket client initialized (token hidden)');
    }
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authenticated) {
      return;
    }

    this.cleanup();
    
    return new Promise((resolve, reject) => {
      console.error(`Connecting to Home Assistant at ${this.url}`);
      
      this.ws = new WebSocket(this.url, {
        rejectUnauthorized: process.env.HOMEASSISTANT_VERIFY_SSL !== 'false'
      });

      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('WebSocket connection timeout'));
      }, 30000);

      this.ws.on('open', () => {
        console.error('WebSocket connection established');
        this.reconnectAttempts = 0;
      });

      this.ws.on('message', (data) => {
        try {
          const msg: WSMessage = JSON.parse(data.toString());
          this.handleMessage(msg, timeout, resolve, reject);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        this.emit('error', error);
        if (!this.authenticated) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.error(`WebSocket closed: ${code} - ${reason}`);
        this.authenticated = false;
        this.emit('disconnected');
        
        // Clear all pending messages
        for (const [, pending] of this.pendingMessages) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('WebSocket closed'));
        }
        this.pendingMessages.clear();

        // Attempt reconnection
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    });
  }

  private handleMessage(
    msg: WSMessage, 
    timeout: NodeJS.Timeout, 
    resolve: () => void, 
    reject: (error: Error) => void
  ) {
    // Handle authentication flow
    if (msg.type === 'auth_required') {
      console.error('Authentication required');
      this.ws!.send(JSON.stringify({
        type: 'auth',
        access_token: this.token,
      }));
    } else if (msg.type === 'auth_ok') {
      console.error('Authentication successful');
      clearTimeout(timeout);
      this.authenticated = true;
      this.emit('connected');
      this.startHeartbeat();
      resolve();
    } else if (msg.type === 'auth_invalid') {
      clearTimeout(timeout);
      this.authenticated = false;
      this.shouldReconnect = false; // Don't reconnect on auth failure
      reject(new Error(msg.message || 'Invalid authentication'));
    }
    // Handle command responses
    else if (msg.id && this.pendingMessages.has(msg.id)) {
      const pending = this.pendingMessages.get(msg.id)!;
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(msg.id);

      if (msg.type === 'result') {
        if (msg.success !== false) {
          pending.resolve(msg.result);
        } else {
          pending.reject(new Error(msg.error?.message || 'Command failed'));
        }
      }
    }
    // Handle subscribed events
    else if (msg.type === 'event' && msg.id) {
      const subscription = this.subscriptions.get(msg.id);
      if (subscription) {
        this.emit(`subscription:${subscription}`, msg.event);
        this.emit('event', { subscription, event: msg.event });
      }
    }
    // Handle pong responses
    else if (msg.type === 'pong') {
      // Heartbeat acknowledged
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
        this.sendCommand({ type: 'ping' }).catch(() => {
          console.error('Heartbeat failed, reconnecting...');
          this.reconnect();
        });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;
    
    console.error(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.reconnect();
    }, delay);
  }

  private async reconnect() {
    try {
      await this.connect();
      console.error('Reconnection successful');
      this.emit('reconnected');
      
      // Re-establish subscriptions
      for (const [, type] of this.subscriptions) {
        console.error(`Re-subscribing to ${type}`);
        if (type === 'all' || type.startsWith('state_')) {
          await this.subscribeEvents(type === 'all' ? undefined : type);
        }
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error('Max reconnection attempts reached');
        this.emit('max_reconnect_attempts');
      }
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  async sendCommand(command: Omit<WSMessage, 'id'>): Promise<any> {
    if (!this.authenticated || this.ws?.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = this.messageId++;
    const message: WSMessage = { id, type: command.type || 'unknown', ...command };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error(`Command timeout: ${command.type}`));
      }, 60000);

      this.pendingMessages.set(id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(message));
    });
  }

  async subscribeEvents(eventType?: string): Promise<number> {
    const command: any = { type: 'subscribe_events' };
    if (eventType) {
      command.event_type = eventType;
    }

    const id = this.messageId;
    await this.sendCommand(command);
    this.subscriptions.set(id, eventType || 'all');
    return id;
  }

  async subscribeTrigger(trigger: any): Promise<number> {
    const command = { type: 'subscribe_trigger', trigger };
    const id = this.messageId;
    await this.sendCommand(command);
    this.subscriptions.set(id, `trigger_${JSON.stringify(trigger)}`);
    return id;
  }

  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.sendCommand({
      type: 'unsubscribe_events',
      subscription: subscriptionId,
    });
    this.subscriptions.delete(subscriptionId);
  }

  async getStates(): Promise<EntityState[]> {
    return this.sendCommand({ type: 'get_states' });
  }

  async getConfig(): Promise<any> {
    return this.sendCommand({ type: 'get_config' });
  }

  async getServices(): Promise<{ [domain: string]: ServiceDomain }> {
    return this.sendCommand({ type: 'get_services' });
  }

  async getPanels(): Promise<any> {
    return this.sendCommand({ type: 'get_panels' });
  }

  async getAreaRegistry(): Promise<any> {
    return this.sendCommand({ type: 'config/area_registry/list' });
  }

  async getDeviceRegistry(): Promise<any> {
    return this.sendCommand({ type: 'config/device_registry/list' });
  }
  
  async getAreas(): Promise<any> {
    return this.getAreaRegistry();
  }
  
  async getDevices(): Promise<any> {
    return this.getDeviceRegistry();
  }

  async getEntityRegistry(): Promise<any> {
    return this.sendCommand({ type: 'config/entity_registry/list' });
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: any,
    returnResponse?: boolean
  ): Promise<any> {
    const command: any = {
      type: 'call_service',
      domain,
      service,
    };

    if (serviceData) command.service_data = serviceData;
    if (target) command.target = target;
    if (returnResponse) command.return_response = true;

    return this.sendCommand(command);
  }

  async fireEvent(eventType: string, eventData?: any): Promise<any> {
    const command: any = {
      type: 'fire_event',
      event_type: eventType,
    };
    if (eventData) command.event_data = eventData;
    return this.sendCommand(command);
  }

  async validateConfig(config: {
    trigger?: any;
    condition?: any;
    action?: any;
  }): Promise<any> {
    return this.sendCommand({
      type: 'validate_config',
      ...config,
    });
  }

  async ping(): Promise<void> {
    await this.sendCommand({ type: 'ping' });
  }

  async callSupervisorAPI(endpoint: string): Promise<any> {
    // Call Supervisor API endpoints
    return this.sendCommand({ 
      type: 'supervisor/api',
      endpoint: endpoint,
      method: 'GET'
    });
  }

  async sendRawCommand(command: any): Promise<any> {
    // Send raw WebSocket command for advanced operations
    return this.sendCommand(command);
  }

  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    return this.sendCommand({
      type: 'unsubscribe_events',
      subscription: subscriptionId
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    this.cleanup();
    
    // Clear all pending messages with proper cleanup
    for (const [, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnecting'));
    }
    this.pendingMessages.clear();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
    this.subscriptions.clear();
  }
}