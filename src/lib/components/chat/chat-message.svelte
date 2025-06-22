<script lang="ts">
  import { cn, formatTime, formatDate } from '@/utils';
  import type { ChatMessage } from '@/types';
  import MarkdownRenderer from './markdown-renderer.svelte';
  import AttachmentList from '@/components/attchments/attachment-list.svelte';
  import ThinkingBlock from './thinking-block.svelte';
  import ToolCallList from './tool-call-list.svelte';
  import CopyButton from '@/components/ui/copy-button.svelte';
  import { User, Bot, Copy, Trash2, MoreHorizontal, Edit } from '@lucide/svelte';

  interface Props {
    message: ChatMessage;
    showTimestamp?: boolean;
    enableCopy?: boolean;
    enableEdit?: boolean;
    enableDelete?: boolean;
    isLast?: boolean;
    class?: string;
    onCopy?: (eventData: { messageId: string, content: string }) => void;
    onEdit?: (eventData: { messageId: string }) => void;
    onRemove?: (eventData: { messageId: string }) => void;
    onThinkingToggle?: (eventData: { messageId: string }) => void;
    onToolCancel?: (eventData: { toolCallId: string }) => void;
  }

  let {
    message,
    showTimestamp = false,
    enableCopy = true,
    enableEdit = false,
    enableDelete = false,
    isLast = false,
    class: className = '',
    onCopy,
    onEdit,
    onRemove,
    onThinkingToggle,
    onToolCancel
  }: Props = $props();


  let showActions = $state(false);
  let messageElement: HTMLDivElement;

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  function handleCopy() {
    onCopy?.({ messageId: message.id, content: message.content });
  }

  function handleEdit() {
    onEdit?.({ messageId: message.id });
  }

  function handleDelete() {
    onRemove?.({ messageId: message.id });
  }

  function handleThinkingToggle() {
    onThinkingToggle?.({ messageId: message.id });
  }

  function handleToolCancel(toolCallId: string) {
    onToolCancel?.({ toolCallId });
  }
</script>

<div
  bind:this={messageElement}
  class={cn(
    'flex gap-3 p-4 transition-colors duration-200',
    {
      'bg-muted/20': isUser,
      'hover:bg-muted/10': !isUser,
    },
    className
  )}
  role="article"
  aria-label={`Message from ${message.role}`}
  onmouseenter={() => showActions = true}
  onmouseleave={() => showActions = false}
>
  <!-- Avatar -->
  <div class={cn(
    'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
    {
      'bg-primary text-primary-foreground': isUser,
      'bg-secondary text-secondary-foreground': isAssistant,
      'bg-muted text-muted-foreground': isSystem,
    }
  )}>
    {#if isUser}
      <User class="w-4 h-4" />
    {:else if isAssistant}
      <Bot class="w-4 h-4" />
    {:else}
      <div class="w-2 h-2 rounded-full bg-current"></div>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 min-w-0 space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium capitalize">
          {message.role}
        </span>
        {#if showTimestamp}
          <time 
            class="text-xs text-muted-foreground"
            datetime={message.timestamp.toISOString()}
            title={formatDate(message.timestamp)}
          >
            {formatTime(message.timestamp)}
          </time>
        {/if}
      </div>

      <!-- Actions -->
      <div class={cn(
        'flex items-center gap-1 opacity-0 transition-opacity duration-200',
        { 'opacity-100': showActions }
      )}>
        {#if enableCopy}
          <CopyButton 
            text={message.content}
            size="sm"
            variant="ghost"
            onclick={handleCopy}
          />
        {/if}
        
        {#if enableEdit && isUser}
          <button
            class="p-1.5 rounded-md hover:bg-muted transition-colors"
            onclick={handleEdit}
            title="Edit message"
          >
            <Edit class="w-3.5 h-3.5" />
          </button>
        {/if}
        
        {#if enableDelete}
          <button
            class="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
            onclick={handleDelete}
            title="Delete message"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {/if}

        <button
          class="p-1.5 rounded-md hover:bg-muted transition-colors"
          title="More options"
        >
          <MoreHorizontal class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Thinking Process -->
    {#if message.thinking && isAssistant}
      <ThinkingBlock 
        thinking={message.thinking}
        onToggle={handleThinkingToggle}
      />
    {/if}

    <!-- Tool Calls -->
    {#if message.toolCalls && message.toolCalls.length > 0}
      <ToolCallList 
        toolCalls={message.toolCalls}
        onCancel={(eventData) => handleToolCancel(eventData.toolCallId)}
      />
    {/if}

    <!-- Message Content -->
    {#if message.content}
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={message.content} />
      </div>
    {/if}

    <!-- Attachments -->
    {#if message.attachments && message.attachments.length > 0}
      <AttachmentList attachments={message.attachments} />
    {/if}

    <!-- Metadata -->
    {#if message.metadata && Object.keys(message.metadata).length > 0}
      <details class="text-xs text-muted-foreground">
        <summary class="cursor-pointer hover:text-foreground">
          Message metadata
        </summary>
        <pre class="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
{JSON.stringify(message.metadata, null, 2)}
        </pre>
      </details>
    {/if}
  </div>
</div>

<style>
    @reference "../../../app.css";
  .prose :global(pre) {
    @apply bg-muted border rounded-lg;
  }
  
  .prose :global(code:not(pre code)) {
    @apply bg-muted px-1 py-0.5 rounded text-sm;
  }
  
  .prose :global(blockquote) {
    @apply border-l-4 border-primary bg-muted/20 rounded-r;
  }
</style>