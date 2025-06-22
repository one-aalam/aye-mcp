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