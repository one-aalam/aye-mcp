<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '@/utils';

  interface Props {
    audioLevel?: number;
    isRecording?: boolean;
    size?: 'sm' | 'md' | 'lg';
    barCount?: number;
    class?: string;
  }

  let {
    audioLevel = 0,
    isRecording = false,
    size = 'md',
    barCount = 12,
    class: className = '',
  }: Props = $props();

  let containerElement: HTMLDivElement;
  let bars: HTMLDivElement[] = [];

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const barHeights = {
    sm: 24,
    md: 36,
    lg: 48,
  };

  let animationId: number | null = null;

  function createBars() {
    if (!containerElement) return;

    // Clear existing bars
    containerElement.innerHTML = '';
    bars = [];

    const maxHeight = barHeights[size];
    const barWidth = Math.max(2, Math.floor((containerElement.clientWidth - (barCount - 1) * 2) / barCount));

    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = cn(
        'bg-current rounded-full transition-all duration-75 ease-out',
        `w-[${barWidth}px]`
      );
      bar.style.width = `${barWidth}px`;
      bar.style.minHeight = '4px';
      bar.style.height = '4px';
      bar.style.maxHeight = `${maxHeight}px`;
      
      containerElement.appendChild(bar);
      bars.push(bar);
    }
  }

  function animateBars() {
    if (!isRecording || bars.length === 0) {
      // Reset to idle state
      bars.forEach(bar => {
        bar.style.height = '4px';
      });
      return;
    }

    const maxHeight = barHeights[size];
    
    bars.forEach((bar, index) => {
      // Create wave-like animation with audio level influence
      const wave = Math.sin(Date.now() * 0.01 + index * 0.5) * 0.5 + 0.5;
      const randomVariation = Math.random() * 0.3 + 0.7;
      
      // Combine audio level, wave, and random variation
      const intensity = (audioLevel * 0.7 + wave * 0.2 + randomVariation * 0.1);
      const height = Math.max(4, Math.min(maxHeight, 4 + intensity * (maxHeight - 4)));
      
      bar.style.height = `${height}px`;
    });

    animationId = requestAnimationFrame(animateBars);
  }

  onMount(() => {
    createBars();
    
    // Start animation
    animateBars();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  });

  // Restart animation when recording state changes
  $effect(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    animateBars();
  });

  // Recreate bars when size changes
  $effect(() => {
    if (size) {
      createBars();
    }
  });
</script>

<div 
  bind:this={containerElement}
  class={cn(
    'flex items-end justify-center gap-0.5 mx-auto relative',
    sizeClasses[size],
    {
      'text-primary': isRecording,
      'text-muted-foreground': !isRecording,
    },
    className
  )}
  role="img"
  aria-label={isRecording ? `Recording audio, level ${Math.round(audioLevel * 100)}%` : 'Audio visualizer'}
>
  <!-- Bars will be dynamically created here -->
</div>

<!-- Pulsing ring effect when recording -->
{#if isRecording}
  <div 
    class={cn(
      'absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30',
      sizeClasses[size]
    )}
    style="animation-duration: 2s;"
  ></div>
{/if}

<style>
  @keyframes pulse-ring {
    0% {
      transform: scale(1);
      opacity: 0.3;
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
</style>