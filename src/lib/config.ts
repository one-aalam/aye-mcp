import type { ChatConfig, ChatTheme, PromptSuggestion } from "@/types";

// Default configurations
export const DEFAULT_CONFIG: ChatConfig = {
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

export const DEFAULT_THEME: ChatTheme = {
    colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        accent: 'hsl(var(--accent))',
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--card))',
        text: 'hsl(var(--foreground))',
        textSecondary: 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        error: 'hsl(var(--destructive))',
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
    },
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
    },
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
}

// CSS classes and variants (for shadcn-svelte integration)
export const CHAT_VARIANTS = {
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

export const DEFAULT_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
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


// Very important App config (Don't change this)
export const DB_PATH = 'aye_mcp.db';

export const DEFAULT_THREAD_ID = 'default_thread';
export const DEFAULT_THREAD_TITLE = 'Chat';
export const DEFAULT_THREAD_DESCRIPTION = 'Default Thread Description';
export const DEFAULT_THREAD_TAGS = ['default', 'personal'];
