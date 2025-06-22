import type { ChatMessage } from './types/index.js';

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
  ChatEvents,
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

export function createChatMessage(
  content: string,
  role: 'user' | 'assistant' | 'system' = 'user',
  options?: Partial<Omit<ChatMessage, 'id' | 'content' | 'role' | 'timestamp'>>
): Omit<ChatMessage, 'id' | 'timestamp'> {
  return {
    content,
    role,
    ...options,
  };
}