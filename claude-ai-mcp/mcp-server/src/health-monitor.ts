export class HealthMonitor {
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private activeConnections: number = 0;
  private lastError: string | null = null;
  private memoryUsage: NodeJS.MemoryUsage | null = null;

  constructor() {
    this.startTime = Date.now();
    this.startMonitoring();
  }

  private startMonitoring() {
    // Update memory usage every 30 seconds
    setInterval(() => {
      this.memoryUsage = process.memoryUsage();
    }, 30000);

    // Initial memory check
    this.memoryUsage = process.memoryUsage();
  }

  incrementRequests() {
    this.requestCount++;
  }

  incrementErrors(error?: string) {
    this.errorCount++;
    if (error) {
      this.lastError = error;
    }
  }

  setActiveConnections(count: number) {
    this.activeConnections = count;
  }

  async getStatus(): Promise<any> {
    const uptime = Date.now() - this.startTime;
    const healthy = this.errorCount < 100 && this.activeConnections < 100;

    return {
      healthy,
      uptime,
      uptimeHuman: this.formatUptime(uptime),
      requests: this.requestCount,
      errors: this.errorCount,
      activeConnections: this.activeConnections,
      lastError: this.lastError,
      memory: this.memoryUsage,
      timestamp: new Date().toISOString()
    };
  }

  async getMetrics(): Promise<string> {
    const status = await this.getStatus();
    
    // Prometheus format metrics
    const metrics = [
      '# HELP mcp_uptime_seconds MCP server uptime in seconds',
      '# TYPE mcp_uptime_seconds counter',
      `mcp_uptime_seconds ${Math.floor(status.uptime / 1000)}`,
      '',
      '# HELP mcp_requests_total Total number of requests',
      '# TYPE mcp_requests_total counter',
      `mcp_requests_total ${status.requests}`,
      '',
      '# HELP mcp_errors_total Total number of errors',
      '# TYPE mcp_errors_total counter',
      `mcp_errors_total ${status.errors}`,
      '',
      '# HELP mcp_active_connections Current number of active connections',
      '# TYPE mcp_active_connections gauge',
      `mcp_active_connections ${status.activeConnections}`,
      '',
      '# HELP mcp_memory_usage_bytes Memory usage in bytes',
      '# TYPE mcp_memory_usage_bytes gauge',
      `mcp_memory_usage_bytes{type="rss"} ${status.memory?.rss || 0}`,
      `mcp_memory_usage_bytes{type="heapTotal"} ${status.memory?.heapTotal || 0}`,
      `mcp_memory_usage_bytes{type="heapUsed"} ${status.memory?.heapUsed || 0}`,
      `mcp_memory_usage_bytes{type="external"} ${status.memory?.external || 0}`,
      ''
    ];

    return metrics.join('\n');
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Rate limiting check
  checkRateLimit(identifier: string, limit: number = 100): boolean {
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    const key = `rate_${identifier}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const requests = this.rateLimitStore.get(key) || [];
    const recentRequests = requests.filter((time: number) => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitStore.set(key, recentRequests);
    return true;
  }

  private rateLimitStore?: Map<string, number[]>;
}