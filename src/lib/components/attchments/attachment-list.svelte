<script lang="ts">
  import type { ChatAttachment } from '@/types';
  import { cn, formatFileSize, getFileIcon, isImageFile } from '@/utils.js';
  import { Download, ExternalLink, Eye } from '@lucide/svelte';
  import Icon from '@lucide/svelte/icons/file';


  interface Props {
    attachments: ChatAttachment[];
    layout?: 'grid' | 'list';
    showDownload?: boolean;
    class?: string;
  }

  let {
    attachments,
    layout = 'grid',
    showDownload = true,
    class: className = '',
  }: Props = $props();

  let expandedImageId = $state<string | null>(null);

  function handleImageClick(attachmentId: string) {
    expandedImageId = expandedImageId === attachmentId ? null : attachmentId;
  }

  function handleDownload(attachment: ChatAttachment) {
    if (attachment.url) {
      const a = document.createElement('a');
      a.href = attachment.url;
      a.download = attachment.name;
      a.click();
    }
  }
</script>

<div class={cn(
  'space-y-2',
  className
)}>
  {#each attachments as attachment (attachment.id)}
    <div class={cn(
      'group relative border border-border rounded-lg overflow-hidden bg-card',
      layout === 'grid' ? 'inline-block' : 'w-full'
    )}>
      {#if attachment.type === 'image' && attachment.preview}
        <!-- Image attachment -->
        <div class="relative">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <img
            src={attachment.preview}
            alt={attachment.name}
            class={cn(
              'w-full object-cover cursor-pointer transition-all duration-200',
              expandedImageId === attachment.id 
                ? 'max-h-96' 
                : layout === 'grid' 
                  ? 'h-32 w-32' 
                  : 'h-20'
            )}
            onclick={() => handleImageClick(attachment.id)}
            loading="lazy"
          />
          
          <!-- Image overlay -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              class="p-2 bg-background/80 rounded-full"
              onclick={() => handleImageClick(attachment.id)}
              title={expandedImageId === attachment.id ? 'Collapse' : 'Expand'}
            >
              <Eye class="w-4 h-4" />
            </button>
          </div>
          
          <!-- Image info -->
          <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
            <p class="text-xs font-medium truncate">{attachment.name}</p>
            <p class="text-xs opacity-75">{formatFileSize(attachment.size)}</p>
          </div>
        </div>
      {:else if attachment.type === 'text' && attachment.content}
        <!-- Text attachment -->
        <div class="p-3">
          <div class="flex items-start gap-2">
            <Icon name="file-text" class="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-medium truncate">{attachment.name}</p>
                <span class="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
              </div>
              <div class="text-xs text-muted-foreground bg-muted p-2 rounded border max-h-24 overflow-y-auto">
                <pre class="whitespace-pre-wrap font-mono">{attachment.content.slice(0, 200)}{attachment.content.length > 200 ? '...' : ''}</pre>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- File attachment -->
        <div class="p-3">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Icon name={getFileIcon(attachment.mimeType)} class="w-5 h-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" title={attachment.name}>
                {attachment.name}
              </p>
              <p class="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)} • {attachment.mimeType}
              </p>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {#if showDownload && attachment.url}
                <button
                  class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  onclick={() => handleDownload(attachment)}
                  title="Download"
                >
                  <Download class="w-3.5 h-3.5" />
                </button>
              {/if}
              
              {#if attachment.url}
                <button
                  class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  onclick={() => window.open(attachment.url, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>