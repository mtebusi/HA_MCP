/**
 * Security utilities for Home Assistant MCP Server
 * Implements comprehensive security measures to protect against vulnerabilities
 */

import crypto from 'crypto';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types';

// Security configuration
const SECURITY_CONFIG = {
  TOKEN_MIN_LENGTH: 32,
  TOKEN_MAX_AGE: 86400000, // 24 hours
  MAX_REQUEST_SIZE: 10485760, // 10MB
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  SESSION_TIMEOUT: 1800000, // 30 minutes
  CSRF_TOKEN_LENGTH: 32,
  ALLOWED_DOMAINS: ['light', 'switch', 'sensor', 'climate', 'cover', 'fan', 'lock', 'media_player'],
  BLOCKED_SERVICES: ['shell_command', 'python_script', 'rest_command'],
  ALLOWED_SUPERVISOR_ENDPOINTS: ['/addons', '/info', '/stats', '/logs'],
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_UPPERCASE: true,
  AUDIT_LOG_RETENTION: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Token validation and management
export class TokenManager {
  private tokenStore = new Map<string, { token: string; expires: number; userId?: string }>();
  private csrfTokens = new Map<string, { token: string; expires: number }>();

  /**
   * Validate token format and expiry
   */
  validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check token length
    if (token.length < SECURITY_CONFIG.TOKEN_MIN_LENGTH) {
      return false;
    }

    // Check token format (should be alphanumeric with some special chars)
    const tokenRegex = /^[A-Za-z0-9_\-\.]+$/;
    if (!tokenRegex.test(token)) {
      return false;
    }

    // Check if token is expired
    const storedToken = this.tokenStore.get(token);
    if (storedToken && Date.now() > storedToken.expires) {
      this.tokenStore.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Generate secure token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store token with expiry
   */
  storeToken(token: string, userId?: string): void {
    this.tokenStore.set(token, {
      token: crypto.createHash('sha256').update(token).digest('hex'),
      expires: Date.now() + SECURITY_CONFIG.TOKEN_MAX_AGE,
      userId
    });
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId: string): string {
    const token = crypto.randomBytes(SECURITY_CONFIG.CSRF_TOKEN_LENGTH).toString('hex');
    this.csrfTokens.set(sessionId, {
      token,
      expires: Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT
    });
    return token;
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionId: string, token: string): boolean {
    const stored = this.csrfTokens.get(sessionId);
    if (!stored) return false;
    
    if (Date.now() > stored.expires) {
      this.csrfTokens.delete(sessionId);
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  }

  /**
   * Clean up expired tokens
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, value] of this.tokenStore.entries()) {
      if (now > value.expires) {
        this.tokenStore.delete(key);
      }
    }
    
    for (const [key, value] of this.csrfTokens.entries()) {
      if (now > value.expires) {
        this.csrfTokens.delete(key);
      }
    }
  }
}

// Input validation and sanitization
export class InputValidator {
  /**
   * Validate entity ID format
   */
  static validateEntityId(entityId: string): boolean {
    const regex = /^[a-z0-9_]+\.[a-z0-9_]+$/;
    return regex.test(entityId) && 
           !entityId.includes('..') && 
           entityId.length < 255 &&
           !entityId.includes('--') &&
           !entityId.includes('/*') &&
           !entityId.includes('*/');
  }

  /**
   * Validate service call
   */
  static validateServiceCall(domain: string, service: string): boolean {
    // Check blocked services
    if (SECURITY_CONFIG.BLOCKED_SERVICES.includes(domain)) {
      return false;
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9_]+$/;
    if (!domainRegex.test(domain)) {
      return false;
    }

    // Validate service format
    const serviceRegex = /^[a-z0-9_]+$/;
    if (!serviceRegex.test(service)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(input).replace(/[&<>"'`=\/]/g, (s) => htmlEntities[s]);
  }

  /**
   * Prevent SQL injection
   */
  static sanitizeSQL(input: string): string {
    // Remove or escape dangerous SQL characters
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/sp_/gi, '')
      .replace(/(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript)/gi, '');
  }

  /**
   * Validate and sanitize JSON
   */
  static sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeHTML(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeHTML(key);
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate Supervisor API endpoint
   */
  static validateSupervisorEndpoint(endpoint: string): boolean {
    // Only allow whitelisted endpoints
    return SECURITY_CONFIG.ALLOWED_SUPERVISOR_ENDPOINTS.some(
      allowed => endpoint.startsWith(allowed)
    );
  }

  /**
   * Validate URL to prevent SSRF
   */
  static validateURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Block local addresses
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (blockedHosts.includes(parsed.hostname)) {
        return false;
      }
      
      // Block private IP ranges
      const ipRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
      if (ipRegex.test(parsed.hostname)) {
        return false;
      }
      
      // Only allow http(s) and ws(s)
      const allowedProtocols = ['http:', 'https:', 'ws:', 'wss:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate file path to prevent path traversal
   */
  static validatePath(path: string): boolean {
    // Block path traversal attempts
    if (path.includes('..') || path.includes('//')) {
      return false;
    }
    
    // Block absolute paths
    if (path.startsWith('/') || path.match(/^[A-Z]:\\/)) {
      return false;
    }
    
    // Block special characters
    const dangerousChars = ['<', '>', '|', '&', ';', '$', '`', '\n', '\r'];
    if (dangerousChars.some(char => path.includes(char))) {
      return false;
    }
    
    return true;
  }
}

// Rate limiting with global tracking
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private globalRequests = { count: 0, resetTime: Date.now() + SECURITY_CONFIG.RATE_LIMIT_WINDOW };

  /**
   * Check if request should be rate limited
   */
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    
    // Check global rate limit
    if (now > this.globalRequests.resetTime) {
      this.globalRequests = { count: 1, resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW };
    } else {
      this.globalRequests.count++;
      if (this.globalRequests.count > SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS * 10) {
        throw new McpError(ErrorCode.InvalidRequest, 'Global rate limit exceeded');
      }
    }
    
    // Check per-identifier rate limit
    const limit = this.requests.get(identifier);
    
    if (!limit || now > limit.resetTime) {
      this.requests.set(identifier, { 
        count: 1, 
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW 
      });
      return true;
    }
    
    limit.count++;
    
    if (limit.count > SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Rate limit exceeded. Please wait before making more requests.'
      );
    }
    
    return true;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Session management
export class SessionManager {
  private sessions = new Map<string, {
    id: string;
    userId?: string;
    createdAt: number;
    lastActivity: number;
    data: any;
  }>();

  /**
   * Create new session
   */
  createSession(userId?: string): string {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      data: {}
    });
    
    return sessionId;
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const now = Date.now();
    
    // Check session timeout
    if (now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return false;
    }
    
    // Update last activity
    session.lastActivity = now;
    return true;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
        this.sessions.delete(key);
      }
    }
  }
}

// Audit logging
export class AuditLogger {
  private logs: Array<{
    timestamp: number;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    event: string;
    userId?: string;
    details?: any;
  }> = [];

  /**
   * Log security event
   */
  log(level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL', event: string, userId?: string, details?: any): void {
    const entry = {
      timestamp: Date.now(),
      level,
      event,
      userId,
      details: this.sanitizeLogData(details)
    };
    
    this.logs.push(entry);
    
    // Log to console in production
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(`[SECURITY ${level}] ${event}`, details ? '(details hidden)' : '');
    }
    
    // Clean up old logs
    this.cleanup();
  }

  /**
   * Sanitize log data to prevent sensitive info leakage
   */
  private sanitizeLogData(data: any): any {
    if (!data) return undefined;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.length > 100 ? obj.substring(0, 100) + '...' : obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitize(value);
          }
        }
        return result;
      }
      
      return obj;
    };
    
    return sanitize(data);
  }

  /**
   * Get audit logs
   */
  getLogs(level?: string, startTime?: number): any[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    if (startTime) {
      filtered = filtered.filter(log => log.timestamp >= startTime);
    }
    
    return filtered;
  }

  /**
   * Clean up old logs
   */
  private cleanup(): void {
    const cutoff = Date.now() - SECURITY_CONFIG.AUDIT_LOG_RETENTION;
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
  }
}

// Password validation
export class PasswordValidator {
  /**
   * Validate password strength
   */
  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters`);
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common patterns
    const commonPatterns = ['123456', 'password', 'admin', 'qwerty', 'abc123'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      errors.push('Password contains common patterns');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash password
   */
  static hash(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password
   */
  static verify(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  }
}

// Security headers
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Export singleton instances
export const tokenManager = new TokenManager();
export const rateLimiter = new RateLimiter();
export const sessionManager = new SessionManager();
export const auditLogger = new AuditLogger();

// Cleanup interval
setInterval(() => {
  tokenManager.cleanup();
  rateLimiter.cleanup();
  sessionManager.cleanup();
}, 60000); // Every minute
