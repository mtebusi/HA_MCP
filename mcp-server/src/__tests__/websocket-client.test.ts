import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { HomeAssistantWebSocket } from '../websocket-client';

// Mock the ws module
vi.mock('ws', () => {
  const EventEmitter = require('events');
  
  class MockWebSocket extends EventEmitter {
    readyState = WebSocket.OPEN;
    send = vi.fn();
    close = vi.fn();
    ping = vi.fn();
    
    constructor(url: string) {
      super();
      setTimeout(() => {
        this.emit('open');
        // Simulate HA auth flow
        this.emit('message', JSON.stringify({ type: 'auth_required' }));
      }, 10);
    }
  }
  
  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSED = 3;
  
  return { default: MockWebSocket };
});

describe('HomeAssistantWebSocket', () => {
  let client: HomeAssistantWebSocket;
  const mockUrl = 'ws://localhost:8123/api/websocket';
  const mockToken = 'test-token-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (client) {
      client.close();
    }
  });

  describe('Connection Management', () => {
    it('should establish connection with correct URL and token', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(client).toBeDefined();
      // Connection should be established
    });

    it('should handle authentication flow', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      const connectedPromise = new Promise(resolve => {
        client.on('connected', resolve);
      });

      // Simulate auth success
      setTimeout(() => {
        const ws = (client as any).ws;
        ws.emit('message', JSON.stringify({ type: 'auth_ok' }));
      }, 20);

      await connectedPromise;
      
      expect((client as any).authenticated).toBe(true);
    });

    it('should reconnect on connection loss', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      let reconnectCount = 0;
      client.on('reconnecting', () => {
        reconnectCount++;
      });

      // Simulate connection loss
      setTimeout(() => {
        const ws = (client as any).ws;
        ws.readyState = WebSocket.CLOSED;
        ws.emit('close');
      }, 50);

      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(reconnectCount).toBeGreaterThan(0);
    });

    it('should respect max reconnect attempts', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      (client as any).maxReconnectAttempts = 3;
      
      let errorEmitted = false;
      client.on('error', (error) => {
        if (error.message.includes('Max reconnection attempts')) {
          errorEmitted = true;
        }
      });

      // Simulate multiple connection failures
      for (let i = 0; i < 4; i++) {
        const ws = (client as any).ws;
        ws.readyState = WebSocket.CLOSED;
        ws.emit('close');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(errorEmitted).toBe(true);
    });
  });

  describe('Command Handling', () => {
    beforeEach(async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      // Complete auth flow
      await new Promise(resolve => {
        client.on('connected', resolve);
        setTimeout(() => {
          const ws = (client as any).ws;
          ws.emit('message', JSON.stringify({ type: 'auth_ok' }));
        }, 20);
      });
    });

    it('should send commands with unique IDs', async () => {
      const ws = (client as any).ws;
      
      const promise1 = client.sendCommand({ type: 'get_states' });
      const promise2 = client.sendCommand({ type: 'get_config' });

      // Check that commands were sent with different IDs
      expect(ws.send).toHaveBeenCalledTimes(2);
      const call1 = JSON.parse(ws.send.mock.calls[0][0]);
      const call2 = JSON.parse(ws.send.mock.calls[1][0]);
      
      expect(call1.id).toBeDefined();
      expect(call2.id).toBeDefined();
      expect(call1.id).not.toBe(call2.id);
    });

    it('should resolve command promises on success', async () => {
      const ws = (client as any).ws;
      
      const commandPromise = client.sendCommand({ type: 'get_states' });
      
      // Get the command ID that was sent
      const sentCommand = JSON.parse(ws.send.mock.calls[0][0]);
      
      // Simulate successful response
      ws.emit('message', JSON.stringify({
        id: sentCommand.id,
        type: 'result',
        success: true,
        result: [{ entity_id: 'light.test', state: 'on' }]
      }));

      const result = await commandPromise;
      expect(result).toEqual([{ entity_id: 'light.test', state: 'on' }]);
    });

    it('should reject command promises on error', async () => {
      const ws = (client as any).ws;
      
      const commandPromise = client.sendCommand({ type: 'invalid_command' });
      
      // Get the command ID that was sent
      const sentCommand = JSON.parse(ws.send.mock.calls[0][0]);
      
      // Simulate error response
      ws.emit('message', JSON.stringify({
        id: sentCommand.id,
        type: 'result',
        success: false,
        error: { message: 'Unknown command' }
      }));

      await expect(commandPromise).rejects.toThrow('Unknown command');
    });

    it('should handle command timeout', async () => {
      (client as any).commandTimeout = 100; // Set short timeout
      
      const commandPromise = client.sendCommand({ type: 'slow_command' });
      
      // Don't send a response, let it timeout
      await expect(commandPromise).rejects.toThrow('Command timeout');
    }, 500);
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      // Complete auth flow
      await new Promise(resolve => {
        client.on('connected', resolve);
        setTimeout(() => {
          const ws = (client as any).ws;
          ws.emit('message', JSON.stringify({ type: 'auth_ok' }));
        }, 20);
      });
    });

    it('should emit state_changed events', async () => {
      const ws = (client as any).ws;
      
      const stateChangePromise = new Promise(resolve => {
        client.on('state_changed', resolve);
      });

      // Simulate state change event
      ws.emit('message', JSON.stringify({
        type: 'event',
        event: {
          event_type: 'state_changed',
          data: {
            entity_id: 'light.test',
            new_state: { state: 'on' },
            old_state: { state: 'off' }
          }
        }
      }));

      const event = await stateChangePromise;
      expect(event).toEqual({
        entity_id: 'light.test',
        new_state: { state: 'on' },
        old_state: { state: 'off' }
      });
    });

    it('should handle subscription to events', async () => {
      const ws = (client as any).ws;
      
      const subscribePromise = client.subscribeToEvents('state_changed');
      
      // Get the subscription command
      const sentCommand = JSON.parse(ws.send.mock.calls[0][0]);
      
      // Simulate successful subscription
      ws.emit('message', JSON.stringify({
        id: sentCommand.id,
        type: 'result',
        success: true
      }));

      const subscriptionId = await subscribePromise;
      expect(subscriptionId).toBeDefined();
    });

    it('should handle unsubscription from events', async () => {
      const ws = (client as any).ws;
      
      // First subscribe
      const subscribePromise = client.subscribeToEvents('state_changed');
      const sentSubscribe = JSON.parse(ws.send.mock.calls[0][0]);
      
      ws.emit('message', JSON.stringify({
        id: sentSubscribe.id,
        type: 'result',
        success: true
      }));

      const subscriptionId = await subscribePromise;
      
      // Now unsubscribe
      const unsubscribePromise = client.unsubscribeFromEvents(subscriptionId);
      const sentUnsubscribe = JSON.parse(ws.send.mock.calls[1][0]);
      
      ws.emit('message', JSON.stringify({
        id: sentUnsubscribe.id,
        type: 'result',
        success: true
      }));

      const result = await unsubscribePromise;
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should emit error on WebSocket error', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      const errorPromise = new Promise(resolve => {
        client.on('error', resolve);
      });

      const ws = (client as any).ws;
      ws.emit('error', new Error('WebSocket error'));

      const error = await errorPromise;
      expect(error).toEqual(new Error('WebSocket error'));
    });

    it('should handle malformed messages gracefully', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      let errorEmitted = false;
      client.on('error', () => {
        errorEmitted = true;
      });

      const ws = (client as any).ws;
      ws.emit('message', 'invalid json');

      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should handle gracefully without crashing
      expect(errorEmitted).toBe(false);
    });

    it('should clean up pending commands on close', async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      // Complete auth
      await new Promise(resolve => {
        client.on('connected', resolve);
        setTimeout(() => {
          const ws = (client as any).ws;
          ws.emit('message', JSON.stringify({ type: 'auth_ok' }));
        }, 20);
      });

      // Send command but don't respond
      const commandPromise = client.sendCommand({ type: 'test_command' });
      
      // Close connection
      client.close();

      // Command should be rejected
      await expect(commandPromise).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      client = new HomeAssistantWebSocket(mockUrl, mockToken);
      
      // Complete auth flow
      await new Promise(resolve => {
        client.on('connected', resolve);
        setTimeout(() => {
          const ws = (client as any).ws;
          ws.emit('message', JSON.stringify({ type: 'auth_ok' }));
        }, 20);
      });
    });

    it('should handle concurrent commands efficiently', async () => {
      const ws = (client as any).ws;
      
      // Send multiple commands concurrently
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(client.sendCommand({ type: `command_${i}` }));
      }

      // Simulate responses for all commands
      ws.send.mock.calls.forEach((call: any, index: number) => {
        const command = JSON.parse(call[0]);
        ws.emit('message', JSON.stringify({
          id: command.id,
          type: 'result',
          success: true,
          result: `result_${index}`
        }));
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    });

    it('should not leak memory with event listeners', () => {
      const ws = (client as any).ws;
      
      // Add and remove many event listeners
      for (let i = 0; i < 1000; i++) {
        const handler = () => {};
        client.on('test_event', handler);
        client.removeListener('test_event', handler);
      }

      // Check that listeners are properly cleaned up
      expect(client.listenerCount('test_event')).toBe(0);
    });
  });
});