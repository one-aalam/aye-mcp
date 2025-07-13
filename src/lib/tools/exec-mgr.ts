import { MCP_SERVERS, parseMCPToolName } from "@/config";
import type { GenaiToolCall } from "@/ipc/genai/types";
import { mcpManager } from "@/mcp/mcp-manager";
import { get_current_weather } from "@/tools/impl";

const AVAILABLE_LOCAL_TOOLS: Record<string, Function> = {
  get_current_weather,
};

export class ToolExecutionManager {
    private executedToolCalls = new Map<string, any>();
    private toolResults = new Map<string, any>();
  
    addToolCall(toolCall: any): void {
      this.executedToolCalls.set(toolCall.call_id, toolCall);
    }
  
    addToolResult(toolCallId: string, result: any): void {
      this.toolResults.set(toolCallId, result);
    }
  
    hasToolResult(toolCallId: string): boolean {
      return this.toolResults.has(toolCallId);
    }
  
    getAllToolCalls(): any[] {
      return Array.from(this.executedToolCalls.values());
    }
  
    getAllResults(): Map<string, any> {
      return this.toolResults;
    }
  
    mergeEndToolCalls(endToolCalls: any[]): any[] {
      if (endToolCalls && endToolCalls.length > 0) {
        endToolCalls.forEach(toolCall => {
          if (!this.executedToolCalls.has(toolCall.call_id)) {
            this.addToolCall(toolCall);
          }
        });
      }
      return this.getAllToolCalls();
    }
  
    hasAnyToolCalls(): boolean {
      return this.executedToolCalls.size > 0;
    }

    getExecutedToolCall(toolCallId: string): any {
      if(!this.executedToolCalls.has(toolCallId)) {
        throw new Error(`Tool call ${toolCallId} not found`);
      }
      return this.executedToolCalls.get(toolCallId);
    }
  
    clear(): void {
      this.executedToolCalls.clear();
      this.toolResults.clear();
    }
}

export async function executeToolCall(toolCall: GenaiToolCall): Promise<any> {
  const toolName = toolCall.fn_name;
  const toolArgs = typeof toolCall.fn_arguments === 'string' 
      ? JSON.parse(toolCall.fn_arguments)
      : toolCall.fn_arguments || {}

  const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), 10000);
  });

  try {
    if(toolName.startsWith(MCP_SERVERS.TOOLS_PREFIX)) {
        const { serverId, toolName: actualToolName } = parseMCPToolName(toolName);
        const result = await Promise.race([
          mcpManager.callTool(serverId!, actualToolName, toolArgs),
          timeoutPromise
        ]);
        return JSON.stringify(result);
    } else {
        const functionToCall = AVAILABLE_LOCAL_TOOLS[toolName];
        if (functionToCall) {
          const result = await Promise.race([
              functionToCall(toolArgs),
              timeoutPromise
            ]);
          return JSON.stringify(result);
        } else {
          throw new Error(`Unknown tool: ${toolName}`);
        }
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function showToolExecutionFeedback(toolCall: any, status: 'executing' | 'success' | 'error') {
  // You could emit events to show tool execution status in the UI
  // For example, show a spinner next to "Checking weather..." 
  // or a checkmark when complete
}