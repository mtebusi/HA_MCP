/**
 * HomeAssistant OAuth2 Authentication Proxy
 * 
 * This module handles OAuth2 authentication by proxying to HomeAssistant's
 * native OAuth2 endpoints and validating tokens against HA's auth system.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

interface AuthConfig {
  port: number;
  homeassistant_url: string;
  client_id: string;
  redirect_uri: string;
}

export class HomeAssistantAuthProxy {
  private httpServer!: ReturnType<typeof createServer>;
  private config: AuthConfig;
  private readonly CLIENT_ID = 'https://claude.ai';
  private readonly REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';
  private haUrl: string;
  private supervisorToken: string;
  
  // Cache validated tokens for performance
  private tokenCache = new Map<string, { valid: boolean; expires: number; user?: string }>();

  constructor() {
    this.config = {
      port: parseInt(process.env.AUTH_PROXY_PORT || '8089', 10),
      homeassistant_url: this.getHomeAssistantUrl(),
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI
    };

    this.haUrl = this.config.homeassistant_url;
    this.supervisorToken = process.env.SUPERVISOR_TOKEN || '';
    
    this.setupHTTPServer();
  }

  private getHomeAssistantUrl(): string {
    // Try multiple sources for HA URL
    if (process.env.HOMEASSISTANT_BASE_URL) {
      return process.env.HOMEASSISTANT_BASE_URL;
    }
    
    // If running as add-on, use supervisor endpoint
    if (process.env.SUPERVISOR_TOKEN) {
      // External URL for OAuth2 redirects
      return process.env.EXTERNAL_URL || 'http://homeassistant.local:8123';
    }
    
    return 'http://homeassistant.local:8123';
  }

  private setupHTTPServer() {
    this.httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // CORS headers for Claude Desktop
      res.setHeader('Access-Control-Allow-Origin', 'https://claude.ai');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://${req.headers.host}`);
      
      try {
        // OAuth2 Discovery Document - Critical for Claude Desktop
        if (url.pathname === '/.well-known/oauth-authorization-server' || 
            url.pathname === '/.well-known/openid-configuration') {
          await this.handleDiscovery(req, res);
        }
        // Client Registration Info for Claude Desktop
        else if (url.pathname === '/auth/client_info') {
          await this.handleClientInfo(req, res);
        }
        // Proxy OAuth2 authorize to HA
        else if (url.pathname === '/auth/authorize') {
          await this.proxyAuthorize(req, res, url);
        }
        // Proxy OAuth2 token to HA
        else if (url.pathname === '/auth/token') {
          await this.proxyToken(req, res);
        }
        // Token validation endpoint for MCP server
        else if (url.pathname === '/auth/validate') {
          await this.validateToken(req, res);
        }
        // Health check
        else if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'healthy', 
            ha_url: this.haUrl,
            oauth2: true 
          }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (error: any) {
        console.error('[Auth Proxy] Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', error_description: error.message }));
      }
    });
  }

  private async handleDiscovery(req: IncomingMessage, res: ServerResponse) {
    // Provide discovery document that points to HomeAssistant's OAuth2 endpoints
    const baseUrl = this.getExternalUrl(req);
    const haBaseUrl = this.haUrl;
    
    const discovery = {
      issuer: haBaseUrl,
      authorization_endpoint: `${baseUrl}/auth/authorize`,
      token_endpoint: `${baseUrl}/auth/token`,
      userinfo_endpoint: `${haBaseUrl}/auth/userinfo`,
      revocation_endpoint: `${haBaseUrl}/auth/revoke`,
      introspection_endpoint: `${baseUrl}/auth/validate`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'], // Public client
      scopes_supported: ['read', 'write'],
      // Important: Tell Claude Desktop about the client configuration
      client_id: this.CLIENT_ID,
      redirect_uris: [this.REDIRECT_URI],
      client_name: 'Claude Desktop MCP Connector',
      // Custom fields for MCP
      mcp_sse_endpoint: `${baseUrl.replace(':8089', ':6789')}/sse`,
      mcp_version: '1.0.7'
    };

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(JSON.stringify(discovery, null, 2));
  }

  private async handleClientInfo(req: IncomingMessage, res: ServerResponse) {
    // Provide client registration info for Claude Desktop
    const baseUrl = this.getExternalUrl(req);
    
    const clientInfo = {
      client_id: this.CLIENT_ID,
      client_name: 'Claude Desktop',
      redirect_uris: [this.REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'read write',
      token_endpoint_auth_method: 'none', // Public client, no secret
      // Instructions for Claude Desktop
      authorization_url: `${baseUrl}/auth/authorize?client_id=${encodeURIComponent(this.CLIENT_ID)}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&response_type=code&scope=read+write`,
      mcp_sse_url: `${baseUrl.replace(':8089', ':6789')}/sse`
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(clientInfo, null, 2));
  }

  private async proxyAuthorize(req: IncomingMessage, res: ServerResponse, url: URL) {
    // Build HA authorization URL
    const haAuthUrl = new URL('/auth/authorize', this.haUrl);
    
    // Copy all query parameters
    url.searchParams.forEach((value, key) => {
      haAuthUrl.searchParams.set(key, value);
    });
    
    // Ensure correct client_id and redirect_uri
    haAuthUrl.searchParams.set('client_id', this.CLIENT_ID);
    haAuthUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    
    console.log('[Auth Proxy] Redirecting to HA auth:', haAuthUrl.toString());
    
    // Redirect to HomeAssistant's authorization page
    res.writeHead(302, { 
      'Location': haAuthUrl.toString(),
      'Cache-Control': 'no-store'
    });
    res.end();
  }

  private async proxyToken(req: IncomingMessage, res: ServerResponse) {
    // Parse request body
    const body = await this.parseBody(req);
    
    // Forward to HomeAssistant's token endpoint
    const haTokenUrl = new URL('/auth/token', this.haUrl);
    
    try {
      const response = await this.makeRequest(haTokenUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ...body,
          client_id: this.CLIENT_ID
        }).toString()
      });

      const data = await response.json();
      
      if (response.ok) {
        // Cache the token for validation
        if (data.access_token) {
          this.tokenCache.set(data.access_token, {
            valid: true,
            expires: Date.now() + (data.expires_in || 1800) * 1000,
            user: data.user
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else {
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('[Auth Proxy] Token exchange error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'server_error',
        error_description: 'Failed to exchange token with HomeAssistant'
      }));
    }
  }

  private async validateToken(req: IncomingMessage, res: ServerResponse) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false, error: 'missing_token' }));
      return;
    }

    const token = authHeader.substring(7);
    
    // Check cache first
    const cached = this.tokenCache.get(token);
    if (cached) {
      if (cached.expires > Date.now()) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          valid: cached.valid,
          user: cached.user 
        }));
        return;
      } else {
        this.tokenCache.delete(token);
      }
    }

    // Validate with HomeAssistant
    try {
      const haUrl = new URL('/api/', this.haUrl);
      const response = await this.makeRequest(haUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const valid = response.ok;
      
      // Cache the result
      this.tokenCache.set(token, {
        valid,
        expires: Date.now() + 300000, // Cache for 5 minutes
        user: valid ? 'ha_user' : undefined
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid }));
    } catch (error) {
      console.error('[Auth Proxy] Token validation error:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid: false }));
    }
  }

  private async makeRequest(url: string, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.request(url, {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'MCP-Server/1.0.7'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode! >= 200 && res.statusCode! < 300,
              status: res.statusCode,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data)
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
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

  private getExternalUrl(req: IncomingMessage): string {
    // Try to determine the external URL for OAuth2 callbacks
    if (process.env.EXTERNAL_URL) {
      return process.env.EXTERNAL_URL.replace(/:\d+$/, `:${this.config.port}`);
    }
    
    const host = req.headers.host || `localhost:${this.config.port}`;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${host}`;
  }

  public async start() {
    return new Promise<void>((resolve) => {
      this.httpServer.listen(this.config.port, '0.0.0.0', () => {
        console.log(`[Auth Proxy] OAuth2 proxy listening on port ${this.config.port}`);
        console.log(`[Auth Proxy] Discovery: http://localhost:${this.config.port}/.well-known/oauth-authorization-server`);
        console.log(`[Auth Proxy] Client Info: http://localhost:${this.config.port}/auth/client_info`);
        console.log(`[Auth Proxy] HomeAssistant URL: ${this.haUrl}`);
        resolve();
      });
    });
  }

  public stop() {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  public validateAccessToken(token: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Check cache
      const cached = this.tokenCache.get(token);
      if (cached && cached.expires > Date.now()) {
        resolve(cached.valid);
        return;
      }

      // Validate with HA
      try {
        const haUrl = new URL('/api/', this.haUrl);
        const response = await this.makeRequest(haUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const valid = response.ok;
        
        // Cache result
        this.tokenCache.set(token, {
          valid,
          expires: Date.now() + 300000,
          user: valid ? 'ha_user' : undefined
        });

        resolve(valid);
      } catch (error) {
        console.error('[Auth Proxy] Validation error:', error);
        resolve(false);
      }
    });
  }
}