import { nanoid } from 'nanoid';
import type { ChatMessage, ChatThread } from './types/index.js';
import { DEFAULT_THREAD_ID } from './config.js';

// Main components
export { default as ChatContainer } from './components/chat/chat-container.svelte';
export { default as ChatMessageUI } from './components/chat/chat-message.svelte';
export { default as ChatMessageList } from './components/chat/chat-message-list.svelte';
export { default as MarkdownRenderer } from './components/chat/markdown-renderer.svelte';
export { default as ThinkingBlock } from './components/chat/thinking-block.svelte';
export { default as ToolCallList } from './components/chat/tool-call-list.svelte';

// Input components
export { default as InputMessage } from './components/input/message-input.svelte';

// Attachment components
export { default as AttachmentPreview } from './components/attchments/attachment-preview.svelte';
export { default as AttachmentList } from './components/attchments/attachment-list.svelte';

// Voice components
export { default as VoiceInput } from './components/voice/voice-input.svelte';
export { default as AudioVisualizer } from './components/voice/audio-visualiser.svelte';

// UI components
export { default as CopyButton } from './components/ui/copy-button.svelte';
export { default as TypingIndicator } from './components/ui/typing-indicator.svelte';
export { default as PromptSuggestions } from '@/components/ui/prompt-suggestions.svelte';
export { default as ThemeToggle } from './components/ui/theme-toggle.svelte';

// Types
export type {
  ChatMessage,
  ChatAttachment,
  ThinkingProcess,
  ThinkingStep,
  ToolCall,
  VoiceInputState,
  ChatTheme,
  ChatConfig,
  PromptSuggestion,
} from './types/index.js';

// Utilities
export {
  cn,
  formatFileSize,
  getFileIcon,
  isImageFile,
  isTextFile,
  createFileAttachment,
  truncateText,
  shouldConvertToAttachment,
  extractCodeBlocks,
  formatTime,
  formatDate,
  createTypewriterEffect,
  copyToClipboard,
  scrollToBottom,
  isScrolledToBottom,
} from './utils';

export function createUserChatMessage(
  content: string,
  options?: Partial<Omit<ChatMessage, 'id' | 'content' | 'role' | 'thinking' | 'tool_calls' |  'created_at' | 'updated_at'>>
): ChatMessage {
  return {
    id: nanoid(),
    role: 'user',
    content,
    thread_id: options?.thread_id || DEFAULT_THREAD_ID,
    attachments: options?.attachments || [],
    thinking: undefined,
    tool_calls: [],
    metadata: options?.metadata || {},
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export function createAssistantChatMessage(
  content: string,
  options?: Partial<Omit<ChatMessage, 'id' | 'content' | 'role' | 'attachments' |  'created_at' | 'updated_at'>>
): ChatMessage {
  return {
    id: nanoid(),
    role: 'assistant',
    content,
    thread_id: options?.thread_id || DEFAULT_THREAD_ID,
    attachments: [],
    thinking: options?.thinking || undefined,
    tool_calls: options?.tool_calls || [],
    metadata: options?.metadata || {},
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export function createChatThread(
  title: string,
  description?: string,
  options?: Partial<Omit<ChatThread, 'id' | 'created_at' | 'updated_at' | 'message_count' | 'total_tokens' | 'is_archived' | 'is_pinned' | 'tags' | 'last_message_at'>>
): ChatThread {
  return {
    id: nanoid(),
    title,
    description: description || '',
    message_count: 0,
    total_tokens: 0,
    is_archived: false,
    is_pinned: false,
    tags: [],
    last_message_at: undefined,
    created_at: new Date(),
    updated_at: new Date(),
    ...options,
  };
}
  