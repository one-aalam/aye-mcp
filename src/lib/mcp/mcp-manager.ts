import { invoke } from '@tauri-apps/api/core';
import type { MCPTool, MCPServerEvent, MCPToolServerDef, MCPToolDef } from '@/types/mcp';
import { createConfigServerId, getServerName, ServerIdManager } from './server-id';
import { prepareMCPToolName } from '@/config';

export interface MCPConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPServerStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  tools: MCPTool[];
  error?: string;
  displayName?: string;
  type?: string;
}

export interface MCPToolCallRequest {
  server_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResponse {
  success: boolean;
  content: any[];
  error?: string;
}

export class MCPManager {
  private eventListeners = new Set<(event: MCPServerEvent) => void>();
  private servers = new Map<string, MCPServerStatus>();
  private pollingInterval: number | null = null;

  constructor(usePolling: boolean = false) {
    if (usePolling) {
      this.startStatusPolling();
    }
  }

  // Add a server using the Rust backend
  async addServer(config: MCPConfig): Promise<void> {
    try {
      await invoke('add_mcp_server', { config });
      // console.log(`Added MCP server: ${config.name}`);
      
      // Emit event
      this.emitEvent({
        type: 'connected',
        serverId: config.id
      });
    } catch (error) {
      console.error(`Failed to add MCP server ${config.name}:`, error);
      this.emitEvent({
        type: 'error',
        serverId: config.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Remove a server
  async removeServer(serverId: string): Promise<void> {
    try {
      await invoke('remove_mcp_server', { serverId });
      this.servers.delete(serverId);
      
      this.emitEvent({
        type: 'disconnected',
        serverId
      });
    } catch (error) {
      console.error(`Failed to remove MCP server ${serverId}:`, error);
      throw error;
    }
  }

  // Call a tool on a specific server
  async callTool(serverId: string, toolName: string, parameters: Record<string, unknown>): Promise<any> {
    try {
      const request: MCPToolCallRequest = {
        server_id: serverId,
        tool_name: toolName,
        arguments: parameters
      };

      const response: MCPToolCallResponse = await invoke('call_mcp_tool', { request });
      
      if (!response.success) {
        throw new Error(response.error || 'Tool call failed');
      }

      return response.content;
    } catch (error) {
      console.error(`Failed to call tool ${toolName} on server ${serverId}:`, error);
      throw error;
    }
  }

  async getServerStatus(serverName: string) {
    const serverId = createConfigServerId(serverName);
    return this.getServerStatusById(serverId);
  }

  // Get status of a specific server
  async getServerStatusById(serverId: string): Promise<MCPServerStatus | null> {
    try {
      const status: MCPServerStatus | null = await invoke('get_mcp_server_status', { serverId });
      
      if (status) {
        this.servers.set(serverId, status);
      }
      
      return status;
    } catch (error) {
      console.error(`Failed to get status for server ${serverId}:`, error);
      return null;
    }
  }

  // List all servers
  async listServers(): Promise<MCPServerStatus[]> {
    try {
      const servers: MCPServerStatus[] = await invoke('list_mcp_servers');
      
      // Update local cache
      servers.forEach(server => {
        this.servers.set(server.id, server);
      });
      
      // return servers;
      return servers.map(server => ({
        ...server,
        displayName: ServerIdManager.getServerDisplayName(server.id),
        isConfigServer: ServerIdManager.isConfigServer(server.id),
      }));
    } catch (error) {
      console.error('Failed to list MCP servers:', error);
      return [];
    }
  }

  // Get all available tools from all servers
  async getAllTools(): Promise<Array<MCPToolServerDef>> {
    try {
      const toolData = await invoke<Array<[string, MCPToolDef[]]>>('get_all_mcp_tools');
      
      return toolData.map(([serverId, tools]) => {
        const server = this.servers.get(serverId);
        return {
          serverId,
          serverName: server?.name || getServerName(serverId),
          tools: tools.map(tool => ({
            ...tool,
            serverId,
            name: prepareMCPToolName(serverId, tool.name),
          }))
        };
      });
    } catch (error) {
      console.error('Failed to get all tools:', error);
      return [];
    }
  }

  // Initialize servers from configuration
  async initializeFromConfig(configs: MCPConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      configs.map(config => this.addServer(config))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    console.log(`✅ MCP initialization complete: ${successful}/${results.length} servers started`); 
    if (failed > 0) {
      console.warn(`⚠️ MCP initialization completed with issues: ${failed}/${results.length} servers failed`);
    }
  }

  // Event handling
  addEventListener(listener: (event: MCPServerEvent) => void): void {
    this.eventListeners.add(listener);
  }

  removeEventListener(listener: (event: MCPServerEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  private emitEvent(event: MCPServerEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in MCP event listener:', error);
      }
    });
  }

  // Poll server status periodically
  private startStatusPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const servers = await this.listServers();
        
        // Check for status changes and emit events
        servers.forEach(server => {
          const previousServer = this.servers.get(server.id);
          
          if (previousServer && previousServer.status !== server.status) {
            switch (server.status) {
              case 'connected':
                this.emitEvent({ type: 'connected', serverId: server.id });
                if (server.tools.length > 0) {
                  this.emitEvent({ 
                    type: 'tools_updated', 
                    serverId: server.id, 
                    tools: server.tools 
                  });
                }
                break;
              case 'disconnected':
                this.emitEvent({ type: 'disconnected', serverId: server.id });
                break;
              case 'error':
                this.emitEvent({ 
                  type: 'error', 
                  serverId: server.id, 
                  error: server.error || 'Unknown error' 
                });
                break;
            }
          }
        });
      } catch (error) {
        console.error('Error polling server status:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  // Cleanup
  destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.eventListeners.clear();
  }
}

// Singleton instance
export const mcpManager = new MCPManager();