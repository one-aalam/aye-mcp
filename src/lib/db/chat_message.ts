import type { ChatMessage } from "@/types";
import { loadDB } from "./db";

interface ChatMessageDB extends Omit<ChatMessage, 'attachments' | 'thinking' | 'tool_calls' | 'metadata'> {
    attachments: string;
    thinking: string;
    tool_calls: string;
    metadata: string;
}

const toChatMessage = ({ attachments, thinking, tool_calls, metadata, created_at, updated_at,...rest }: ChatMessageDB): ChatMessage => ({
    ...rest,
    attachments: JSON.parse(attachments || '[]'),
    thinking: thinking ? JSON.parse(thinking || '{}') : undefined,
    tool_calls: JSON.parse(tool_calls || '[]'),
    metadata: JSON.parse(metadata || '{}'),
    created_at: new Date(created_at),
    updated_at: new Date(updated_at),
});

export const getChatMessages = async (): Promise<ChatMessage[]> => {
    const db = await loadDB();
    const result = await db.select<ChatMessageDB[]>('SELECT * FROM chat_messages');
    return result.map(toChatMessage);
}

export const addChatMessage = async (message: ChatMessage) => {
    const db = await loadDB();
    const result = await db.execute('INSERT INTO chat_messages (id, thread_id, role, content, attachments, thinking, tool_calls, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
        message.id,
        message.thread_id,
        message.role,
        message.content,
        message.attachments,
        message.thinking,
        message.tool_calls,
        message.metadata,
        message.created_at,
        message.updated_at,
    ]);
    return result;
}