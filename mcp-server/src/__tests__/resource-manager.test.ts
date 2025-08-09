import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceManager, CircuitBreaker, CommandQueue } from '../resource-manager';

describe('ResourceManager', () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = new ResourceManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.cleanup();
    vi.useRealTimers();
  });

  describe('Activity Tracking', () => {
    it('should record activity and prevent hibernation', () => {
      const hibernateSpy = vi.spyOn(manager as any, 'hibernate');
      
      manager.recordActivity();
      
      // Fast forward 4 minutes (less than hibernation timeout)
      vi.advanceTimersByTime(4 * 60 * 1000);
      
      expect(hibernateSpy).not.toHaveBeenCalled();
    });

    it('should hibernate after inactivity', () => {
      const hibernateSpy = vi.spyOn(manager as any, 'hibernate');
      
      // Fast forward 6 minutes (more than hibernation timeout)
      vi.advanceTimersByTime(6 * 60 * 1000);
      
      expect(hibernateSpy).toHaveBeenCalled();
    });

    it('should wake up when activity is recorded during hibernation', () => {
      const wakeUpSpy = vi.spyOn(manager as any, 'wakeUp');
      
      // Trigger hibernation
      vi.advanceTimersByTime(6 * 60 * 1000);
      
      // Record activity
      manager.recordActivity();
      
      expect(wakeUpSpy).toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should register and manage cache', () => {
      const cache = new Map<string, any>();
      cache.set('entity1', { state: 'on' });
      cache.set('entity2', { state: 'off' });
      
      manager.registerCache(cache);
      
      const stats = manager.getStats();
      expect(stats.cacheSize).toBe(2);
    });

    it('should emit stats periodically', () => {
      const statsSpy = vi.fn();
      manager.on('stats', statsSpy);
      
      // Fast forward 1 minute (memory check interval)
      vi.advanceTimersByTime(60 * 1000);
      
      expect(statsSpy).toHaveBeenCalled();
      const stats = statsSpy.mock.calls[0][0];
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('isHibernating');
    });
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 1000, 500);
  });

  it('should allow successful operations', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await breaker.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalled();
  });

  it('should open circuit after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Fail 3 times to open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
    }
    
    expect(breaker.getState()).toBe('open');
    
    // Next attempt should fail immediately
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).toHaveBeenCalledTimes(3); // Not called on 4th attempt
  });

  it('should move to half-open state after timeout', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    vi.useFakeTimers();
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
    }
    
    expect(breaker.getState()).toBe('open');
    
    // Wait for reset timeout
    vi.advanceTimersByTime(600);
    
    // Circuit should move to half-open
    expect(breaker.getState()).toBe('half-open');
    
    vi.useRealTimers();
  });
});

describe('CommandQueue', () => {
  let queue: CommandQueue;

  beforeEach(() => {
    queue = new CommandQueue(5, 1000);
  });

  it('should enqueue and process commands', async () => {
    const executor = vi.fn().mockResolvedValue('result');
    
    const promise1 = queue.enqueue({ cmd: 'test1' });
    const promise2 = queue.enqueue({ cmd: 'test2' });
    
    expect(queue.size()).toBe(2);
    
    await queue.processQueue(executor);
    
    expect(queue.size()).toBe(0);
    expect(executor).toHaveBeenCalledTimes(2);
    
    const results = await Promise.all([promise1, promise2]);
    expect(results).toEqual(['result', 'result']);
  });

  it('should reject when queue is full', async () => {
    // Fill the queue
    for (let i = 0; i < 5; i++) {
      await queue.enqueue({ cmd: `test${i}` });
    }
    
    // Next enqueue should fail
    await expect(queue.enqueue({ cmd: 'overflow' })).rejects.toThrow('Command queue is full');
  });

  it('should expire old commands', async () => {
    vi.useFakeTimers();
    
    const promise = queue.enqueue({ cmd: 'test' });
    
    // Fast forward past max age
    vi.advanceTimersByTime(2000);
    
    // Enqueue another to trigger cleanup
    queue.enqueue({ cmd: 'new' });
    
    await expect(promise).rejects.toThrow('Command expired in queue');
    
    vi.useRealTimers();
  });
});