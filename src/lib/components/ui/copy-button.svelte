<script lang="ts">
  import { cn, copyToClipboard } from '@/utils';
  import { Copy, Check } from '@lucide/svelte';

  interface Props {
    text: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'outline';
    class?: string;
    onclick?: () => void;
    onCopy?: (data: { text: string; success: boolean; error?: any }) => void;
  }

  let {
    text,
    size = 'md',
    variant = 'ghost',
    class: className = '',
    onclick,
    onCopy,
  }: Props = $props();

  let copied = $state(false);
  let timeout: number | null = null;

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

  async function handleCopy() {
    if (copied) return;

    try {
      const success = await copyToClipboard(text);
      
      if (success) {
        copied = true;
        onCopy?.({ text, success: true });
        
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          copied = false;
        }, 2000);
      } else {
        onCopy?.({ text, success: false });
      }
    } catch (error) {
      onCopy?.({ text, success: false, error });
    }

    onclick?.();
  }
</script>

<button
  class={cn(
    'rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    sizeClasses[size],
    variantClasses[variant],
    className
  )}
  onclick={handleCopy}
  title={copied ? 'Copied!' : 'Copy to clipboard'}
  disabled={copied}
>
  {#if copied}
    <Check class={cn(iconSizes[size], 'text-green-500')} />
  {:else}
    <Copy class={iconSizes[size]} />
  {/if}
</button>