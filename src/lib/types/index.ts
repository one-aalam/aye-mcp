export interface ChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: ChatAttachment[];
  thinking?: ThinkingProcess;
  tool_calls?: ToolCall[];
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ChatThread {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  model_provider?: string;
  model_name?: string;
  system_prompt?: string;
  tool_presets?: string[]; // JSON array stored as string in DB
  settings?: Record<string, unknown>; // JSON object stored as string in DB
  message_count: number;
  total_tokens: number;
  is_archived: boolean;
  is_pinned: boolean;
  tags: string[]; // JSON array stored as string in DB
  last_message_at?: string; // ISO timestamp
  created_at: Date; // ISO timestamp
  updated_at: Date; // ISO timestamp
}

export interface ChatAttachment {
  id: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'text';
  name: string;
  size: number;
  url?: string;
  content?: string;
  mimeType: string;
  preview?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

export interface ThinkingProcess {
  id: string;
  steps: ThinkingStep[];
  status: 'thinking' | 'complete' | 'error';
  startTime: Date;
  endTime?: Date;
}

export interface ThinkingStep {
  id: string;
  content: string;
  timestamp: Date;
  type: 'reasoning' | 'analysis' | 'decision' | 'conclusion';
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  status: 'running' | 'complete' | 'error' | 'cancelled';
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  canCancel?: boolean;
}

export interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  transcript: string;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  default_model_provider: string;
  default_model_name: string;
  tool_presets: string[]; // JSON array stored as string in DB
  settings: Record<string, unknown>; // JSON object stored as string in DB
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  is_archived: boolean;
}

export interface CreateThreadRequest {
  title: string;
  description?: string;
  project_id?: string;
  model_provider?: string;
  model_name?: string;
  system_prompt?: string;
  tool_presets?: string[];
  settings?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateThreadRequest {
  title?: string;
  description?: string;
  project_id?: string;
  model_provider?: string;
  model_name?: string;
  system_prompt?: string;
  tool_presets?: string[];
  settings?: Record<string, unknown>;
  is_archived?: boolean;
  is_pinned?: boolean;
  tags?: string[];
}

export interface CreateMessageRequest {
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: any[];
  thinking?: any;
  tool_calls?: any[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageRequest {
  content?: string;
  attachments?: any[];
  thinking?: any;
  tool_calls?: any[];
  metadata?: Record<string, unknown>;
}

export interface ThreadListOptions {
  limit?: number;
  offset?: number;
  project_id?: string;
  include_archived?: boolean;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'last_message_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface MessageListOptions {
  limit?: number;
  offset?: number;
  sort_order?: 'asc' | 'desc';
}

export interface ChatTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface ChatConfig {
  enableVoiceInput?: boolean;
  enableFileUpload?: boolean;
  enableMarkdown?: boolean;
  enableThinking?: boolean;
  enableToolCalls?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  autoScrollToBottom?: boolean;
  showTimestamps?: boolean;
  enableCopy?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  theme?: Partial<ChatTheme>;
}

export interface PromptSuggestion {
  id: string;
  text: string;
  icon?: string;
  category?: string;
}