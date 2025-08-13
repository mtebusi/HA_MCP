import crypto from 'crypto';
import { AuthRequest, Session } from './types';

export class OAuth2Handler {
  private authRequests: Map<string, AuthRequest> = new Map();
  private authCodes: Map<string, string> = new Map();
  private sessions: Map<string, Session> = new Map();
  private refreshTokens: Map<string, string> = new Map();

  async storeAuthRequest(request: AuthRequest): Promise<string> {
    const requestId = crypto.randomUUID();
    this.authRequests.set(requestId, request);
    
    // Clean up after 10 minutes
    setTimeout(() => this.authRequests.delete(requestId), 600000);
    
    return requestId;
  }

  async getAuthRequest(requestId: string): Promise<AuthRequest | undefined> {
    return this.authRequests.get(requestId);
  }

  async createDirectAuthCode(): Promise<string> {
    // For ingress/direct connections
    const code = crypto.randomBytes(32).toString('base64url');
    const supervisorToken = process.env.SUPERVISOR_TOKEN || '';
    this.authCodes.set(code, supervisorToken);
    
    setTimeout(() => this.authCodes.delete(code), 60000);
    return code;
  }

  async createAuthorizationCode(haToken: string, clientId: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('base64url');
    this.authCodes.set(code, haToken);
    
    setTimeout(() => this.authCodes.delete(code), 60000);
    return code;
  }

  async exchangeCodeForToken(code: string, clientId: string) {
    const haToken = this.authCodes.get(code);
    if (!haToken) {
      throw new Error('Invalid authorization code');
    }
    
    this.authCodes.delete(code);
    
    const accessToken = crypto.randomBytes(32).toString('base64url');
    const refreshToken = crypto.randomBytes(32).toString('base64url');
    
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '3600') * 1000;
    
    this.sessions.set(accessToken, {
      haToken,
      userId: clientId,
      expires: Date.now() + sessionTimeout,
      type: 'authenticated'
    });
    
    this.refreshTokens.set(refreshToken, accessToken);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: sessionTimeout / 1000
    };
  }

  async refreshToken(refreshToken: string, clientId: string) {
    const oldAccessToken = this.refreshTokens.get(refreshToken);
    if (!oldAccessToken) {
      throw new Error('Invalid refresh token');
    }
    
    const session = this.sessions.get(oldAccessToken);
    if (!session) {
      throw new Error('Session not found');
    }
    
    this.sessions.delete(oldAccessToken);
    
    const newAccessToken = crypto.randomBytes(32).toString('base64url');
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '3600') * 1000;
    
    this.sessions.set(newAccessToken, {
      ...session,
      expires: Date.now() + sessionTimeout
    });
    
    this.refreshTokens.set(refreshToken, newAccessToken);
    
    return {
      access_token: newAccessToken,
      refresh_token: refreshToken,
      expires_in: sessionTimeout / 1000
    };
  }

  async validateToken(token: string): Promise<Session | null> {
    const session = this.sessions.get(token);
    
    if (!session || session.expires < Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    
    return session;
  }

  async createAnonymousSession(): Promise<Session> {
    // For zero-config operation
    return {
      userId: 'anonymous',
      expires: Date.now() + 3600000,
      type: 'anonymous'
    };
  }

  async createIngressSession(): Promise<Session> {
    // For ingress connections (pre-authenticated)
    return {
      haToken: process.env.SUPERVISOR_TOKEN,
      userId: 'ingress',
      expires: Date.now() + 86400000, // 24 hours
      type: 'ingress'
    };
  }

  // Clean up expired sessions periodically
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [token, session] of this.sessions) {
        if (session.expires < now) {
          this.sessions.delete(token);
        }
      }
    }, 60000); // Every minute
  }
}