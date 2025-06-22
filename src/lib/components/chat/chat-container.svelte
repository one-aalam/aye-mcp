<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    appPrefs,
    messageThread,
  } from '../../stores/index.js';
  import { cn, scrollToBottom, isScrolledToBottom } from '@/utils.js';
  import type { ChatMessage, ChatConfig, ChatAttachment, PromptSuggestion } from '../../types/index.js';
  import ChatMessageList from './chat-message-list.svelte';
  import MessageInput from '@/components/input/message-input.svelte';
  import PromptSuggestions from '@/components/ui/prompt-suggestions.svelte';
  import TypingIndicator from '@/components/ui/typing-indicator.svelte';
  import ThemeToggle from '@/components/ui/theme-toggle.svelte';

  interface Props {
    initialMessages?: ChatMessage[];
    initialConfig?: Partial<ChatConfig>;
    height?: string;
    showHeader?: boolean;
    showPromptSuggestions?: boolean;
    class?: string;
    onThemeToggle?: () => void;
    onMessageSend?: (event: { content: string, attachments: ChatAttachment[] }) => void;
    onAttachmentAdd?: (event: { attachment: ChatAttachment }) => void;
    onAttachmentRemove?: (event: { attachmentId: string }) => void;
    onVoiceStart?: () => void;
    onVoiceStop?: () => void;
    onVoiceResult?: (event: { transcript: string }) => void;
    onPromptSelect?: (event: { suggestion: PromptSuggestion }) => void;
    onCopy?: (event: { messageId: string, content: string }) => void;
    onEdit?: (event: { messageId: string }) => void;
    onRemove?: (event: { messageId: string }) => void;
    onThinkingToggle?: (event: { messageId: string }) => void;
    onToolCancel?: (event: { toolCallId: string }) => void;
  }

  let {
    initialMessages = [],
    initialConfig = {},
    height = '100vh',
    showHeader = true,
    showPromptSuggestions = true,
    class: className = '',
    onThemeToggle = () => {},
    onCopy = () => {},
    onEdit = () => {},
    onRemove = () => {},
    onThinkingToggle = () => {},
    onToolCancel = () => {},
    onMessageSend = () => {},
    onAttachmentAdd = () => {},
    onAttachmentRemove = () => {},
    onVoiceStart = () => {},
    onVoiceStop = () => {},
    onVoiceResult = () => {},
    onPromptSelect = () => {},
  }: Props = $props();

  let containerElement: HTMLDivElement;
  let messagesElement: HTMLDivElement;
  let shouldAutoScroll = $state(true);

  // Initialize stores
  onMount(() => {
    if (initialMessages.length > 0) {
      messageThread.setMessages(initialMessages);
    }
    if (Object.keys(initialConfig).length > 0) {
      appPrefs.updateConfig(initialConfig);
    }
  });

  // Auto-scroll behavior
  function handleScroll() {
    if (messagesElement) {
      shouldAutoScroll = isScrolledToBottom(messagesElement);
    }
  }

  function scrollToBottomIfNeeded() {
    if (messagesElement && shouldAutoScroll && appPrefs.config.autoScrollToBottom) {
      scrollToBottom(messagesElement);
    }
  }

  // Watch for message changes and auto-scroll
  $effect(() => {
    if (messageThread.messages.length > 0) {
      setTimeout(scrollToBottomIfNeeded, 100);
    }
  });

  // Cleanup
  onDestroy(() => {
    // Any cleanup needed
  });
</script>

<div 
  bind:this={containerElement}
  class={cn(
    'flex flex-col bg-background text-foreground',
    className
  )}
  style:height
>
  <!-- Header -->
  {#if showHeader}
    <header class="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-semibold">Chat</h1>
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{messageThread.messages.length} messages</span>
          {#if messageThread.isTyping}
            <span>• typing...</span>
          {/if}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <ThemeToggle onToggle={() => {
          onThemeToggle()
        }} />
        
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          onclick={() => messageThread.clearMessages()}
          title="Clear all messages"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </header>
  {/if}

  <!-- Messages -->
  <div 
    bind:this={messagesElement}
    class="flex-1 overflow-y-auto scroll-smooth"
    onscroll={handleScroll}
  >
    {#if messageThread.messages.length === 0}
      <!-- Empty state -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="text-center max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold mb-2">Start a conversation</h2>
          <p class="text-muted-foreground mb-4">
            Send a message to begin chatting. You can attach files, use voice input, and more.
          </p>
          
          {#if showPromptSuggestions && appPrefs.promptSuggestions.length > 0}
            <PromptSuggestions 
              suggestions={appPrefs.promptSuggestions}
              layout="grid"
              onSelect={(suggestion) => onPromptSelect?.({ suggestion })}
            />
          {/if}
        </div>
      </div>
    {:else}
      <ChatMessageList 
        messages={messageThread.messages}
        config={appPrefs.config}
        onCopy={(e) => onCopy?.({ messageId: e.messageId, content: e.content })}
        onEdit={(e) => onEdit?.({ messageId: e.messageId })}
        onRemove={(e) => onRemove?.({ messageId: e.messageId })}
        onThinkingToggle={(e) => onThinkingToggle?.({ messageId: e.messageId })}
        onToolCancel={(e) => onToolCancel?.({ toolCallId: e.toolCallId })}
      />
      
      <!-- Typing indicator -->
      {#if messageThread.isTyping}
        <div class="p-4">
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <TypingIndicator />
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Input area -->
  <div class="border-t border-border bg-background/80 backdrop-blur-sm">
    {#if showPromptSuggestions && appPrefs.promptSuggestions.length > 0 && messageThread.messages.length === 0}
      <div class="p-4 border-b border-border">
        <PromptSuggestions 
          suggestions={appPrefs.promptSuggestions}
          layout="horizontal"
          onSelect={(suggestion) => onPromptSelect?.({ suggestion })}
        />
      </div>
    {/if}
    
    <div class="p-4">
      <MessageInput 
        config={appPrefs.config}
        onSend={(e) => {
          onMessageSend?.({ content: e.content, attachments: e.attachments || [] })
          setTimeout(scrollToBottomIfNeeded, 100);
        }}
        onAttachmentAdd={(attachment) => onAttachmentAdd?.({ attachment })}
        onAttachmentRemove={(attachmentId) => onAttachmentRemove?.({ attachmentId })}
        onVoiceStart={onVoiceStart}
        onVoiceStop={onVoiceStop}
        onVoiceResult={({transcript}) => onVoiceResult?.({ transcript })}
      />
    </div>
  </div>

  <!-- Scroll to bottom button -->
  {#if !shouldAutoScroll}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="absolute bottom-20 right-4 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      onclick={() => scrollToBottom(messagesElement, true)}
      title="Scroll to bottom"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  {/if}
</div>