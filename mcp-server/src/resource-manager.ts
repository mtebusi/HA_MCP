/**
 * Resource Manager for Home Assistant MCP Server
 * 
 * Handles hibernation, memory optimization, and resource lifecycle
 * to keep the server lightweight when idle.
 */

import { EventEmitter } from 'events';

export interface ResourceStats {
  memoryUsage: NodeJS.MemoryUsage;
  cacheSize: number;
  activeConnections: number;
  lastActivity: Date;
  isHibernating: boolean;
}

export class ResourceManager extends EventEmitter {
  private lastActivity: Date = new Date();
  private hibernationTimer?: NodeJS.Timeout;
  private memoryCheckTimer?: NodeJS.Timeout;
  private isHibernating: boolean = false;
  
  // Configuration
  private readonly HIBERNATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MEMORY_CHECK_INTERVAL = 60 * 1000; // 1 minute
  private readonly MEMORY_THRESHOLD = 256 * 1024 * 1024; // 256MB
  private readonly CACHE_SIZE_LIMIT = 10000; // Max entities in cache
  
  // Resource references
  private cacheRef: Map<string, any> | null = null;
  private connectionRef: any | null = null;
  
  constructor() {
    super();
    this.startMonitoring();
  }
  
  /**
   * Register resources for management
   */
  registerCache(cache: Map<string, any>): void {
    this.cacheRef = cache;
  }
  
  registerConnection(connection: any): void {
    this.connectionRef = connection;
  }
  
  /**
   * Record activity to prevent hibernation
   */
  recordActivity(): void {
    this.lastActivity = new Date();
    
    if (this.isHibernating) {
      this.wakeUp();
    }
    
    this.scheduleHibernation();
  }
  
  /**
   * Start resource monitoring
   */
  private startMonitoring(): void {
    // Monitor memory usage
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL);
    
    // Schedule initial hibernation check
    this.scheduleHibernation();
  }
  
  /**
   * Schedule hibernation after inactivity
   */
  private scheduleHibernation(): void {
    if (this.hibernationTimer) {
      clearTimeout(this.hibernationTimer);
    }
    
    this.hibernationTimer = setTimeout(() => {
      this.hibernate();
    }, this.HIBERNATION_TIMEOUT);
  }
  
  /**
   * Enter hibernation mode to save resources
   */
  private hibernate(): void {
    if (this.isHibernating) return;
    
    console.log('[ResourceManager] Entering hibernation mode');
    this.isHibernating = true;
    
    // Clear non-essential cache entries
    if (this.cacheRef && this.cacheRef.size > 100) {
      const essentialEntities = new Set<string>();
      
      // Keep only recently used or important entities
      for (const [key, value] of this.cacheRef.entries()) {
        if (this.isEssentialEntity(key)) {
          essentialEntities.add(key);
        }
      }
      
      // Clear non-essential entries
      for (const key of this.cacheRef.keys()) {
        if (!essentialEntities.has(key)) {
          this.cacheRef.delete(key);
        }
      }
    }
    
    // Reduce connection activity
    if (this.connectionRef) {
      this.emit('hibernate', { connection: this.connectionRef });
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    this.emit('hibernated');
  }
  
  /**
   * Wake up from hibernation
   */
  private wakeUp(): void {
    if (!this.isHibernating) return;
    
    console.log('[ResourceManager] Waking up from hibernation');
    this.isHibernating = false;
    
    // Restore full functionality
    this.emit('wakeup', { connection: this.connectionRef });
    
    // Re-fetch data if needed
    if (this.connectionRef) {
      this.emit('refresh-data');
    }
    
    this.emit('awake');
  }
  
  /**
   * Check if an entity is essential and should be kept in cache
   */
  private isEssentialEntity(entityId: string): boolean {
    // Keep climate, security, and presence entities
    const essentialDomains = ['climate', 'alarm_control_panel', 'lock', 'person', 'device_tracker'];
    const domain = entityId.split('.')[0];
    return essentialDomains.includes(domain);
  }
  
  /**
   * Monitor and manage memory usage
   */
  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    
    // Check if memory usage is too high
    if (usage.heapUsed > this.MEMORY_THRESHOLD) {
      console.warn(`[ResourceManager] High memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      this.optimizeMemory();
    }
    
    // Check cache size
    if (this.cacheRef && this.cacheRef.size > this.CACHE_SIZE_LIMIT) {
      this.trimCache();
    }
    
    // Emit stats for monitoring
    this.emit('stats', this.getStats());
  }
  
  /**
   * Optimize memory usage
   */
  private optimizeMemory(): void {
    console.log('[ResourceManager] Optimizing memory usage');
    
    // Trim cache
    this.trimCache();
    
    // Clear rate limiter old entries
    this.emit('clear-rate-limiter');
    
    // Request garbage collection
    if (global.gc) {
      global.gc();
    }
  }
  
  /**
   * Trim cache to reasonable size
   */
  private trimCache(): void {
    if (!this.cacheRef) return;
    
    const targetSize = Math.floor(this.CACHE_SIZE_LIMIT * 0.8);
    
    if (this.cacheRef.size > targetSize) {
      const entriesToRemove = this.cacheRef.size - targetSize;
      const keys = Array.from(this.cacheRef.keys());
      
      // Remove oldest entries (assuming insertion order)
      for (let i = 0; i < entriesToRemove; i++) {
        const key = keys[i];
        if (!this.isEssentialEntity(key)) {
          this.cacheRef.delete(key);
        }
      }
      
      console.log(`[ResourceManager] Trimmed cache from ${keys.length} to ${this.cacheRef.size} entries`);
    }
  }
  
  /**
   * Get current resource statistics
   */
  getStats(): ResourceStats {
    return {
      memoryUsage: process.memoryUsage(),
      cacheSize: this.cacheRef?.size || 0,
      activeConnections: this.connectionRef ? 1 : 0,
      lastActivity: this.lastActivity,
      isHibernating: this.isHibernating
    };
  }
  
  /**
   * Cleanup resources on shutdown
   */
  cleanup(): void {
    if (this.hibernationTimer) {
      clearTimeout(this.hibernationTimer);
    }
    
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
    }
    
    this.cacheRef = null;
    this.connectionRef = null;
    
    this.removeAllListeners();
  }
}

// Circuit breaker for connection failures
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailure: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  
  constructor(threshold = 5, timeout = 60000, resetTimeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      const timeSinceLastFailure = this.lastFailure ? now - this.lastFailure.getTime() : Infinity;
      
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailure = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log('[CircuitBreaker] Circuit opened due to repeated failures');
      
      // Schedule reset attempt
      setTimeout(() => {
        this.state = 'half-open';
        console.log('[CircuitBreaker] Circuit moved to half-open state');
      }, this.resetTimeout);
    }
  }
  
  private reset(): void {
    this.failures = 0;
    this.lastFailure = null;
    this.state = 'closed';
    console.log('[CircuitBreaker] Circuit closed - service recovered');
  }
  
  getState(): string {
    return this.state;
  }
}

// Command queue for handling requests during connection issues
export class CommandQueue {
  private queue: Array<{
    command: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }> = [];
  
  private readonly maxSize: number;
  private readonly maxAge: number;
  
  constructor(maxSize = 100, maxAgeMs = 60000) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }
  
  enqueue(command: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxSize) {
        reject(new Error('Command queue is full'));
        return;
      }
      
      this.queue.push({
        command,
        resolve,
        reject,
        timestamp: new Date()
      });
      
      this.cleanOldCommands();
    });
  }
  
  async processQueue(executor: (command: any) => Promise<any>): Promise<void> {
    const commands = [...this.queue];
    this.queue = [];
    
    for (const item of commands) {
      try {
        const result = await executor(item.command);
        item.resolve(result);
      } catch (error: any) {
        item.reject(error);
      }
    }
  }
  
  private cleanOldCommands(): void {
    const now = Date.now();
    this.queue = this.queue.filter(item => {
      const age = now - item.timestamp.getTime();
      if (age > this.maxAge) {
        item.reject(new Error('Command expired in queue'));
        return false;
      }
      return true;
    });
  }
  
  size(): number {
    return this.queue.length;
  }
  
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}