import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { Request, Response } from 'express';

export class SSEServerTransport implements Transport {
  private res: Response;
  private req: Request;
  private closed = false;
  private messageQueue: any[] = [];
  private messageIdCounter = 0;

  constructor(res: Response, req: Request) {
    this.res = res;
    this.req = req;
    
    // Handle client disconnect
    this.req.on('close', () => {
      this.closed = true;
    });
  }

  async start(): Promise<void> {
    // SSE connection is already established
    this.sendEvent('connected', { timestamp: Date.now() });
  }

  async send(message: any): Promise<void> {
    if (this.closed) {
      throw new Error('SSE connection is closed');
    }

    const messageId = ++this.messageIdCounter;
    const event = {
      id: messageId,
      data: message,
      timestamp: Date.now()
    };

    this.sendEvent('message', event);
  }

  async receive(): Promise<any> {
    // For SSE, we need to handle incoming messages differently
    // This would typically be handled through POST requests to a separate endpoint
    return new Promise((resolve) => {
      // Wait for message from queue
      const checkQueue = () => {
        if (this.messageQueue.length > 0) {
          resolve(this.messageQueue.shift());
        } else if (!this.closed) {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    });
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      this.sendEvent('close', { reason: 'Transport closed' });
      this.res.end();
    }
  }

  sendEvent(event: string, data: any) {
    if (this.closed) return;
    
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.res.write(message);
  }

  // Handle incoming messages from POST requests
  handleMessage(message: any) {
    this.messageQueue.push(message);
    return { success: true, queued: this.messageQueue.length };
  }

  isConnected(): boolean {
    return !this.closed;
  }
}