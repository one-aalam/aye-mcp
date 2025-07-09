import type { ChatMessage } from "../../types";
import type { FunctionDefProperty } from "../../types/func";

export interface SimpleChatMessage extends Pick<ChatMessage, 'content' | 'role'> {}

export interface GenaiChatRequest {
    model: string;
    messages: SimpleChatMessage[];
    options?: GenaiChatOptions;
    tools?: GenaiToolDef[];
    context_id?: string;
    stream_config?: GenaiStreamConfig;
}

interface GenaiChatOptions {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}
  
interface GenaiResponseMetadata {
    timestamp: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    response_time_ms: number;
    streamed: boolean;
}

export interface GenaiChatResponse {
    message: string;
    model: string;
    metadata: GenaiResponseMetadata;
    tool_calls?: GenaiToolCall[];
}

export interface GenaiToolCall {
    call_id: string;
    fn_name: string;
    fn_arguments: Record<string, any>;
}

export interface GenaiToolDef {
    name: string;
    description: string;
    schema: {
        type: 'object';
        properties: Record<string, FunctionDefProperty>;
        required: string[];
    };
}

//
export interface GenaiStreamConfig {
    include_accumulated?: boolean;
    buffer_size?: number;
    timeout_ms?: number;
    capture_tool_calls?: boolean;
}

export type GenaiStreamEventType = "Start" | "Chunk" | "ToolCall" | "Reasoning" | "End" | "Error";

export interface GenaiStreamEventPayload {
    event_type: GenaiStreamEventType;
    stream_id: string;
    data: { content: string, tool_calls?: GenaiToolCall[], tool_call?: GenaiToolCall, final_response?: string, accumulated: string };
    timestamp: string;
}

// Provider config
export interface ProviderConfig {
    name: string;
    display_name: string;
    description: string;
    key_format: string;
    website: string;
    models: string[];
    is_configured: boolean;
}
