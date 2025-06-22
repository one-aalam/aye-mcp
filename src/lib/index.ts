import { chatActions } from './stores/index.js';
import type { ChatConfig, ChatMessage, PromptSuggestion } from './types/index.js';

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

// Stores and state management
export {
  messages,
  isTyping,
  config,
  voiceState,
  isDarkMode,
  currentTheme,
  promptSuggestions,
  hasMessages,
  lastMessage,
  isVoiceActive,
  chatActions,
  CHAT_CONTEXT_KEY,
} from './stores/index.js';

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

// CSS classes and variants (for shadcn-svelte integration)
export const chatVariants = {
  message: {
    user: 'bg-primary text-primary-foreground',
    assistant: 'bg-secondary text-secondary-foreground',
    system: 'bg-muted text-muted-foreground',
  },
  attachment: {
    uploading: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
    processing: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
    ready: 'border-green-500 bg-green-50 dark:bg-green-950',
    error: 'border-red-500 bg-red-50 dark:bg-red-950',
  },
  tool: {
    running: 'text-blue-500',
    complete: 'text-green-500',
    error: 'text-red-500',
    cancelled: 'text-gray-500',
  },
};

// Default configurations
export const defaultConfig: ChatConfig = {
  enableVoiceInput: true,
  enableFileUpload: true,
  enableMarkdown: true,
  enableThinking: true,
  enableToolCalls: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/*', 'text/*', 'application/pdf'],
  autoScrollToBottom: true,
  showTimestamps: false,
  enableCopy: true,
  enableEdit: false,
  enableDelete: false,
};

export const defaultPromptSuggestions: PromptSuggestion[] = [
  {
    id: '1',
    text: 'Help me write a professional email',
    icon: 'mail',
    category: 'Writing',
  },
  {
    id: '2',
    text: 'Explain a complex topic simply',
    icon: 'lightbulb',
    category: 'Learning',
  },
  {
    id: '3',
    text: 'Review and improve my code',
    icon: 'code',
    category: 'Development',
  },
  {
    id: '4',
    text: 'Brainstorm creative ideas',
    icon: 'zap',
    category: 'Creative',
  },
  {
    id: '5',
    text: 'Analyze data and create insights',
    icon: 'bar-chart',
    category: 'Analysis',
  },
];

// Helper functions for easy setup
export function createChatInstance(initialConfig?: Partial<ChatConfig>) {
  const finalConfig = { ...defaultConfig, ...initialConfig };
  
  return {
    config: finalConfig,
    addMessage: chatActions.addMessage,
    updateMessage: chatActions.updateMessage,
    deleteMessage: chatActions.deleteMessage,
    clearMessages: chatActions.clearMessages,
    setTyping: chatActions.setTyping,
    updateConfig: chatActions.updateConfig,
    toggleTheme: chatActions.toggleTheme,
    updateVoiceState: chatActions.updateVoiceState,
    setPromptSuggestions: chatActions.setPromptSuggestions,
  };
}

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

// Re-export commonly used icons from Lucide
export {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Copy,
  Check,
  Download,
  ExternalLink,
  Eye,
  X,
  User,
  Bot,
  Brain,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Loader2,
} from '@lucide/svelte';