<script lang="ts">
  import type { ChatMessage, ChatConfig } from '../../types/index.js';
  import ChatMessageUI from './chat-message.svelte';
  import { cn } from '@/utils.js';

  interface Props {
    messages: ChatMessage[];
    config: ChatConfig;
    class?: string;
    onCopy?: (eventData: { messageId: string, content: string }) => void;
    onEdit?: (eventData: { messageId: string }) => void;
    onRemove?: (eventData: { messageId: string }) => void;
    onThinkingToggle?: (eventData: { messageId: string }) => void;
    onToolCancel?: (eventData: { toolCallId: string }) => void;
  }

  let {
    messages,
    config,
    class: className = '',
    onCopy,
    onEdit,
    onRemove,
    onThinkingToggle,
    onToolCancel,
  }: Props = $props();

</script>

<div class={cn('divide-y divide-border', className)}>
  {#each messages as message, index (message.id)}
    <ChatMessageUI 
      {message}
      showTimestamp={config.showTimestamps}
      enableCopy={config.enableCopy}
      enableEdit={config.enableEdit}
      enableDelete={config.enableDelete}
      isLast={index === messages.length - 1}
      onCopy={(e) => onCopy?.({ messageId: message.id, content: message.content })}
      onEdit={(e) => onEdit?.({ messageId: message.id })}
      onRemove={(e) => onRemove?.({ messageId: message.id })}
      onThinkingToggle={(e) => onThinkingToggle?.({ messageId: message.id })}
      onToolCancel={(e) => onToolCancel?.({ toolCallId: message.id })}
    />
  {/each}
</div>