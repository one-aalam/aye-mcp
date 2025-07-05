import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { MCPConfigFile, MCPServerConfig, MCPConfigManager } from '@/types/mcp-config';

export class MCPConfigManagerImpl implements MCPConfigManager {
  private readonly configFileName = 'aye_mcp_config.json';
  private configPath: string | null = null;

  async initialize(): Promise<void> {
    try {
      const dataDir = await appDataDir();
      this.configPath = await join(dataDir, this.configFileName);
      
      // Ensure the app data directory exists
      await mkdir(dataDir, { recursive: true });
      
      console.log(`MCP config path: ${this.configPath}`);
    } catch (error) {
      console.error('Failed to initialize MCP config manager:', error);
      throw new Error('Failed to initialize MCP config manager');
    }
  }

  async loadConfig(): Promise<MCPConfigFile> {
    if (!this.configPath) {
      await this.initialize();
    }

    try {
      const configExists = await exists(this.configPath!, { baseDir: BaseDirectory.AppData });
      
      if (!configExists) {
        console.log('MCP config file not found, creating default config');
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }

      const configContent = await readTextFile(this.configPath!, { baseDir: BaseDirectory.AppData });
      const config = JSON.parse(configContent) as MCPConfigFile;
      
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        console.warn('Invalid MCP config detected, using default:', validation.errors);
        const defaultConfig = this.getDefaultConfig();
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }

      console.log('MCP config loaded successfully');
      return config;
    } catch (error) {
      console.error('Failed to load MCP config:', error);
      const defaultConfig = this.getDefaultConfig();
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  async saveConfig(config: MCPConfigFile): Promise<void> {
    if (!this.configPath) {
      await this.initialize();
    }

    try {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
      }

      const configContent = JSON.stringify(config, null, 2);
      await writeTextFile(this.configPath!, configContent, { baseDir: BaseDirectory.AppData });
      
      console.log('MCP config saved successfully');
    } catch (error) {
      console.error('Failed to save MCP config:', error);
      throw new Error('Failed to save MCP config');
    }
  }

  getDefaultConfig(): MCPConfigFile {
    return {
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: [
            '-y',
            '@modelcontextprotocol/server-filesystem',
            '/Users/username/Desktop',
            '/Users/username/Downloads'
          ],
          description: 'File system operations server',
          enabled: true,
          timeout: 30000,
          retries: 3
        },
        brave_search: {
          command: 'npx',
          args: [
            '-y',
            '@modelcontextprotocol/server-brave-search'
          ],
          description: 'Web search capabilities',
          enabled: false, // Disabled by default as it requires API key
          timeout: 15000,
          retries: 2,
          env: {
            BRAVE_API_KEY: 'your-api-key-here'
          }
        },
        github: {
          command: 'npx',
          args: [
            '-y',
            '@modelcontextprotocol/server-github'
          ],
          description: 'GitHub integration server',
          enabled: false, // Disabled by default as it requires auth
          timeout: 20000,
          retries: 2,
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: 'your-token-here'
          }
        }
      },
      globalSettings: {
        timeout: 30000,
        retries: 3,
        logLevel: 'info',
        enableMetrics: true
      }
    };
  }

  validateConfig(config: MCPConfigFile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate top-level structure
    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return { valid: false, errors };
    }

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      errors.push('mcpServers must be an object');
      return { valid: false, errors };
    }

    // Validate each server configuration
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      const serverErrors = this.validateServerConfig(serverName, serverConfig);
      errors.push(...serverErrors);
    }

    // Validate global settings if present
    if (config.globalSettings) {
      const globalErrors = this.validateGlobalSettings(config.globalSettings);
      errors.push(...globalErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateServerConfig(serverName: string, config: MCPServerConfig): string[] {
    const errors: string[] = [];

    if (!config.command || typeof config.command !== 'string') {
      errors.push(`Server '${serverName}': command must be a non-empty string`);
    }

    if (!Array.isArray(config.args)) {
      errors.push(`Server '${serverName}': args must be an array`);
    } else {
      for (const arg of config.args) {
        if (typeof arg !== 'string') {
          errors.push(`Server '${serverName}': all args must be strings`);
          break;
        }
      }
    }

    if (config.env && typeof config.env !== 'object') {
      errors.push(`Server '${serverName}': env must be an object`);
    }

    if (config.cwd && typeof config.cwd !== 'string') {
      errors.push(`Server '${serverName}': cwd must be a string`);
    }

    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push(`Server '${serverName}': enabled must be a boolean`);
    }

    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push(`Server '${serverName}': timeout must be a positive number`);
    }

    if (config.retries !== undefined && (typeof config.retries !== 'number' || config.retries < 0)) {
      errors.push(`Server '${serverName}': retries must be a non-negative number`);
    }

    return errors;
  }

  private validateGlobalSettings(settings: any): string[] {
    const errors: string[] = [];

    if (settings.timeout !== undefined && (typeof settings.timeout !== 'number' || settings.timeout <= 0)) {
      errors.push('Global timeout must be a positive number');
    }

    if (settings.retries !== undefined && (typeof settings.retries !== 'number' || settings.retries < 0)) {
      errors.push('Global retries must be a non-negative number');
    }

    if (settings.logLevel !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(settings.logLevel)) {
        errors.push(`Global logLevel must be one of: ${validLevels.join(', ')}`);
      }
    }

    if (settings.enableMetrics !== undefined && typeof settings.enableMetrics !== 'boolean') {
      errors.push('Global enableMetrics must be a boolean');
    }

    return errors;
  }

  async addServer(name: string, config: MCPServerConfig): Promise<void> {
    const currentConfig = await this.loadConfig();
    currentConfig.mcpServers[name] = config;
    await this.saveConfig(currentConfig);
  }

  async removeServer(name: string): Promise<void> {
    const currentConfig = await this.loadConfig();
    delete currentConfig.mcpServers[name];
    await this.saveConfig(currentConfig);
  }

  async updateServer(name: string, config: Partial<MCPServerConfig>): Promise<void> {
    const currentConfig = await this.loadConfig();
    if (!currentConfig.mcpServers[name]) {
      throw new Error(`Server '${name}' not found`);
    }
    currentConfig.mcpServers[name] = { ...currentConfig.mcpServers[name], ...config };
    await this.saveConfig(currentConfig);
  }

  async enableServer(name: string): Promise<void> {
    await this.updateServer(name, { enabled: true });
  }

  async disableServer(name: string): Promise<void> {
    await this.updateServer(name, { enabled: false });
  }
}

// Singleton instance
export const mcpConfigManager = new MCPConfigManagerImpl();