import type { GenaiChatRequest, GenaiChatResponse, GenaiStreamEventPayload, GenaiToolCall } from "@/ipc/genai/types";
import {safeInvoke} from "@/utils";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function streamMessage(args: GenaiChatRequest): Promise<void> {
    await safeInvoke("stream_message", {
        request: args
    });
}

export async function sendMessage(args: GenaiChatRequest): Promise<GenaiChatResponse|null> {
    return await safeInvoke<GenaiChatResponse>("send_message", {
        request: args
    });
}

interface EventCallback {
    onChunk({chunk, accumulated}: {chunk: string, accumulated: string}): void;
    onReasoning(reasoning: string): void;
    onToolCall(toolCall: GenaiToolCall): Promise<void>;
    onEnd({tool_calls, final_response}: {tool_calls: GenaiToolCall[], final_response: string}): Promise<void>;
    onError(error: string): Promise<void>;
}

export async function listenToStream({ onChunk, onReasoning, onToolCall, onEnd, onError }: EventCallback): Promise<UnlistenFn> {
    return await listen<GenaiStreamEventPayload>('genai-stream-event', async (event) => {
        const streamEvent = event.payload;
        
        switch (streamEvent.event_type) {
          case 'Chunk':
            onChunk({
                chunk: streamEvent.data.content, 
                accumulated: streamEvent.data.accumulated
            });
            break;

          case 'Reasoning':
            onReasoning(streamEvent.data.content);
            break;

          case 'ToolCall':
            if(streamEvent.data.tool_call) {
                await onToolCall(streamEvent.data.tool_call);
            }
            break;
            
          case 'End':
            await onEnd({
                tool_calls: streamEvent.data.tool_calls || [], 
                final_response: streamEvent.data.final_response || ''
            });
            break;
            
          case 'Error':
            await onError(streamEvent.data.content);
            break;
        }
    });
}