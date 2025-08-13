import fs from 'fs';
import path from 'path';

interface Config {
  log_level: string;
  ssl: boolean;
  certfile?: string;
  keyfile?: string;
  allowed_origins?: string[];
  session_timeout: number;
  max_sessions: number;
  rate_limit: number;
  llm_hass_api?: string;
  custom_prompt?: string;
}

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(configPath = '/data/options.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    // Default configuration
    const defaults: Config = {
      log_level: 'info',
      ssl: false,
      session_timeout: 3600,
      max_sessions: 10,
      rate_limit: 100
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return { ...defaults, ...fileConfig };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }

    return defaults;
  }

  get(key: keyof Config): any {
    return this.config[key];
  }

  getAll(): Config {
    return { ...this.config };
  }

  async reload(): Promise<void> {
    this.config = this.loadConfig();
  }

  // Watch for configuration changes
  watchChanges(callback: () => void) {
    if (fs.existsSync(this.configPath)) {
      fs.watchFile(this.configPath, () => {
        console.log('Configuration file changed, reloading...');
        this.reload();
        callback();
      });
    }
  }

  // Environment variable overrides
  applyEnvironmentOverrides() {
    if (process.env.LOG_LEVEL) {
      this.config.log_level = process.env.LOG_LEVEL;
    }
    if (process.env.SSL_ENABLED === 'true') {
      this.config.ssl = true;
    }
    if (process.env.SESSION_TIMEOUT) {
      this.config.session_timeout = parseInt(process.env.SESSION_TIMEOUT);
    }
    if (process.env.MAX_SESSIONS) {
      this.config.max_sessions = parseInt(process.env.MAX_SESSIONS);
    }
    if (process.env.RATE_LIMIT) {
      this.config.rate_limit = parseInt(process.env.RATE_LIMIT);
    }
    if (process.env.ALLOWED_ORIGINS) {
      this.config.allowed_origins = process.env.ALLOWED_ORIGINS.split(',');
    }
    if (process.env.LLM_HASS_API) {
      this.config.llm_hass_api = process.env.LLM_HASS_API;
    }
    if (process.env.CUSTOM_PROMPT) {
      this.config.custom_prompt = process.env.CUSTOM_PROMPT;
    }
  }
}