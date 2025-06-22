export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  attachments?: ChatAttachment[];
  thinking?: ThinkingProcess;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
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

// Event types
export interface ChatEvents {
  'message:send': { message: Omit<ChatMessage, 'id' | 'timestamp'> };
  'message:edit': { id: string; content: string };
  'message:delete': { id: string };
  'message:copy': { id: string };
  'attachment:upload': { files: FileList };
  'attachment:remove': { attachmentId: string };
  'tool:cancel': { toolCallId: string };
  'voice:start': void;
  'voice:stop': void;
  'voice:transcript': { transcript: string };
  'thinking:toggle': { messageId: string };
  'prompt:select': { suggestion: PromptSuggestion };
  'theme:toggle': void;
}