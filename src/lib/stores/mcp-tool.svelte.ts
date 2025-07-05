import { getContext, setContext } from "svelte";
import { mcpManager } from "@/mcp/mcp-manager";
import { prepareMCPToolName } from "@/config";
import type { MCPTool } from "@/types/mcp";

const MCP_TOOL_KEY = Symbol("mcp_tool");

export class MCPToolStore {
    tools = $state<MCPTool[]>([]);
    isLoading = $state(true);

    constructor() {
        this.tools = [];
    }

    loadTools = async () => {
        this.isLoading = true;
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
            this.isLoading = false;
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