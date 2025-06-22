<script lang="ts">
  import { cn } from '@/utils';

  interface Props {
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    size = 'md',
    class: className = '',
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const containerSizes = {
    sm: 'gap-0.5 p-2',
    md: 'gap-1 p-3',
    lg: 'gap-1.5 p-4',
  };
</script>

<div 
  class={cn(
    'flex items-center justify-center bg-muted rounded-lg',
    containerSizes[size],
    className
  )}
  role="status"
  aria-label="Typing..."
>
  <div 
    class={cn(
      'bg-current rounded-full animate-bounce',
      sizeClasses[size]
    )}
    style="animation-delay: 0ms; animation-duration: 1400ms;"
  ></div>
  <div 
    class={cn(
      'bg-current rounded-full animate-bounce',
      sizeClasses[size]
    )}
    style="animation-delay: 200ms; animation-duration: 1400ms;"
  ></div>
  <div 
    class={cn(
      'bg-current rounded-full animate-bounce',
      sizeClasses[size]
    )}
    style="animation-delay: 400ms; animation-duration: 1400ms;"
  ></div>
</div>