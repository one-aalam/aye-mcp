import type { ChatMessage } from "@/types";
import { loadDB } from "./db";

export const getChatMessages = async () => {
    const db = await loadDB();
    const result = await db.execute('SELECT * FROM chat_message');
    return result;
}

export const addChatMessage = async (message: ChatMessage) => {
    const db = await loadDB();
    const result = await db.execute('INSERT INTO chat_message (id, role, parts, attachments, created_at) VALUES ($1, $2, $3, $4, $5)', [
        message.id,
        message.role,
        [{ type: 'text', text: message.content }],
        message.attachments,
        message.timestamp,
    ]);
    return result;
}