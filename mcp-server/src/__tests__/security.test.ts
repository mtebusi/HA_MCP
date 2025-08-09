/**
 * Security Tests for Home Assistant MCP Server
 * Tests all security features and vulnerability protections
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TokenManager,
  InputValidator,
  RateLimiter,
  SessionManager,
  AuditLogger,
  PasswordValidator
} from '../security';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('Security Module Tests', () => {
  describe('TokenManager', () => {
    let tokenManager: TokenManager;

    beforeEach(() => {
      tokenManager = new TokenManager();
    });

    it('should validate token format', () => {
      // Valid token
      const validToken = 'a'.repeat(32);
      expect(tokenManager.validateToken(validToken)).toBe(true);

      // Invalid tokens
      expect(tokenManager.validateToken('')).toBe(false);
      expect(tokenManager.validateToken('short')).toBe(false);
      expect(tokenManager.validateToken('invalid<script>')).toBe(false);
      expect(tokenManager.validateToken(null as any)).toBe(false);
    });

    it('should generate secure tokens', () => {
      const token1 = tokenManager.generateToken();
      const token2 = tokenManager.generateToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should validate CSRF tokens', () => {
      const sessionId = 'test-session';
      const csrfToken = tokenManager.generateCSRFToken(sessionId);

      expect(tokenManager.validateCSRFToken(sessionId, csrfToken)).toBe(true);
      expect(tokenManager.validateCSRFToken(sessionId, 'wrong-token')).toBe(false);
      expect(tokenManager.validateCSRFToken('wrong-session', csrfToken)).toBe(false);
    });

    it('should handle token expiry', () => {
      const token = 'test-token-' + 'a'.repeat(24);
      tokenManager.storeToken(token, 'user1');

      // Mock expired token
      const storedToken = (tokenManager as any).tokenStore.get(token);
      if (storedToken) {
        storedToken.expires = Date.now() - 1000;
      }

      expect(tokenManager.validateToken(token)).toBe(false);
    });
  });

  describe('InputValidator', () => {
    describe('Entity ID Validation', () => {
      it('should validate correct entity IDs', () => {
        expect(InputValidator.validateEntityId('light.kitchen')).toBe(true);
        expect(InputValidator.validateEntityId('sensor.temperature_bedroom')).toBe(true);
        expect(InputValidator.validateEntityId('switch.outlet_1')).toBe(true);
      });

      it('should reject invalid entity IDs', () => {
        expect(InputValidator.validateEntityId('invalid')).toBe(false);
        expect(InputValidator.validateEntityId('light..kitchen')).toBe(false);
        expect(InputValidator.validateEntityId('light.kitchen--')).toBe(false);
        expect(InputValidator.validateEntityId('light.kitchen/*')).toBe(false);
        expect(InputValidator.validateEntityId('a'.repeat(256))).toBe(false);
      });
    });

    describe('Service Call Validation', () => {
      it('should validate allowed service calls', () => {
        expect(InputValidator.validateServiceCall('light', 'turn_on')).toBe(true);
        expect(InputValidator.validateServiceCall('switch', 'toggle')).toBe(true);
      });

      it('should block dangerous service calls', () => {
        expect(InputValidator.validateServiceCall('shell_command', 'execute')).toBe(false);
        expect(InputValidator.validateServiceCall('python_script', 'run')).toBe(false);
        expect(InputValidator.validateServiceCall('rest_command', 'send')).toBe(false);
      });

      it('should reject invalid service formats', () => {
        expect(InputValidator.validateServiceCall('light<script>', 'turn_on')).toBe(false);
        expect(InputValidator.validateServiceCall('light', 'turn_on;DROP TABLE')).toBe(false);
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize HTML content', () => {
        expect(InputValidator.sanitizeHTML('<script>alert("XSS")</script>'))
          .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
        
        expect(InputValidator.sanitizeHTML('Hello <b>World</b>'))
          .toBe('Hello &lt;b&gt;World&lt;&#x2F;b&gt;');
        
        expect(InputValidator.sanitizeHTML("' OR '1'='1"))
          .toBe('&#x27; OR &#x27;1&#x27;&#x3D;&#x27;1');
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should sanitize SQL injection attempts', () => {
        expect(InputValidator.sanitizeSQL("'; DROP TABLE users; --"))
          .toBe(' DROP TABLE users ');
        
        expect(InputValidator.sanitizeSQL("1' UNION SELECT * FROM passwords"))
          .toBe('1  * FROM passwords');
        
        expect(InputValidator.sanitizeSQL("admin' --"))
          .toBe('admin ');
      });
    });

    describe('Path Traversal Prevention', () => {
      it('should block path traversal attempts', () => {
        expect(InputValidator.validatePath('../../../etc/passwd')).toBe(false);
        expect(InputValidator.validatePath('..\\..\\windows\\system32')).toBe(false);
        expect(InputValidator.validatePath('/etc/passwd')).toBe(false);
        expect(InputValidator.validatePath('C:\\Windows\\System32')).toBe(false);
      });

      it('should allow safe paths', () => {
        expect(InputValidator.validatePath('config/settings.yaml')).toBe(true);
        expect(InputValidator.validatePath('data/cache.json')).toBe(true);
      });
    });

    describe('SSRF Prevention', () => {
      it('should block internal URLs', () => {
        expect(InputValidator.validateURL('http://localhost/admin')).toBe(false);
        expect(InputValidator.validateURL('http://127.0.0.1:8080')).toBe(false);
        expect(InputValidator.validateURL('http://192.168.1.1')).toBe(false);
        expect(InputValidator.validateURL('http://10.0.0.1')).toBe(false);
      });

      it('should allow external URLs', () => {
        expect(InputValidator.validateURL('https://api.example.com')).toBe(true);
        expect(InputValidator.validateURL('wss://websocket.example.com')).toBe(true);
      });

      it('should block dangerous protocols', () => {
        expect(InputValidator.validateURL('file:///etc/passwd')).toBe(false);
        expect(InputValidator.validateURL('javascript:alert(1)')).toBe(false);
        expect(InputValidator.validateURL('data:text/html,<script>alert(1)</script>')).toBe(false);
      });
    });

    describe('Supervisor Endpoint Validation', () => {
      it('should allow whitelisted endpoints', () => {
        expect(InputValidator.validateSupervisorEndpoint('/addons')).toBe(true);
        expect(InputValidator.validateSupervisorEndpoint('/info')).toBe(true);
        expect(InputValidator.validateSupervisorEndpoint('/stats')).toBe(true);
        expect(InputValidator.validateSupervisorEndpoint('/logs')).toBe(true);
      });

      it('should block non-whitelisted endpoints', () => {
        expect(InputValidator.validateSupervisorEndpoint('/core/restart')).toBe(false);
        expect(InputValidator.validateSupervisorEndpoint('/host/shutdown')).toBe(false);
        expect(InputValidator.validateSupervisorEndpoint('/os/config/sync')).toBe(false);
      });
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
    });

    it('should allow requests within limit', () => {
      const identifier = 'test-user';
      
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.checkLimit(identifier)).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'test-user';
      
      // Fill up the limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkLimit(identifier);
      }
      
      // Next request should throw
      expect(() => rateLimiter.checkLimit(identifier)).toThrow(McpError);
    });

    it('should track different identifiers separately', () => {
      const id1 = 'user1';
      const id2 = 'user2';
      
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.checkLimit(id1)).toBe(true);
        expect(rateLimiter.checkLimit(id2)).toBe(true);
      }
    });

    it('should enforce global rate limit', () => {
      // Try to exceed global limit
      let errorThrown = false;
      
      try {
        for (let i = 0; i < 2000; i++) {
          rateLimiter.checkLimit(`user-${i}`);
        }
      } catch (error) {
        errorThrown = true;
        expect(error).toBeInstanceOf(McpError);
      }
      
      expect(errorThrown).toBe(true);
    });
  });

  describe('SessionManager', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    it('should create unique sessions', () => {
      const session1 = sessionManager.createSession('user1');
      const session2 = sessionManager.createSession('user2');
      
      expect(session1).toHaveLength(64);
      expect(session2).toHaveLength(64);
      expect(session1).not.toBe(session2);
    });

    it('should validate active sessions', () => {
      const sessionId = sessionManager.createSession();
      expect(sessionManager.validateSession(sessionId)).toBe(true);
    });

    it('should reject invalid sessions', () => {
      expect(sessionManager.validateSession('invalid-session')).toBe(false);
    });

    it('should destroy sessions', () => {
      const sessionId = sessionManager.createSession();
      expect(sessionManager.validateSession(sessionId)).toBe(true);
      
      sessionManager.destroySession(sessionId);
      expect(sessionManager.validateSession(sessionId)).toBe(false);
    });

    it('should handle session timeout', () => {
      const sessionId = sessionManager.createSession();
      const session = (sessionManager as any).sessions.get(sessionId);
      
      // Mock expired session
      if (session) {
        session.lastActivity = Date.now() - 2000000; // Over 30 minutes ago
      }
      
      expect(sessionManager.validateSession(sessionId)).toBe(false);
    });
  });

  describe('AuditLogger', () => {
    let auditLogger: AuditLogger;

    beforeEach(() => {
      auditLogger = new AuditLogger();
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log security events', () => {
      auditLogger.log('INFO', 'User login', 'user1', { ip: '192.168.1.1' });
      auditLogger.log('WARNING', 'Failed login attempt', undefined, { ip: '10.0.0.1' });
      auditLogger.log('ERROR', 'Unauthorized access attempt', 'user2');
      
      const logs = auditLogger.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter logs by level', () => {
      auditLogger.log('INFO', 'Info event');
      auditLogger.log('WARNING', 'Warning event');
      auditLogger.log('ERROR', 'Error event');
      
      const errorLogs = auditLogger.getLogs('ERROR');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('ERROR');
    });

    it('should sanitize sensitive data in logs', () => {
      auditLogger.log('INFO', 'Login', 'user1', {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        data: 'safe-data'
      });
      
      const logs = auditLogger.getLogs();
      expect(logs[0].details.password).toBe('[REDACTED]');
      expect(logs[0].details.token).toBe('[REDACTED]');
      expect(logs[0].details.data).toBe('safe-data');
    });

    it('should log critical events to console', () => {
      auditLogger.log('CRITICAL', 'Security breach detected');
      expect(console.error).toHaveBeenCalledWith(
        '[SECURITY CRITICAL] Security breach detected',
        '(details hidden)'
      );
    });
  });

  describe('PasswordValidator', () => {
    it('should validate strong passwords', () => {
      const result = PasswordValidator.validate('MyStr0ng\!Password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const tests = [
        { password: 'short', error: 'at least 12 characters' },
        { password: 'nouppercase123\!', error: 'uppercase letter' },
        { password: 'NoNumbers\!Here', error: 'one number' },
        { password: 'NoSpecialChar123', error: 'special character' },
        { password: 'password123\!ABC', error: 'common patterns' }
      ];
      
      tests.forEach(test => {
        const result = PasswordValidator.validate(test.password);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes(test.error))).toBe(true);
      });
    });

    it('should hash and verify passwords', () => {
      const password = 'MySecurePassword123\!';
      const hash = PasswordValidator.hash(password);
      
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      expect(PasswordValidator.verify(password, hash)).toBe(true);
      expect(PasswordValidator.verify('WrongPassword', hash)).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const password = 'TestPassword123\!';
      const hash = PasswordValidator.hash(password);
      
      // Timing-safe comparison should prevent timing attacks
      const start1 = Date.now();
      PasswordValidator.verify('WrongPassword1', hash);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      PasswordValidator.verify('WrongPassword2', hash);
      const time2 = Date.now() - start2;
      
      // Times should be similar (within reasonable variance)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe('Integration Tests', () => {
    it('should handle authentication flow securely', () => {
      const tokenManager = new TokenManager();
      const sessionManager = new SessionManager();
      const auditLogger = new AuditLogger();
      
      // Generate token
      const token = tokenManager.generateToken();
      tokenManager.storeToken(token, 'user1');
      
      // Validate token
      expect(tokenManager.validateToken(token)).toBe(true);
      
      // Create session
      const sessionId = sessionManager.createSession('user1');
      
      // Generate CSRF token
      const csrfToken = tokenManager.generateCSRFToken(sessionId);
      
      // Log authentication
      auditLogger.log('INFO', 'User authenticated', 'user1');
      
      // Validate CSRF for state-changing operation
      expect(tokenManager.validateCSRFToken(sessionId, csrfToken)).toBe(true);
    });

    it('should prevent common attack vectors', () => {
      // XSS attempt
      const xssPayload = '<script>alert("XSS")</script>';
      const sanitized = InputValidator.sanitizeHTML(xssPayload);
      expect(sanitized).not.toContain('<script>');
      
      // SQL injection attempt
      const sqlPayload = "' OR '1'='1";
      const sqlSanitized = InputValidator.sanitizeSQL(sqlPayload);
      expect(sqlSanitized).not.toContain("'");
      
      // Path traversal attempt
      const pathPayload = '../../../etc/passwd';
      expect(InputValidator.validatePath(pathPayload)).toBe(false);
      
      // SSRF attempt
      const ssrfPayload = 'http://localhost/admin';
      expect(InputValidator.validateURL(ssrfPayload)).toBe(false);
    });
  });
});
