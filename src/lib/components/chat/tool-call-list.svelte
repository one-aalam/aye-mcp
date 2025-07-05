<script lang="ts">
  import { cn, formatTime } from '@/utils';
  import type { ToolCall } from '@/types';
  import { 
    Cog, 
    CheckCircle, 
    XCircle, 
    Square, 
    Loader2,
    ChevronDown,
    ChevronRight
  } from '@lucide/svelte';

  interface Props {
    toolCalls: ToolCall[];
    class?: string;
    onCancel?: (eventData: { toolCallId: string}) => void
  }

  let {
    toolCalls,
    class: className = '',
    onCancel,
  }: Props = $props();

  let expandedCalls = $state<Set<string>>(new Set());

  function toggleExpanded(toolCallId: string) {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(toolCallId)) {
      newExpanded.delete(toolCallId);
    } else {
      newExpanded.add(toolCallId);
    }
    expandedCalls = newExpanded;
  }

  function getStatusIcon(status: ToolCall['status']) {
    switch (status) {
      case 'running': return Loader2;
      case 'complete': return CheckCircle;
      case 'error': return XCircle;
      case 'cancelled': return Square;
    }
  }

  function getStatusColor(status: ToolCall['status']) {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'complete': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
    }
  }
</script>

<div class={cn('space-y-2', className)}>
  {#each toolCalls as toolCall (toolCall.id)}
    {@const isExpanded = expandedCalls.has(toolCall.id)}
    {@const duration = toolCall.endTime 
      ? toolCall.endTime.getTime() - toolCall.startTime.getTime()
      : Date.now() - toolCall.startTime.getTime()}
    
    <div class="border border-border rounded-lg bg-card overflow-hidden">
      <!-- Header -->
      <div class="p-3 flex items-center gap-3">
        <div class="flex-shrink-0">
          <Cog class="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium font-mono">{toolCall.name}</span>
            <div class={cn('flex items-center gap-1', getStatusColor(toolCall.status))}>
              {#if toolCall.status === 'running'}
                <Loader2 class="w-3 h-3 animate-spin" />
              {:else}
                <!-- svelte-ignore svelte_component_deprecated -->
                <svelte:component this={getStatusIcon(toolCall.status)} class="w-3 h-3" />
              {/if}
              <span class="text-xs capitalize">{toolCall.status}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>started {formatTime(toolCall.startTime)}</span>
            <span>•</span>
            <span>{Math.round(duration / 1000)}s</span>
            {#if toolCall.endTime}
              <span>•</span>
              <span>completed {formatTime(toolCall.endTime)}</span>
            {/if}
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          {#if toolCall.status === 'running' && toolCall.canCancel}
            <button
              class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              onclick={() => onCancel?.({ toolCallId: toolCall.id })}
              title="Cancel tool execution"
            >
              <Square class="w-3.5 h-3.5" />
            </button>
          {/if}
          
          <button
            class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            onclick={() => toggleExpanded(toolCall.id)}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <!-- svelte-ignore svelte_component_deprecated -->
            <svelte:component 
              this={isExpanded ? ChevronDown : ChevronRight} 
              class="w-3.5 h-3.5" 
            />
          </button>
        </div>
      </div>

      <!-- Expanded content -->
      {#if isExpanded}
        <div class="border-t border-border bg-muted/20">
          <!-- Parameters -->
          {#if Object.keys(toolCall.parameters).length > 0}
            <div class="p-3 border-b border-border">
              <h4 class="text-xs font-medium text-muted-foreground mb-2">Parameters</h4>
              <pre class="text-xs bg-background p-2 rounded border overflow-x-auto"><code>{JSON.stringify(toolCall.parameters, null, 2)}</code></pre>
            </div>
          {/if}

          <!-- Result -->
          {#if toolCall.result !== undefined}
            <div class="p-3 border-b border-border">
              <h4 class="text-xs font-medium text-muted-foreground mb-2">Result</h4>
              <pre class="text-xs bg-background p-2 rounded border overflow-x-auto max-h-32"><code>{JSON.stringify(toolCall.result, null, 2)}</code></pre>
            </div>
          {/if}

          <!-- Error -->
          {#if toolCall.error}
            <div class="p-3">
              <h4 class="text-xs font-medium text-destructive mb-2">Error</h4>
              <pre class="text-xs bg-destructive/10 text-destructive p-2 rounded border overflow-x-auto"><code>{toolCall.error}</code></pre>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>