<script lang="ts">
  import { cn } from '@/utils';
  import { Sun, Moon } from '@lucide/svelte';

  interface Props {
    isDark?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'outline';
    class?: string;
    onToggle?: () => void;
  }

  let {
    isDark = false,
    size = 'md',
    variant = 'ghost',
    class: className = '',
    onToggle,
  }: Props = $props();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
    outline: 'border border-border hover:bg-muted',
  };

</script>

<button
  class={cn(
    'rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    sizeClasses[size],
    variantClasses[variant],
    className
  )}
  onclick={() => onToggle?.()}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  <div class="relative">
    {#if isDark}
      <Moon class={cn(iconSizes[size], 'transition-transform duration-200')} />
    {:else}
      <Sun class={cn(iconSizes[size], 'transition-transform duration-200')} />
    {/if}
  </div>
</button>