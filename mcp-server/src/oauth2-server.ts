/**
 * OAuth2 Server Implementation for Home Assistant MCP
 * Enables Claude Desktop to authenticate via OAuth2 flow
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import { HomeAssistantWebSocket } from './websocket-client';
import { AuditLogger } from './security';

interface OAuth2Config {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  homeassistant_url: string;
  port: number;
}

interface AuthorizationCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  expires_at: number;
  user_token?: string;
}

interface AccessToken {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export class OAuth2Server {
  private httpServer!: ReturnType<typeof createServer>;
  private config: OAuth2Config;
  private authCodes = new Map<string, AuthorizationCode>();
  private accessTokens = new Map<string, AccessToken>();
  private refreshTokens = new Map<string, { access_token: string; client_id: string }>();
  private auditLogger: AuditLogger;
  private haUrl: string;

  constructor(config: Partial<OAuth2Config> = {}) {
    this.config = {
      client_id: process.env.OAUTH_CLIENT_ID || 'mcp-claude-desktop',
      client_secret: process.env.OAUTH_CLIENT_SECRET || this.generateSecret(),
      redirect_uri: process.env.OAUTH_REDIRECT_URI || 'https://claude.ai/api/mcp/auth_callback',
      homeassistant_url: process.env.HOMEASSISTANT_BASE_URL || 'http://homeassistant.local:8123',
      port: parseInt(process.env.OAUTH_PORT || '8089', 10),
      ...config
    };

    this.haUrl = this.config.homeassistant_url;
    this.auditLogger = new AuditLogger();
    this.setupHTTPServer();
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private setupHTTPServer() {
    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for Claude Desktop
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      
      try {
        // OAuth2 Authorization Endpoint
        if (url.pathname === '/oauth/authorize' && req.method === 'GET') {
          await this.handleAuthorize(req, res, url);
        }
        // OAuth2 Token Endpoint
        else if (url.pathname === '/oauth/token' && req.method === 'POST') {
          await this.handleToken(req, res);
        }
        // OAuth2 Introspection Endpoint
        else if (url.pathname === '/oauth/introspect' && req.method === 'POST') {
          await this.handleIntrospect(req, res);
        }
        // OAuth2 Revocation Endpoint
        else if (url.pathname === '/oauth/revoke' && req.method === 'POST') {
          await this.handleRevoke(req, res);
        }
        // OAuth2 Discovery Document
        else if (url.pathname === '/.well-known/oauth-authorization-server') {
          await this.handleDiscovery(req, res);
        }
        // Client Registration Endpoint (for dynamic registration)
        else if (url.pathname === '/oauth/register' && req.method === 'POST') {
          await this.handleClientRegistration(req, res);
        }
        // Health check
        else if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', oauth2: true }));
        }
        else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      } catch (error: any) {
        console.error('[OAuth2 Server] Error:', error);
        this.auditLogger.log('ERROR', 'OAuth2 request failed', undefined, { 
          path: url.pathname,
          error: error.message 
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error' }));
      }
    });
  }

  private async handleAuthorize(req: IncomingMessage, res: ServerResponse, url: URL) {
    const client_id = url.searchParams.get('client_id');
    const redirect_uri = url.searchParams.get('redirect_uri');
    const response_type = url.searchParams.get('response_type');
    const state = url.searchParams.get('state');
    const scope = url.searchParams.get('scope') || 'read write';

    // Validate request
    if (!client_id || !redirect_uri || response_type !== 'code') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_request' }));
      return;
    }

    // In production, this would redirect to HA login page
    // For now, we'll generate an auth code directly
    const authCode = crypto.randomBytes(16).toString('hex');
    
    this.authCodes.set(authCode, {
      code: authCode,
      client_id,
      redirect_uri,
      expires_at: Date.now() + 600000, // 10 minutes
    });

    this.auditLogger.log('INFO', 'Authorization code generated', undefined, { client_id });

    // Redirect back to client with auth code
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set('code', authCode);
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }

    res.writeHead(302, { Location: callbackUrl.toString() });
    res.end();
  }

  private async handleToken(req: IncomingMessage, res: ServerResponse) {
    const body = await this.parseBody(req);
    const grant_type = body.grant_type;

    if (grant_type === 'authorization_code') {
      await this.handleAuthCodeGrant(body, res);
    } else if (grant_type === 'refresh_token') {
      await this.handleRefreshTokenGrant(body, res);
    } else if (grant_type === 'client_credentials') {
      await this.handleClientCredentialsGrant(body, res);
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
    }
  }

  private async handleAuthCodeGrant(body: any, res: ServerResponse) {
    const { code, client_id, client_secret, redirect_uri } = body;

    // Validate client credentials
    if (client_id !== this.config.client_id || client_secret !== this.config.client_secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client' }));
      return;
    }

    // Validate auth code
    const authCode = this.authCodes.get(code);
    if (!authCode || authCode.expires_at < Date.now()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant' }));
      return;
    }

    // Validate redirect URI
    if (authCode.redirect_uri !== redirect_uri) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant' }));
      return;
    }

    // Generate tokens
    const access_token = crypto.randomBytes(32).toString('hex');
    const refresh_token = crypto.randomBytes(32).toString('hex');
    
    const tokenData: AccessToken = {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: 'read write'
    };

    this.accessTokens.set(access_token, tokenData);
    this.refreshTokens.set(refresh_token, { access_token, client_id });
    
    // Clean up auth code
    this.authCodes.delete(code);

    this.auditLogger.log('INFO', 'Access token issued', undefined, { client_id });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tokenData));
  }

  private async handleRefreshTokenGrant(body: any, res: ServerResponse) {
    const { refresh_token, client_id, client_secret } = body;

    // Validate client credentials
    if (client_id !== this.config.client_id || client_secret !== this.config.client_secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client' }));
      return;
    }

    // Validate refresh token
    const tokenData = this.refreshTokens.get(refresh_token);
    if (!tokenData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant' }));
      return;
    }

    // Revoke old access token
    this.accessTokens.delete(tokenData.access_token);

    // Generate new access token
    const new_access_token = crypto.randomBytes(32).toString('hex');
    
    const newTokenData: AccessToken = {
      access_token: new_access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write'
    };

    this.accessTokens.set(new_access_token, newTokenData);
    this.refreshTokens.set(refresh_token, { access_token: new_access_token, client_id });

    this.auditLogger.log('INFO', 'Token refreshed', undefined, { client_id });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newTokenData));
  }

  private async handleClientCredentialsGrant(body: any, res: ServerResponse) {
    const { client_id, client_secret, scope } = body;

    // Validate client credentials
    if (client_id !== this.config.client_id || client_secret !== this.config.client_secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client' }));
      return;
    }

    // Generate access token (no refresh token for client credentials)
    const access_token = crypto.randomBytes(32).toString('hex');
    
    const tokenData: AccessToken = {
      access_token,
      refresh_token: '',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scope || 'read write'
    };

    this.accessTokens.set(access_token, tokenData);

    this.auditLogger.log('INFO', 'Client credentials token issued', undefined, { client_id });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    }));
  }

  private async handleIntrospect(req: IncomingMessage, res: ServerResponse) {
    const body = await this.parseBody(req);
    const { token, client_id, client_secret } = body;

    // Validate client credentials
    if (client_id !== this.config.client_id || client_secret !== this.config.client_secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client' }));
      return;
    }

    const tokenData = this.accessTokens.get(token);
    
    if (tokenData) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        active: true,
        scope: tokenData.scope,
        client_id: this.config.client_id,
        token_type: tokenData.token_type,
        exp: Math.floor(Date.now() / 1000) + tokenData.expires_in
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ active: false }));
    }
  }

  private async handleRevoke(req: IncomingMessage, res: ServerResponse) {
    const body = await this.parseBody(req);
    const { token, client_id, client_secret } = body;

    // Validate client credentials
    if (client_id !== this.config.client_id || client_secret !== this.config.client_secret) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client' }));
      return;
    }

    // Try to revoke as access token
    if (this.accessTokens.delete(token)) {
      this.auditLogger.log('INFO', 'Access token revoked', undefined, { client_id });
    }
    
    // Try to revoke as refresh token
    const refreshData = this.refreshTokens.get(token);
    if (refreshData) {
      this.accessTokens.delete(refreshData.access_token);
      this.refreshTokens.delete(token);
      this.auditLogger.log('INFO', 'Refresh token revoked', undefined, { client_id });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  private async handleDiscovery(req: IncomingMessage, res: ServerResponse) {
    const baseUrl = `http://${req.headers.host}`;
    
    const discovery = {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      introspection_endpoint: `${baseUrl}/oauth/introspect`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      introspection_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      revocation_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      code_challenge_methods_supported: ['S256', 'plain']
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(discovery));
  }

  private async handleClientRegistration(req: IncomingMessage, res: ServerResponse) {
    const body = await this.parseBody(req);
    
    // In production, this would validate and store client registration
    // For now, we'll return the configured client
    const response = {
      client_id: this.config.client_id,
      client_secret: this.config.client_secret,
      redirect_uris: [this.config.redirect_uri],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      client_name: body.client_name || 'Claude Desktop MCP Client',
      scope: 'read write'
    };

    this.auditLogger.log('INFO', 'Client registration requested', undefined, { 
      client_name: response.client_name 
    });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          // Handle both JSON and form-encoded data
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve(JSON.parse(body));
          } else {
            const params = new URLSearchParams(body);
            const obj: any = {};
            params.forEach((value, key) => obj[key] = value);
            resolve(obj);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  public validateAccessToken(token: string): boolean {
    return this.accessTokens.has(token);
  }

  public async start() {
    return new Promise<void>((resolve) => {
      this.httpServer.listen(this.config.port, '0.0.0.0', () => {
        console.log(`[OAuth2 Server] Server listening on http://0.0.0.0:${this.config.port}`);
        console.log('[OAuth2 Server] Discovery document:', `http://0.0.0.0:${this.config.port}/.well-known/oauth-authorization-server`);
        console.log('[OAuth2 Server] Client ID:', this.config.client_id);
        console.log('[OAuth2 Server] Client Secret:', this.config.client_secret);
        resolve();
      });
    });
  }

  public stop() {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  public getConfig() {
    return {
      client_id: this.config.client_id,
      client_secret: this.config.client_secret,
      authorization_endpoint: `/oauth/authorize`,
      token_endpoint: `/oauth/token`
    };
  }
}