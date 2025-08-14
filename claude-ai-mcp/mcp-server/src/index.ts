import express from 'express';
import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from './sse-transport';
import { HomeAssistantBridge } from './ha-bridge';
import { OAuth2Handler } from './auth';
import { LLMApiIntegration } from './llm-api';
import { setupTools } from './tools';
import { HealthMonitor } from './health-monitor';
import fs from 'fs';

class HomeAssistantMCPServer {
  private app: express.Application;
  private mcpServer!: McpServer;
  private haBridge: HomeAssistantBridge;
  private oauth: OAuth2Handler;
  private llmApi: LLMApiIntegration;
  private healthMonitor: HealthMonitor;
  private activeSessions: Map<string, any> = new Map();

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    this.haBridge = new HomeAssistantBridge();
    this.oauth = new OAuth2Handler();
    this.llmApi = new LLMApiIntegration(this.haBridge);
    this.healthMonitor = new HealthMonitor();
    
    this.initializeMCPServer();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private initializeMCPServer() {
    this.mcpServer = new McpServer({
      name: 'homeassistant',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });

    // Register standard tools
    setupTools(this.mcpServer, this.haBridge);
    
    // Register LLM API tools
    this.llmApi.registerTools(this.mcpServer);
  }

  private setupMiddleware() {
    // CORS middleware with smart defaults
    this.app.use((req, res, next) => {
      // Default allowed origins if not configured
      const defaultOrigins = [
        'https://claude.ai',
        'https://app.claude.ai',
        'https://mcp-proxy.anthropic.com'
      ];
      
      const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
      const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;
      
      const origin = req.headers.origin;
      
      // Allow ingress requests (no origin)
      if (!origin && req.headers['x-ingress-path']) {
        res.header('Access-Control-Allow-Origin', '*');
      } else if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Ingress-Path');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Request logging in debug mode
    if (process.env.LOG_LEVEL === 'debug') {
      this.app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
      });
    }
  }

  private setupRoutes() {
    // MCP Discovery endpoint
    this.app.get('/.well-known/mcp.json', (req, res) => {
      const protocol = req.secure || process.env.SSL_ENABLED === 'true' ? 'https' : 'http';
      const port = process.env.INGRESS_PORT || '8098';
      const host = req.get('host') || `localhost:${port}`;
      const baseUrl = `${protocol}://${host}`;
      
      res.json({
        version: '1.0',
        name: 'Home Assistant',
        description: 'Control your Home Assistant instance from Claude',
        type: 'remote',
        protocol: 'sse',
        endpoint: `${baseUrl}/mcp/sse`,
        auth: {
          type: 'optional', // Make auth optional for zero-config
          authorization_endpoint: `${baseUrl}/auth/authorize`,
          token_endpoint: `${baseUrl}/auth/token`,
          client_id: 'claude_desktop_mcp',
          scopes: ['control', 'read']
        },
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          llm: true
        },
        contact: {
          name: 'Matt Busi',
          url: 'https://github.com/mtebusi/ha-mcp'
        }
      });
    });

    // OAuth2 Authorization endpoint (optional)
    this.app.get('/auth/authorize', async (req, res) => {
      try {
        const { client_id, redirect_uri, state, scope } = req.query;
        
        // For ingress connections, use simplified auth
        if (req.headers['x-ingress-path']) {
          const code = await this.oauth.createDirectAuthCode();
          const redirectUrl = new URL(redirect_uri as string);
          redirectUrl.searchParams.set('code', code);
          redirectUrl.searchParams.set('state', state as string);
          return res.redirect(redirectUrl.toString());
        }
        
        // Store the OAuth request
        const requestId = await this.oauth.storeAuthRequest({
          client_id: client_id as string,
          redirect_uri: redirect_uri as string,
          state: state as string,
          scope: scope as string
        });
        
        // Use Home Assistant's OAuth flow
        const haAuthUrl = await this.haBridge.getAuthorizationUrl(requestId);
        res.redirect(haAuthUrl);
      } catch (error) {
        console.error('Authorization error:', error);
        res.status(400).json({ error: 'invalid_request' });
      }
    });

    // OAuth2 Token endpoint
    this.app.post('/auth/token', async (req, res) => {
      try {
        const { grant_type, code, client_id, refresh_token } = req.body;
        
        let token;
        if (grant_type === 'authorization_code') {
          token = await this.oauth.exchangeCodeForToken(code, client_id);
        } else if (grant_type === 'refresh_token') {
          token = await this.oauth.refreshToken(refresh_token, client_id);
        } else {
          return res.status(400).json({ error: 'unsupported_grant_type' });
        }
        
        res.json({
          access_token: token.access_token,
          token_type: 'Bearer',
          expires_in: token.expires_in || 3600,
          refresh_token: token.refresh_token
        });
      } catch (error) {
        console.error('Token error:', error);
        res.status(400).json({ error: 'invalid_grant' });
      }
    });

    // MCP SSE Endpoint (works with or without auth)
    this.app.get('/mcp/sse', async (req, res) => {
      try {
        // Check for authentication but don't require it
        let session = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          session = await this.oauth.validateToken(token);
        } else if (req.headers['x-ingress-path']) {
          // Ingress connections are pre-authenticated
          session = await this.oauth.createIngressSession();
        } else {
          // Create anonymous session for zero-config
          session = await this.oauth.createAnonymousSession();
        }

        // Set up SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        // Create SSE transport
        const transport = new SSEServerTransport(res, req);
        
        // Connect Home Assistant bridge
        if (session?.haToken) {
          await this.haBridge.connectWithToken(session.haToken);
        } else {
          await this.haBridge.connectWithSupervisor();
        }
        
        // Connect MCP server to transport
        await this.mcpServer.connect(transport);
        
        // Store session
        const sessionId = Date.now().toString();
        this.activeSessions.set(sessionId, {
          transport,
          session,
          startTime: Date.now()
        });

        // Send initial capabilities
        transport.sendEvent('ready', {
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            llm: true
          }
        });

        // Handle client disconnect
        req.on('close', () => {
          this.activeSessions.delete(sessionId);
          transport.close();
        });
        
      } catch (error) {
        console.error('SSE connection error:', error);
        res.status(500).json({ error: 'internal_server_error' });
      }
    });

    // Handle POST messages for SSE bidirectional communication
    this.app.post('/mcp/message', async (req, res) => {
      try {
        const { sessionId, message } = req.body;
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
          return res.status(404).json({ error: 'session_not_found' });
        }
        
        const response = await session.transport.handleMessage(message);
        res.json(response);
      } catch (error) {
        console.error('Message handling error:', error);
        res.status(500).json({ error: 'message_processing_failed' });
      }
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const health = await this.healthMonitor.getStatus();
      res.status(health.healthy ? 200 : 503).json(health);
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      const metrics = await this.healthMonitor.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    // Root redirect
    this.app.get('/', (req, res) => {
      res.redirect('/.well-known/mcp.json');
    });
  }

  async start() {
    const port = parseInt(process.env.INGRESS_PORT || '8098');
    const sslEnabled = process.env.SSL_ENABLED === 'true';
    
    if (sslEnabled && process.env.SSL_CERT && process.env.SSL_KEY) {
      const httpsServer = createServer({
        cert: fs.readFileSync(process.env.SSL_CERT),
        key: fs.readFileSync(process.env.SSL_KEY)
      }, this.app);
      
      httpsServer.listen(port, '0.0.0.0', () => {
        console.log(`MCP SSE Server running on https://0.0.0.0:${port}`);
        console.log(`Discovery endpoint: https://0.0.0.0:${port}/.well-known/mcp.json`);
      });
    } else {
      const httpServer = createHttpServer(this.app);
      httpServer.listen(port, '0.0.0.0', () => {
        console.log(`MCP SSE Server running on http://0.0.0.0:${port}`);
        console.log(`Discovery endpoint: http://0.0.0.0:${port}/.well-known/mcp.json`);
      });
    }
  }
}

// Start the server
const server = new HomeAssistantMCPServer();
server.start().catch(console.error);