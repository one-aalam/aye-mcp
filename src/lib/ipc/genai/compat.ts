import type { MCPToolSchema } from "@/types/mcp";
import type { GenaiToolDef } from "./types";

export function toGenaiTool(tool: MCPToolSchema): GenaiToolDef {
    return {
        name: tool.function.name,
        description: tool.function.description!,
        schema: {
            type: 'object',
            properties: tool.function.parameters.properties,
            required: tool.function.parameters.required || [],
        },
    };
}