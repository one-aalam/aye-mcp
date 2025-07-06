import { getContext, setContext } from "svelte";
import { mcpManager } from "@/mcp/mcp-manager";
import { prepareMCPToolName } from "@/config";
import type { MCPServerEvent, MCPTool } from "@/types/mcp";
import type { StartupResult } from "@/mcp/startup-manager";

const MCP_TOOL_KEY = Symbol("mcp_tool");

export class MCPToolStore {
    tools = $state<MCPTool[]>([]);
    isLoading = $state(false);
    isLoadingTools = $state(false);
    isInitialized = $state(false);
    initError = $state<string | null>(null);
    mcpInitResult = $state<StartupResult>({
    successful: 0,
    failed: 0,
    total: 0,
    results: []
  });

    constructor() {
        this.tools = [];
    }

    handleMCPServerEvents = (event: MCPServerEvent) => {
        switch (event.type) {
          case 'connected':
            console.log(`MCP server connected`, event);
            this.mcpInitResult.successful++;
            this.mcpInitResult.results.push({
              serverId: event.serverId,
              serverName: '',
              success: true,
              error: undefined
            });
            break;
          case 'disconnected':
            console.log(`MCP server disconnected`);
            break;
          case 'error':
            const errorEvent = event as any;
            this.mcpInitResult.failed++;
            this.mcpInitResult.results.push({
              serverId: errorEvent.serverId,
              serverName: '',
              success: false,
              error: errorEvent.error || 'Unknown error'
            });
            console.log(`MCP server error: ${errorEvent.error || 'Unknown error'}`);
            break;
          case 'tools_updated':
            const toolsEvent = event as any;
            console.log(`Tools updated for server ${toolsEvent.serverId}:`, toolsEvent.tools);
            break;
        }
    }

    loadTools = async () => {
        this.isLoadingTools = true;
        this.tools = [];

        try {
            const servers = await mcpManager.getAllTools();
            console.log(servers)
            const tools: MCPTool[] = [];
            // for (const server of servers) {
            //   if (server.is_enabled && server.status === 'connected' && server.tools) {
            //     tools.push(...server.tools.filter(tool => tool.is_enabled).map(tool => ({
            //       ...tool,
            //       serverId: server.id,
            //       serverName: server.name,
            //       type: 'mcp'
            //     })));
            //   }
            // }
      
            servers.forEach(server => {
              tools.push(...(server.tools.map(tool => ({
                ...tool,
                server_id: server.serverId,
                name: prepareMCPToolName(server.serverId, tool.name),
              }))));
            });
            this.tools = tools;
            console.log(`Loaded ${tools.length} MCP tools from ${servers.length} servers`);
        } catch (error) {
            console.error('Failed to load MCP tools:', error);
        } finally {
            this.isLoadingTools = false;
        }
    }

    initialize = async (totalServers: number) => {
        if(totalServers === 0) return;
        if(totalServers === this.mcpInitResult.successful) {
            this.isInitialized = true;
            this.mcpInitResult.total = totalServers;
            console.log('All MCP servers initialized successfully');
            await this.loadTools();
        }
    }
}

export const setMCPToolContext = () => {
    const mcpTool = new MCPToolStore();
    return setContext(MCP_TOOL_KEY, mcpTool);
}

export const getMCPToolContext = () => {
    return getContext<ReturnType<typeof setMCPToolContext>>(MCP_TOOL_KEY);
}   