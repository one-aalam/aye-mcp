<script lang="ts">
  import { cn, createFileAttachment, shouldConvertToAttachment } from '@/utils';
  import type { ChatAttachment, ChatConfig } from '@/types';
  import { Send, Paperclip, Mic, MicOff, Wrench } from '@lucide/svelte';
  import VoiceInput from '@/components/voice/voice-input.svelte';
  import AttachmentPreview from '@/components/attchments/attachment-preview.svelte';
  import ToolSelector from '@/components/input/tool-selector.svelte';
  import ProviderSelector from '@/components/input/provider-selector.svelte';
  import type { MCPToolServerDef } from '@/types/mcp';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import type { ProviderConfig } from '@/ipc/genai/types';

  interface Props {
    placeholder?: string;
    disabled?: boolean;
    config?: ChatConfig;
    class?: string;
    toolServers?: MCPToolServerDef[];


    providers: ProviderConfig[];
    configuredProviderNames: string[];
    selectedProvider: string;
    selectedModel: string;
    onModelSelect?: (model: string, provider: string) => void;

    onSend?: (data: {
      content: string,
      attachments: ChatAttachment[] | undefined,
      selectedTools: string[]
    }) => void;
    onError?: (error: { message: string }) => void;
    onAttachmentAdd?: (attachment: ChatAttachment) => void;
    onAttachmentRemove?: (attachmentId: string) => void;
    onVoiceStart?: () => void;
    onVoiceStop?: () => void;
    onVoiceResult?: (event: { transcript: string }) => void;
  }

  let {
    placeholder = "Type your message...",
    disabled = false,
    config = {},
    class: className = '',
    
    toolServers = [],

    providers,
    configuredProviderNames,
    selectedProvider,
    selectedModel,
    onModelSelect,

    onSend,
    onError,
    onAttachmentAdd,
    onAttachmentRemove,
    onVoiceStart,
    onVoiceStop,
    onVoiceResult,
  }: Props = $props();

  let textareaElement: HTMLTextAreaElement;
  // svelte-ignore non_reactive_update
  let fileInputElement: HTMLInputElement;
  let message = $state('');
  let attachments = $state<ChatAttachment[]>([]);
  let isDragging = $state(false);
  let isComposing = $state(false);
  let showVoiceInput = $state(false);
  // tools
  let selectedTools = $state<string[]>([]);
  // let availableTools = $state<MCPTool[]>([]);
  let showToolSelector = $state(false);

  const canSend = $derived(message.trim() || attachments.length > 0);
  const maxFileSize = config.maxFileSize || 10 * 1024 * 1024;
  const allowedFileTypes = config.allowedFileTypes || ['*/*'];

  function handleSubmit() {
    if (!canSend || disabled) return;

    const messageContent = message.trim();
    let finalMessage = messageContent;
    let finalAttachments = [...attachments];
    const finalSelectedTools = [...selectedTools];

    // Convert long text to attachment if needed
    if (shouldConvertToAttachment(messageContent)) {
      const textAttachment: ChatAttachment = {
        id: crypto.randomUUID(),
        type: 'text',
        name: 'Long message.txt',
        size: messageContent.length,
        mimeType: 'text/plain',
        content: messageContent,
        status: 'ready',
      };
      finalAttachments.push(textAttachment);
      finalMessage = `[Long message converted to attachment: ${textAttachment.name}]`;
    }

    onSend?.({
      content: finalMessage,
      attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
      selectedTools: finalSelectedTools,
    });

    // Reset form
    message = '';
    attachments = [];
    selectedTools = [];
    adjustTextareaHeight();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function adjustTextareaHeight() {
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      const maxHeight = 120; // 6 lines approximately
      const newHeight = Math.min(textareaElement.scrollHeight, maxHeight);
      textareaElement.style.height = `${newHeight}px`;
    }
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      // Validate file size
      if (file.size > maxFileSize) {
        onError?.({ 
          message: `File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB.` 
        });
        return;
      }

      // Validate file type
      const isAllowed = allowedFileTypes.some(type => {
        if (type === '*/*') return true;
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        onError?.({ 
          message: `File type ${file.type} is not allowed.` 
        });
        return;
      }

      try {
        const attachment = await createFileAttachment(file);
        attachments = [...attachments, attachment];
        
        // Simulate upload progress
        setTimeout(() => {
          attachments = attachments.map(att => 
            att.id === attachment.id 
              ? { ...att, status: 'ready' as const } 
              : att
          );
        }, 1000);

        onAttachmentAdd?.(attachment);
      } catch (err) {
        onError?.({ 
          message: `Failed to process file ${file.name}: ${err}` 
        });
      }
    });
  }

  function removeAttachment(attachmentId: string) {
    attachments = attachments.filter(att => att.id !== attachmentId);
    onAttachmentRemove?.(attachmentId);
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!event.relatedTarget || !event.currentTarget?.contains(event.relatedTarget as Node)) {
      isDragging = false;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    if (event.dataTransfer?.files) {
      handleFileSelect(event.dataTransfer.files);
    }
  }

  function handleVoiceResult(transcript: string) {
    message += (message ? ' ' : '') + transcript;
    adjustTextareaHeight();
    showVoiceInput = false;
    onVoiceResult?.({ transcript });
  }

  // Auto-adjust textarea height when message changes
  $effect(() => {
    if (message !== undefined) {
      setTimeout(adjustTextareaHeight, 0);
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class={cn(
    'relative bg-background border border-border rounded-lg transition-colors duration-200 shadow-2xl',
    {
      'ring-2 ring-primary': isDragging,
      'opacity-50': disabled,
    },
    className
  )}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <!-- Drag overlay -->
  {#if isDragging}
    <div class="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center z-10">
      <div class="text-center">
        <Paperclip class="w-8 h-8 mx-auto mb-2 text-primary" />
        <p class="text-sm font-medium">Drop files to attach</p>
      </div>
    </div>
  {/if}

  <!-- Attachments preview -->
  {#if attachments.length > 0}
    <div class="p-3 border-b border-border">
      <div class="flex flex-wrap gap-2">
        {#each attachments as attachment (attachment.id)}
          <AttachmentPreview 
            {attachment}
            remove={(eventData) => removeAttachment(eventData.attachmentId)}
          />
        {/each}
      </div>
    </div>
  {/if}

  <!-- Input area -->
  <div class="flex flex-col gap-2 pt-2">
     <!-- Text input -->
     <div class="flex-1 relative">
      <textarea
        bind:this={textareaElement}
        bind:value={message}
        {placeholder}
        {disabled}
        class="w-full resize-none border-none focus:ring-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none max-h-32"
        rows="1"
        onkeydown={handleKeydown}
        oncompositionstart={() => isComposing = true}
        oncompositionend={() => isComposing = false}
        oninput={adjustTextareaHeight}
        onfocusout={() => adjustTextareaHeight()}
      ></textarea>
    </div>
    <div class="flex-1 items-end gap-2 p-3">
      <!-- File upload button -->
      {#if config.enableFileUpload}
        <button
          type="button"
          class="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          onclick={() => fileInputElement?.click()}
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip class="w-4 h-4" />
        </button>
        
        <input
          bind:this={fileInputElement}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          class="hidden"
          onchange={(e) => handleFileSelect(e.target?.files)}
        />
      {/if}

      <!-- Tool selector button -->
      {#if config.enableToolCalls}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger class={cn(
            "flex-shrink-0 p-2 rounded-md transition-colors",
            showToolSelector 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          aria-label="Select tools"
          title="Select tools"
          {disabled}
          ><Wrench class="w-4 h-4" /></DropdownMenu.Trigger>
          <DropdownMenu.Content class="absolute bottom-6 left-2">
            <ToolSelector
              toolServers={toolServers}
              selectedTools={selectedTools}
              onToggleTool={(toolName) => {
                if (selectedTools.includes(toolName)) {
                  selectedTools = selectedTools.filter(name => name !== toolName);
                } else {
                  selectedTools = [...selectedTools, toolName];
                }
              }}
              onClose={() => showToolSelector = false}
            />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
  
      <!-- Voice input button -->
      {#if config.enableVoiceInput}
        <button
          type="button"
          class={cn(
            "p-2 rounded-md transition-colors flex-shrink-0",
            showVoiceInput 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          onclick={() => showVoiceInput = !showVoiceInput}
          disabled={disabled}
          title={showVoiceInput ? "Stop voice input" : "Start voice input"}
        >
          {#if showVoiceInput}
            <MicOff class="w-4 h-4" />
          {:else}
            <Mic class="w-4 h-4" />
          {/if}
        </button>
      {/if}

      <div class="flex-shrink-0 inline-block">
        <ProviderSelector
          providers={providers}
          configuredProviderNames={configuredProviderNames}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onModelSelect={onModelSelect}
          disabled={disabled}
        />
      </div>
    
      <!-- Send button -->
      <button
        type="button"
        class={cn(
          "flex-shrink-0 p-2 rounded-md transition-colors float-right",
          canSend && !disabled
            ? "text-primary-foreground bg-primary hover:bg-primary/90"
            : "text-muted-foreground bg-muted cursor-not-allowed"
        )}
        onclick={handleSubmit}
        disabled={!canSend || disabled}
        title="Send message"
      >
        <Send class="w-4 h-4" />
      </button>
    </div>
  </div>


  <!-- Voice input overlay -->
  {#if showVoiceInput}
    <div class="absolute inset-0 bg-background/95 backdrop-blur rounded-lg flex items-center justify-center z-20">
      <VoiceInput
        onEnd={() => showVoiceInput = false}
        onStart={() => onVoiceStart?.()}
        onStop={() => onVoiceStop?.()}
        onResult={({transcript}) => handleVoiceResult(transcript)}
      />
    </div>
  {/if}
</div>