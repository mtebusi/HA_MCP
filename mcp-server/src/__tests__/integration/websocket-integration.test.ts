import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { HomeAssistantWebSocketClient } from '../../websocket-client';
import { HomeAssistantMCPServer } from '../../index';

describe('WebSocket Integration Tests', () => {
  let client: HomeAssistantWebSocketClient;
  let server: HomeAssistantMCPServer;

  beforeAll(() => {
    process.env.HA_TOKEN = 'test-token';
    process.env.HA_URL = 'http://localhost:8123';
  });

  afterAll(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should establish connection with valid credentials', async () => {
      client = new HomeAssistantWebSocketClient(
        'ws://localhost:8123/api/websocket',
        'test-token'
      );

      const connectSpy = vi.fn();
      client.on('connected', connectSpy);

      await client.connect();
      expect(connectSpy).toHaveBeenCalled();
    }, { timeout: 10000 });

    it('should handle reconnection on disconnect', async () => {
      const reconnectSpy = vi.fn();
      client.on('reconnected', reconnectSpy);

      // Simulate disconnect
      client.disconnect();
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(reconnectSpy).toHaveBeenCalled();
    });

    it('should queue messages when disconnected', async () => {
      client.disconnect();
      
      const messageId = await client.sendMessage({
        type: 'get_states'
      });

      expect(messageId).toBeDefined();
      expect(client['messageQueue'].length).toBeGreaterThan(0);
    });
  });

  describe('Entity Operations', () => {
    it('should fetch all entities', async () => {
      await client.connect();
      
      const states = await client.getStates();
      expect(Array.isArray(states)).toBe(true);
    });

    it('should filter entities by domain', async () => {
      const lights = await client.getStates('light');
      
      lights.forEach(entity => {
        expect(entity.entity_id).toMatch(/^light\./);
      });
    });

    it('should get single entity state', async () => {
      const state = await client.getState('light.living_room');
      
      expect(state).toHaveProperty('entity_id');
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('attributes');
    });

    it('should handle non-existent entity gracefully', async () => {
      await expect(
        client.getState('light.non_existent')
      ).rejects.toThrow();
    });
  });

  describe('Service Calls', () => {
    it('should execute service call successfully', async () => {
      const result = await client.callService(
        'light',
        'turn_on',
        { entity_id: 'light.living_room' }
      );

      expect(result).toBeDefined();
    });

    it('should validate service parameters', async () => {
      await expect(
        client.callService('light', 'turn_on', {})
      ).rejects.toThrow();
    });

    it('should handle service call errors', async () => {
      await expect(
        client.callService('invalid_domain', 'invalid_service', {})
      ).rejects.toThrow();
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to state changes', async () => {
      const stateChangeSpy = vi.fn();
      
      const subscriptionId = await client.subscribeToEvents(
        'state_changed',
        stateChangeSpy
      );

      expect(subscriptionId).toBeDefined();
      
      // Trigger state change
      await client.callService('light', 'toggle', {
        entity_id: 'light.test'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(stateChangeSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from events', async () => {
      const subscriptionId = await client.subscribeToEvents(
        'state_changed',
        vi.fn()
      );

      const result = await client.unsubscribeFromEvents(subscriptionId);
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const invalidClient = new HomeAssistantWebSocketClient(
        'ws://localhost:8123/api/websocket',
        'invalid-token'
      );

      await expect(invalidClient.connect()).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors', async () => {
      const offlineClient = new HomeAssistantWebSocketClient(
        'ws://invalid-host:8123/api/websocket',
        'test-token'
      );

      await expect(offlineClient.connect()).rejects.toThrow();
    });

    it('should respect rate limiting', async () => {
      const promises = [];
      
      // Send many requests rapidly
      for (let i = 0; i < 150; i++) {
        promises.push(client.getStates());
      }

      const results = await Promise.allSettled(promises);
      const rejected = results.filter(r => r.status === 'rejected');
      
      expect(rejected.length).toBeGreaterThan(0);
      expect(rejected[0].reason).toMatch(/rate limit/i);
    });
  });

  describe('Performance', () => {
    it('should cache entity states', async () => {
      const start1 = Date.now();
      await client.getStates();
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await client.getStates();
      const time2 = Date.now() - start2;

      expect(time2).toBeLessThan(time1 / 2);
    });

    it('should batch multiple requests efficiently', async () => {
      const start = Date.now();
      
      await Promise.all([
        client.getStates(),
        client.getServices(),
        client.getConfig()
      ]);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });
});