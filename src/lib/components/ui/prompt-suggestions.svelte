<script lang="ts">
  import { cn } from '@/utils';
  import type { PromptSuggestion } from '@/types';
  import Icon from '@lucide/svelte/icons/lightbulb';

  interface Props {
    suggestions: PromptSuggestion[];
    layout?: 'horizontal' | 'grid';
    showIcons?: boolean;
    class?: string;
    onSelect?: (suggestion: PromptSuggestion) => void;
  }

  let {
    suggestions,
    layout = 'horizontal',
    showIcons = true,
    class: className = '',
    onSelect,
  }: Props = $props();

  function handleSuggestionClick(suggestion: PromptSuggestion) {
    onSelect?.(suggestion);
  }

  const layoutClasses = {
    horizontal: 'flex gap-2 overflow-x-auto pb-2',
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2',
  };
</script>

{#if suggestions.length > 0}
  <div class={cn(
    'scroll-smooth',
    layoutClasses[layout],
    className
  )}>
    {#each suggestions as suggestion (suggestion.id)}
      <button
        class={cn(
          'flex items-center gap-2 px-3 py-2 text-sm text-left',
          'bg-card border border-border rounded-lg',
          'hover:bg-muted hover:border-primary/20 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          layout === 'horizontal' ? 'flex-shrink-0 whitespace-nowrap' : 'w-full'
        )}
        onclick={() => handleSuggestionClick(suggestion)}
      >
        {#if showIcons && suggestion.icon}
          <Icon name={suggestion.icon} class="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {/if}
        
        <span class={cn(
          'font-medium',
          layout === 'horizontal' ? '' : 'line-clamp-2'
        )}>
          {suggestion.text}
        </span>
        
        {#if suggestion.category}
          <span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {suggestion.category}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{/if}