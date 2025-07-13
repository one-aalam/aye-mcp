import type { ChatMessage, MessageListOptions, UpdateMessageRequest } from "@/types";
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

export const createMessage = async (message: ChatMessage) => {
    const db = await loadDB();
    const result = await db.execute(`INSERT INTO chat_messages (
            id, thread_id, parent_message_id, role, content, attachments, thinking, tool_calls, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
        message.id,
        message.thread_id,
        message.parent_message_id,
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
  
export const getMessage = async (id: string): Promise<ChatMessage | null> => {
    const db = await loadDB();
    
    const result = await db.select<ChatMessageDB[]>(
      'SELECT * FROM chat_messages WHERE id = $1',
      [id]
    );
  
    if (result.length === 0) return null;
  
    return toChatMessage(result[0]);
};

export const getLatestMessageByThread = async (threadId: string): Promise<ChatMessage | null> => {
    const db = await loadDB();
    
    const result = await db.select<ChatMessageDB[]>(
      'SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1',
      [threadId]
    );
  
    if (result.length === 0) return null;
  
    return toChatMessage(result[0]);
};

export const getMessagesByThread = async (
    threadId: string, 
    options: MessageListOptions = {}
): Promise<ChatMessage[]> => {
    const db = await loadDB();
    
    const {
      limit = 100,
      offset = 0,
      sort_order = 'asc'
    } = options;
  
    const result = await db.select<ChatMessageDB[]>(
      `SELECT * FROM chat_messages 
       WHERE thread_id = $1 
       ORDER BY created_at ${sort_order.toUpperCase()} 
       LIMIT $2 OFFSET $3`,
      [threadId, limit, offset]
    );
  
    return result.map(toChatMessage);
};

export const getMessageCountByThread = async (threadId: string): Promise<number> => {
    const db = await loadDB();
    
    const result = await db.select<[{ count: number }]>(
      'SELECT COUNT(*) as count FROM chat_messages WHERE thread_id = $1',
      [threadId]
    );
  
    return result[0].count;
};
  
export const updateMessage = async (id: string, data: UpdateMessageRequest): Promise<boolean> => {
    const db = await loadDB();
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
  
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    
    if (data.attachments !== undefined) {
      updates.push(`attachments = $${paramIndex++}`);
      values.push(JSON.stringify(data.attachments));
    }
    
    if (data.thinking !== undefined) {
      updates.push(`thinking = $${paramIndex++}`);
      values.push(data.thinking ? JSON.stringify(data.thinking) : null);
    }
    
    if (data.tool_calls !== undefined) {
      updates.push(`tool_calls = $${paramIndex++}`);
      values.push(JSON.stringify(data.tool_calls));
    }
    
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }
  
    if (updates.length === 0) return false;
  
    values.push(id);
    
    const result = await db.execute(
      `UPDATE chat_messages SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  
    return result.rowsAffected > 0;
};
  
export const deleteMessage = async (id: string): Promise<boolean> => {
    const db = await loadDB();
    
    const result = await db.execute(
      'DELETE FROM chat_messages WHERE id = $1',
      [id]
    );
  
    return result.rowsAffected > 0;
};

export const deleteMessagesByThread = async (threadId: string): Promise<number> => {
    const db = await loadDB();
    
    const result = await db.execute(
      'DELETE FROM chat_messages WHERE thread_id = $1',
      [threadId]
    );
  
    return result.rowsAffected;
};
  
export const getMessageStats = async (threadId?: string): Promise<{
    total: number;
    by_role: Record<string, number>;
    with_attachments: number;
    with_tool_calls: number;
    with_thinking: number;
  }> => {
    const db = await loadDB();
    
    let whereClause = '';
    const values: any[] = [];
    
    if (threadId) {
      whereClause = 'WHERE thread_id = $1';
      values.push(threadId);
    }
  
    const totalResult = await db.select<[{ count: number }]>(
      `SELECT COUNT(*) as count FROM chat_messages ${whereClause}`,
      values
    );
    
    const roleResult = await db.select<Array<{ role: string; count: number }>>(
      `SELECT role, COUNT(*) as count FROM chat_messages ${whereClause} GROUP BY role`,
      values
    );
    
    const attachmentsResult = await db.select<[{ count: number }]>(
      `SELECT COUNT(*) as count FROM chat_messages ${whereClause} ${whereClause ? 'AND' : 'WHERE'} attachments != '[]'`,
      values
    );
    
    const toolCallsResult = await db.select<[{ count: number }]>(
      `SELECT COUNT(*) as count FROM chat_messages ${whereClause} ${whereClause ? 'AND' : 'WHERE'} tool_calls != '[]'`,
      values
    );
    
    const thinkingResult = await db.select<[{ count: number }]>(
      `SELECT COUNT(*) as count FROM chat_messages ${whereClause} ${whereClause ? 'AND' : 'WHERE'} thinking IS NOT NULL`,
      values
    );
  
    const by_role: Record<string, number> = {};
    roleResult.forEach(row => {
      by_role[row.role] = row.count;
    });
  
    return {
      total: totalResult[0].count,
      by_role,
      with_attachments: attachmentsResult[0].count,
      with_tool_calls: toolCallsResult[0].count,
      with_thinking: thinkingResult[0].count,
    };
};
  
export const searchMessages = async (
    query: string, 
    threadId?: string, 
    limit: number = 50
): Promise<ChatMessage[]> => {
    const db = await loadDB();
    
    let sql = `SELECT * FROM chat_messages WHERE content LIKE $1`;
    const values: any[] = [`%${query}%`];
    
    if (threadId) {
      sql += ` AND thread_id = $2`;
      values.push(threadId);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);
  
    const result = await db.select<ChatMessageDB[]>(sql, values);
  
    return result.map(toChatMessage);
};
  
export const getMessagesByRole = async (
    threadId: string, 
    role: 'user' | 'assistant' | 'system'
): Promise<ChatMessage[]> => {
    const db = await loadDB();
    
    const result = await db.select<ChatMessageDB[]>(
      'SELECT * FROM chat_messages WHERE thread_id = $1 AND role = $2 ORDER BY created_at ASC',
      [threadId, role]
    );
  
    return result.map(toChatMessage);   
};