import type { MCPTool } from "@/types/mcp";
import type { GenaiToolDef } from "./types";

export function toGenaiTool(tool: MCPTool): GenaiToolDef {
    return {
        name: tool.name,
        description: tool.description || '',
        schema: {
            type: 'object',
            properties: tool.schema.properties,
            required: tool.schema.required || [],
        },
    };
}