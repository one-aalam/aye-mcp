<script lang="ts">
  import { cn, formatFileSize, getFileIcon } from '@/utils.js';
  import type { ChatAttachment } from '../../types/index.js';
  import { X, Loader2 } from '@lucide/svelte';
  import Icon from '@lucide/svelte/icons/file';

  interface Props {
    attachment: ChatAttachment;
    size?: 'sm' | 'md' | 'lg';
    removable?: boolean;
    class?: string;
    remove?: (eventData: { attachmentId: string }) => void
  }

  let {
    attachment,
    size = 'md',
    removable = true,
    class: className = '',
    remove = () => {}
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  function getStatusColor(status: ChatAttachment['status']) {
    switch (status) {
      case 'uploading': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'processing': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'ready': return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-950';
    }
  }
</script>

<div class={cn(
  'relative rounded-lg border-2 overflow-hidden transition-all duration-200',
  sizeClasses[size],
  getStatusColor(attachment.status),
  className
)}>
  <!-- Remove button -->
  {#if removable}
    <button
      class="absolute top-1 right-1 z-10 p-1 bg-background/80 hover:bg-background rounded-full shadow-sm transition-colors"
      onclick={() => remove({ attachmentId: attachment.id })}
      title="Remove attachment"
    >
      <X class="w-3 h-3" />
    </button>
  {/if}

  <!-- Status indicator -->
  {#if attachment.status === 'uploading' || attachment.status === 'processing'}
    <div class="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
      <Loader2 class="w-4 h-4 animate-spin" />
    </div>
  {/if}

  <!-- Content -->
  <div class="w-full h-full flex flex-col">
    {#if attachment.type === 'image' && attachment.preview}
      <!-- Image preview -->
      <div class="flex-1 bg-muted">
        <img
          src={attachment.preview}
          alt={attachment.name}
          class="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    {:else}
      <!-- File icon and info -->
      <div class="flex-1 flex flex-col items-center justify-center p-2 text-center">
        <Icon name={getFileIcon(attachment.mimeType)} class="w-6 h-6 mb-1 text-muted-foreground" />
        <p class="text-xs font-medium truncate max-w-full" title={attachment.name}>
          {attachment.name}
        </p>
        <p class="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
    {/if}
  </div>

  <!-- Error state -->
  {#if attachment.status === 'error' && attachment.error}
    <div class="absolute inset-0 bg-destructive/10 flex items-center justify-center p-2">
      <p class="text-xs text-destructive text-center" title={attachment.error}>
        Upload failed
      </p>
    </div>
  {/if}
</div>