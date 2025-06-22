<script lang="ts">
  import { cn, formatTime } from '@/utils';
  import type { ThinkingProcess } from '@/types';
  import { Brain, ChevronRight, Clock, CheckCircle, XCircle } from '@lucide/svelte';

  interface Props {
    thinking: ThinkingProcess;
    collapsed?: boolean;
    class?: string;
    onToggle(eventData: { thinkingId: string, expanded: boolean } ): void
  }

  let {
    thinking,
    collapsed = true,
    class: className = '',
    onToggle,
  }: Props = $props();


  let isExpanded = $state(!collapsed);

  function toggleExpanded() {
    isExpanded = !isExpanded;
    onToggle?.({ thinkingId: thinking.id, expanded: isExpanded })
  }

  function getStatusIcon(status: ThinkingProcess['status']) {
    switch (status) {
      case 'thinking': return Clock;
      case 'complete': return CheckCircle;
      case 'error': return XCircle;
    }
  }

  function getStatusColor(status: ThinkingProcess['status']) {
    switch (status) {
      case 'thinking': return 'text-blue-500';
      case 'complete': return 'text-green-500';
      case 'error': return 'text-red-500';
    }
  }

  function getStepTypeColor(type: string) {
    switch (type) {
      case 'reasoning': return 'text-blue-600 dark:text-blue-400';
      case 'analysis': return 'text-purple-600 dark:text-purple-400';
      case 'decision': return 'text-orange-600 dark:text-orange-400';
      case 'conclusion': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }

  const duration = thinking.endTime 
    ? thinking.endTime.getTime() - thinking.startTime.getTime()
    : Date.now() - thinking.startTime.getTime();
</script>

<div class={cn(
  'border border-border rounded-lg bg-muted/20 overflow-hidden transition-all duration-200',
  className
)}>
  <!-- Header -->
  <button
    class="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
    onclick={toggleExpanded}
  >
    <div class="flex-shrink-0">
      <Brain class="w-4 h-4 text-muted-foreground" />
    </div>
    
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Thinking Process</span>
        <div class={cn('flex items-center gap-1', getStatusColor(thinking.status))}>
          {#if thinking.status === 'thinking'}
            <Clock class="w-3 h-3 animate-pulse" />
          {:else}
            <!-- svelte-ignore svelte_component_deprecated -->
            <svelte:component this={getStatusIcon(thinking.status)} class="w-3 h-3" />
          {/if}
          <span class="text-xs capitalize">{thinking.status}</span>
        </div>
      </div>
      
      <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <span>{thinking.steps.length} steps</span>
        <span>•</span>
        <span>{Math.round(duration / 1000)}s</span>
        {#if thinking.endTime}
          <span>•</span>
          <span>completed {formatTime(thinking.endTime)}</span>
        {/if}
      </div>
    </div>
    
    <div class="flex-shrink-0 transition-transform duration-200" class:rotate-90={isExpanded}>
      <ChevronRight class="w-4 h-4" />
    </div>
  </button>

  <!-- Content -->
  {#if isExpanded}
    <div class="border-t border-border">
      <div class="p-3 space-y-3 max-h-96 overflow-y-auto">
        {#each thinking.steps as step, index (step.id)}
          <div class="flex gap-3">
            <!-- Timeline -->
            <div class="flex flex-col items-center flex-shrink-0">
              <div class={cn(
                'w-2 h-2 rounded-full border-2 border-current',
                getStepTypeColor(step.type)
              )}></div>
              {#if index < thinking.steps.length - 1}
                <div class="w-px h-4 bg-border mt-1"></div>
              {/if}
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0 pb-2">
              <div class="flex items-center gap-2 mb-1">
                <span class={cn('text-xs font-medium capitalize', getStepTypeColor(step.type))}>
                  {step.type}
                </span>
                <span class="text-xs text-muted-foreground">
                  {formatTime(step.timestamp)}
                </span>
              </div>
              <div class="text-sm text-foreground/90 leading-relaxed">
                {step.content}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>