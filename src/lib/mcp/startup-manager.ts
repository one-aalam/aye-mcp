// src/lib/mcp/simplified-startup-manager.ts
import { mcpConfigManager } from './config-manager';
import { mcpManager } from './mcp-manager';
import type { MCPConfigFile } from '@/types/mcp-config';
import type { MCPConfig } from './mcp-manager';
import { MCP_SERVERS } from '@/config';
import { ServerIdManager, createConfigServerId } from './server-id';

export interface StartupResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    serverName: string;
    serverId: string;
    success: boolean;
    error?: string;
  }>;
}

export class MCPStartupManager {
  private startupPromise: Promise<StartupResult> | null = null;

  async initializeFromConfig(): Promise<StartupResult> {
    // Prevent multiple simultaneous initializations
    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = this.performInitialization();
    try {
      return await this.startupPromise;
    } finally {
      this.startupPromise = null;
    }
  }

  private async performInitialization(): Promise<StartupResult> {
    console.log('Initializing MCP servers from configuration...');
    
    try {
      // Load configuration
      const config = await mcpConfigManager.loadConfig();
      console.log(`Loaded MCP config with ${Object.keys(config.mcpServers).length} servers`);

      // Convert config to simplified format
      const serverConfigs = this.convertConfigToServerConfigs(config);
      
      if (serverConfigs.length === 0) {
        console.log('No enabled MCP servers found in configuration');
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      console.log(`Found ${serverConfigs.length} enabled servers to initialize`);

      // Initialize servers using the simplified manager
      const results = await this.initializeServers(serverConfigs);
      
      console.log(`MCP initialization complete: ${results.successful}/${results.total} servers started successfully`);
      
      return results;
    } catch (error) {
      console.error('Failed to initialize MCP servers:', error);
      throw error;
    }
  }

  private convertConfigToServerConfigs(config: MCPConfigFile): MCPConfig[] {
    return Object.entries(config.mcpServers)
      .filter(([_, serverConfig]) => serverConfig.enabled !== false)
      .map(([serverName, serverConfig]) => {
        // Use robust server ID creation
        const serverId = createConfigServerId(serverName);
        // Register the server mapping
        ServerIdManager.registerServer(serverId, serverName, 'config');
        return {
          id: serverId,
          name: serverName,
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env || {},
          cwd: serverConfig.cwd,
        };
    });
  }

  private async initializeServers(configs: MCPConfig[]): Promise<StartupResult> {
    const results: StartupResult = {
      total: configs.length,
      successful: 0,
      failed: 0,
      results: []
    };

    // Initialize servers one by one to avoid overwhelming the system
    for (const config of configs) {
      try {
        await mcpManager.addServer(config);        
        // Wait a moment for the server to start
        await new Promise(resolve => setTimeout(resolve, MCP_SERVERS.STARTUP_WAIT_TIME));
        
        // Check if server is actually connected
        const status = await mcpManager.getServerStatus(config.id);
        
        if (status && status.status === 'connected') {
          results.successful++;
          results.results.push({
            serverName: config.name,
            serverId: config.id,
            success: true
          });
          console.log(`✅ Successfully initialized MCP server: ${config.name}`);
        } else {
          throw new Error(`Server failed to connect: ${status?.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to initialize MCP server ${config.name}:`, error);
        
        results.failed++;
        results.results.push({
          serverName: config.name,
          serverId: config.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Clean up failed server registration
        ServerIdManager.unregisterServer(config.id);
      }
    }

    return results;
  }

  // Reload configuration and restart servers
  async reloadConfiguration(): Promise<StartupResult> {
    console.log('Reloading MCP configuration...');
    
    // Get current servers and shut them down
    const currentServers = await mcpManager.listServers();
    for (const server of currentServers) {
      try {
        await mcpManager.removeServer(server.id);
        // Unregister from ID manager
        ServerIdManager.unregisterServer(server.id);
      } catch (error) {
        console.warn(`Failed to remove server ${server.name}:`, error);
      }
    }
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize from config
    return this.initializeFromConfig();
  }

  // Add a server to configuration and start it
  async addServerToConfig(name: string, config: any): Promise<void> {
    // Validate server name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Server name is required and must be a non-empty string');
    }
    const trimmedName = name.trim();
    
    // Create robust server ID
    const serverId = createConfigServerId(trimmedName);

    // Check for conflicts
    const existingServers = await mcpManager.listServers();
    if (existingServers.some(s => s.id === serverId)) {
      throw new Error(`Server with name "${trimmedName}" already exists`);
    }

    // Add to configuration
    await mcpConfigManager.addServer(name, config);
    
    const serverConfig: MCPConfig = {
      id: serverId,
      name: trimmedName,
      command: config.command,
      args: config.args,
      env: config.env || {},
      cwd: config.cwd,
    };

    // Register the mapping
    ServerIdManager.registerServer(serverId, trimmedName, 'config');

    try {
      await mcpManager.addServer(serverConfig);
    } catch (error) {
      // Clean up on failure
      ServerIdManager.unregisterServer(serverId);
      await mcpConfigManager.removeServer(trimmedName);
      throw error;
    }
  }

  // Remove a server from configuration and stop it
  async removeServerFromConfig(name: string): Promise<void> {
    const serverId = createConfigServerId(name);
    
    // Remove from running servers
    try {
      await mcpManager.removeServer(serverId);
    } catch (error) {
      console.warn(`Failed to stop server ${name}:`, error);
    }
    
    // Remove from config
    await mcpConfigManager.removeServer(name);
    // Unregister from ID manager
    ServerIdManager.unregisterServer(serverId);
  }
}

// Singleton instance
export const mcpStartupManager = new MCPStartupManager();