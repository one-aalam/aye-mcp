import type { ChatThread, ThreadListOptions, UpdateThreadRequest } from "@/types";
import { loadDB } from "./db";

interface ChatThreadDB extends Omit<ChatThread, 'tool_presets' | 'settings' | 'tags'> {
    tool_presets: string;
    settings: string;
    tags: string;
}

const toChatThread = ({ tool_presets, settings, tags, created_at, updated_at,...rest }: ChatThreadDB): ChatThread => ({
    ...rest,
    tool_presets: JSON.parse(tool_presets || '[]'),
    settings: JSON.parse(settings || '{}'),
    tags: JSON.parse(tags || '[]'),
    created_at: new Date(created_at),
    updated_at: new Date(updated_at),
});

export const getThread = async (id: string): Promise<ChatThread | null> => {
    const db = await loadDB();
    
    const result = await db.select<ChatThreadDB[]>(
      'SELECT * FROM chat_threads WHERE id = $1',
      [id]
    );
  
    if (result.length === 0) return null;
  
    const thread = result[0];
    return toChatThread(thread);
};

export const createThread = async (thread: ChatThread) => {
    const db = await loadDB();
    const result = await db.execute('INSERT INTO chat_threads (id, project_id, title, description, model_provider, model_name, system_prompt, tool_presets, settings, message_count, total_tokens, last_message_at, tags, status, avg_response_time, error_count, parent_thread_id, thread_type, priority, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)', [
        thread.id,
        thread.project_id || 'default_project',
        thread.title,
        thread.description,

        thread.model_provider,
        thread.model_name,
        thread.system_prompt,
        thread.tool_presets ? JSON.stringify(thread.tool_presets) : null,
        JSON.stringify(thread.settings),

        thread.message_count,
        thread.total_tokens,
        thread.last_message_at,
        JSON.stringify(thread.tags),

        thread.status,
        thread.avg_response_time,
        thread.error_count,

        thread.parent_thread_id ? thread.parent_thread_id : null,
        thread.thread_type,
        thread.priority,

        thread.created_at,
        thread.updated_at,
    ]);
    return result;
}

export const updateThread = async (id: string, data: UpdateThreadRequest): Promise<boolean> => {
    const db = await loadDB();
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
  
    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    
    if (data.project_id !== undefined) {
      updates.push(`project_id = $${paramIndex++}`);
      values.push(data.project_id);
    }
    
    if (data.model_provider !== undefined) {
      updates.push(`model_provider = $${paramIndex++}`);
      values.push(data.model_provider);
    }
    
    if (data.model_name !== undefined) {
      updates.push(`model_name = $${paramIndex++}`);
      values.push(data.model_name);
    }
    
    if (data.system_prompt !== undefined) {
      updates.push(`system_prompt = $${paramIndex++}`);
      values.push(data.system_prompt);
    }
    
    if (data.tool_presets !== undefined) {
      updates.push(`tool_presets = $${paramIndex++}`);
      values.push(JSON.stringify(data.tool_presets));
    }
    
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(data.settings));
    }
    
    if (data.is_archived !== undefined) {
      updates.push(`is_archived = $${paramIndex++}`);
      values.push(data.is_archived);
    }
    
    if (data.is_pinned !== undefined) {
      updates.push(`is_pinned = $${paramIndex++}`);
      values.push(data.is_pinned);
    }
    
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(data.tags));
    }
  
    if (updates.length === 0) return false;
  
    values.push(id);
    
    const result = await db.execute(
      `UPDATE chat_threads SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  
    return result.rowsAffected > 0;
};

export const deleteThread = async (id: string): Promise<boolean> => {
    const db = await loadDB();
    
    const result = await db.execute(
      'DELETE FROM chat_threads WHERE id = $1',
      [id]
    );
    return result.rowsAffected > 0;
};

export const archiveThread = async (id: string): Promise<boolean> => {
    return updateThread(id, { is_archived: true });
};
  
export const unarchiveThread = async (id: string): Promise<boolean> => {
    return updateThread(id, { is_archived: false });
};
  
export const pinThread = async (id: string): Promise<boolean> => {
    return updateThread(id, { is_pinned: true });
};
  
export const unpinThread = async (id: string): Promise<boolean> => {
    return updateThread(id, { is_pinned: false });
};
  
export const getThreads = async (options: ThreadListOptions = {}): Promise<ChatThread[]> => {
    const db = await loadDB();
    
    const {
      limit = 50,
      offset = 0,
      project_id,
      include_archived = false,
      search,
      sort_by = 'updated_at',
      sort_order = 'desc'
    } = options;
  
    let query = 'SELECT * FROM chat_threads WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;
  
    if (include_archived) {
      query += ` AND is_archived = $${paramIndex++}`;
      values.push(true);
    } else {
      query += ` AND is_archived = $${paramIndex++}`;
      values.push(0);
    }
  
    if (project_id) {
      query += ` AND project_id = $${paramIndex++}`;
      values.push(project_id);
    }
  
    if (search) {
      query += ` AND (title LIKE $${paramIndex++} OR description LIKE $${paramIndex++})`;
      values.push(`%${search}%`, `%${search}%`);
    }
  
    query += ` ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);
  
    const result = await db.select<ChatThreadDB[]>(query, values);
  
    return result.map(toChatThread);
};
  
export const getRecentThreads = async (limit: number = 10): Promise<ChatThread[]> => {
    return getThreads({
      limit,
      sort_by: 'last_message_at',
      sort_order: 'desc'
    });
};
  
export const getPinnedThreads = async (): Promise<ChatThread[]> => {
    const db = await loadDB();
    
    const result = await db.select<ChatThreadDB[]>(
      'SELECT * FROM chat_threads WHERE is_pinned = true AND is_archived = false ORDER BY updated_at DESC'
    );
  
    return result.map(toChatThread);
};
  
export const searchThreads = async (query: string, limit: number = 20): Promise<ChatThread[]> => {
    return getThreads({
      search: query,
      limit,
      sort_by: 'updated_at',
      sort_order: 'desc'
    });
};
  
export const getThreadStats = async (): Promise<{
    total: number;
    archived: number;
    pinned: number;
    by_project: Record<string, number>;
  }> => {
    const db = await loadDB();
    
    const totalResult = await db.select<[{ count: number }]>(
      'SELECT COUNT(*) as count FROM chat_threads'
    );
    
    const archivedResult = await db.select<[{ count: number }]>(
      'SELECT COUNT(*) as count FROM chat_threads WHERE is_archived = true'
    );
    
    const pinnedResult = await db.select<[{ count: number }]>(
      'SELECT COUNT(*) as count FROM chat_threads WHERE is_pinned = true'
    );
    
    const projectResult = await db.select<Array<{ project_id: string; count: number }>>(
      'SELECT project_id, COUNT(*) as count FROM chat_threads WHERE project_id IS NOT NULL GROUP BY project_id'
    );
  
    const by_project: Record<string, number> = {};
    projectResult.forEach(row => {
      by_project[row.project_id] = row.count;
    });
  
    return {
      total: totalResult[0].count,
      archived: archivedResult[0].count,
      pinned: pinnedResult[0].count,
      by_project,
    };
};