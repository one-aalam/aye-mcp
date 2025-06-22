import type { ChatMessage } from "@/types";
import { loadDB } from "./db";

export const getChatMessages = async () => {
    const db = await loadDB();
    const result = await db.select<[{ id: string; role: string; content: string; attachments: string; created_at: string }]>('SELECT * FROM chat_message');
    return result;
}

export const addChatMessage = async (message: ChatMessage) => {
    const db = await loadDB();
    const result = await db.execute('INSERT INTO chat_message (id, role, content, attachments, created_at) VALUES ($1, $2, $3, $4, $5)', [
        message.id,
        message.role,
        message.content,
        message.attachments,
        message.timestamp,
    ]);
    return result;
}