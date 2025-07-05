export interface MCPServer {
    id: string;
    name: string;
    description?: string;
    endpoint: string;
    server_type: 'stdio' | 'websocket' | 'http';
    config: Record<string, unknown>;
    is_enabled: boolean;
    status: 'connected' | 'disconnected' | 'error' | 'connecting';
    last_connected_at?: string;
    tools?: MCPTool[];
    created_at: string;
    updated_at: string;
  }
  
  export interface MCPTool {
    id: string;
    server_id: string;
    name: string;
    description?: string;
    schema: MCPToolSchema;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface MCPToolSchema {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, MCPParameter>;
        required?: string[];
      };
    };
  }
  
  export interface MCPParameter {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
    items?: MCPParameter;
    properties?: Record<string, MCPParameter>;
    required?: string[];
  }
  
  export interface MCPToolCall {
    id: string;
    tool_name: string;
    server_id: string;
    parameters: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
    result?: unknown;
    error?: string;
    started_at: Date;
    completed_at?: Date;
    can_cancel?: boolean;
  }
  
  export interface MCPServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    transport?: {
      type: 'stdio' | 'websocket';
      host?: string;
      port?: number;
    };
  }
  
  export interface MCPMessage {
    jsonrpc: '2.0';
    id?: string | number;
    method?: string;
    params?: unknown;
    result?: unknown;
    error?: {
      code: number;
      message: string;
      data?: unknown;
    };
  }
  
  export interface MCPInitializeRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: 'initialize';
    params: {
      protocolVersion: string;
      capabilities: {
        tools?: {
          listChanged?: boolean;
        };
        resources?: {
          subscribe?: boolean;
          listChanged?: boolean;
        };
      };
      clientInfo: {
        name: string;
        version: string;
      };
    };
  }
  
  export interface MCPInitializeResponse {
    jsonrpc: '2.0';
    id: string | number;
    result: {
      protocolVersion: string;
      capabilities: {
        tools?: {
          listChanged?: boolean;
        };
        resources?: {
          subscribe?: boolean;
          listChanged?: boolean;
        };
      };
      serverInfo: {
        name: string;
        version: string;
      };
    };
  }
  
  export interface MCPListToolsRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: 'tools/list';
  }
  
  export interface MCPListToolsResponse {
    jsonrpc: '2.0';
    id: string | number;
    result: {
      tools: Array<{
        name: string;
        description?: string;
        inputSchema: {
          type: 'object';
          properties: Record<string, MCPParameter>;
          required?: string[];
        };
      }>;
    };
  }
  
  export interface MCPCallToolRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: 'tools/call';
    params: {
      name: string;
      arguments?: Record<string, unknown>;
    };
  }
  
  export interface MCPCallToolResponse {
    jsonrpc: '2.0';
    id: string | number;
    result: {
      content: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
      }>;
      isError?: boolean;
    };
  }
  
  export interface CreateMCPServerRequest {
    name: string;
    description?: string;
    endpoint: string;
    server_type: 'stdio' | 'websocket' | 'http';
    config: MCPServerConfig;
  }
  
  export interface UpdateMCPServerRequest {
    name?: string;
    description?: string;
    endpoint?: string;
    server_type?: 'stdio' | 'websocket' | 'http';
    config?: MCPServerConfig;
    is_enabled?: boolean;
  }
  
  export interface MCPConnectionError extends Error {
    code: 'CONNECTION_FAILED' | 'INITIALIZATION_FAILED' | 'TOOL_CALL_FAILED' | 'INVALID_RESPONSE';
    serverName?: string;
    details?: unknown;
  }
  
  // Server management events
  export type MCPServerEvent = 
    | { type: 'connected'; serverId: string }
    | { type: 'disconnected'; serverId: string }
    | { type: 'error'; serverId: string; error: string }
    | { type: 'tools_updated'; serverId: string; tools: MCPTool[] };