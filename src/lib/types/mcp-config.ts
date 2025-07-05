import type { MCPTool } from "./mcp";

export interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
    cwd?: string;
    enabled?: boolean;
    description?: string;
    timeout?: number;
    retries?: number;
  }
  
  export interface MCPConfigFile {
    mcpServers: Record<string, MCPServerConfig>;
    globalSettings?: {
      timeout?: number;
      retries?: number;
      logLevel?: 'debug' | 'info' | 'warn' | 'error';
      enableMetrics?: boolean;
    };
  }
  
  export interface MCPServerInstance {
    id: string;
    name: string;
    config: MCPServerConfig;
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastConnected?: Date;
    error?: string;
    tools?: MCPTool[];
  }
  
  export interface MCPConfigManager {
    loadConfig(): Promise<MCPConfigFile>;
    saveConfig(config: MCPConfigFile): Promise<void>;
    getDefaultConfig(): MCPConfigFile;
    validateConfig(config: MCPConfigFile): { valid: boolean; errors: string[] };
  }