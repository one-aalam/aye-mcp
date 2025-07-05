import type { Tool } from "ollama";
import type { MCPTool } from "@/types/mcp";

export function toOllamaTool(tool: MCPTool): Tool {
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema || { type: 'object', properties: {} },
        },
    };
}