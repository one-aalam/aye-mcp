<script lang="ts">
  import { onMount } from 'svelte';
  import { cn, extractCodeBlocks } from '@/utils';
  import CopyButton from '@/components/ui/copy-button.svelte';

  interface Props {
    content: string;
    class?: string;
  }

  let { content, class: className = '' }: Props = $props();

  let renderedContent = $state('');
  let codeBlocks = $state<Array<{ language: string; code: string; id: string }>>([]);

  // Simple markdown renderer - in production, you'd use a proper markdown library
  function renderMarkdown(text: string): string {
    let html = text;

    // Extract code blocks first to avoid processing them
    const blocks = extractCodeBlocks(text);
    const blockPlaceholders: string[] = [];
    
    blocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      blockPlaceholders.push(placeholder);
      html = html.replace(/```\w*\n[\s\S]*?```/, placeholder);
    });

    // Process other markdown
    html = html
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Lists
      .replace(/^\* (.+)$/gim, '<li class="ml-4">$1</li>')
      .replace(/^- (.+)$/gim, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.+)$/gim, '<li class="ml-4">$2</li>')
      
      // Blockquotes
      .replace(/^> (.+)$/gim, '<blockquote class="border-l-4 border-primary bg-muted/20 pl-4 py-2 my-2 rounded-r">$1</blockquote>')
      
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph if doesn't start with a block element
    if (!html.startsWith('<h') && !html.startsWith('<blockquote') && !html.startsWith('<li')) {
      html = `<p class="mb-2">${html}</p>`;
    }

    // Restore code blocks with syntax highlighting placeholders
    blockPlaceholders.forEach((placeholder, index) => {
      const block = blocks[index];
      const blockId = `code-block-${index}`;
      const codeHtml = `
        <div class="relative group my-4">
          <div class="flex items-center justify-between bg-muted px-3 py-2 rounded-t-lg border-b">
            <span class="text-xs font-mono text-muted-foreground">${block.language}</span>
            <div id="${blockId}-copy" class="copy-button-container"></div>
          </div>
          <pre class="bg-muted p-3 rounded-b-lg overflow-x-auto"><code class="language-${block.language} text-sm font-mono">${escapeHtml(block.code)}</code></pre>
        </div>
      `;
      html = html.replace(placeholder, codeHtml);
      
      // Store code block data for copy buttons
      codeBlocks.push({
        ...block,
        id: blockId
      });
    });

    return html;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  onMount(() => {
    renderedContent = renderMarkdown(content);
    
    // Add copy buttons to code blocks after rendering
    setTimeout(() => {
      codeBlocks.forEach(block => {
        const container = document.getElementById(`${block.id}-copy`);
        if (container) {
          // Create copy button component instance
          // const copyButton = new CopyButton({
          //   target: container,
          //   props: {
          //     text: block.code,
          //     size: 'sm',
          //     variant: 'ghost',
          //     class: 'opacity-0 group-hover:opacity-100 transition-opacity'
          //   }
          // });
        }
      });
    }, 0);
  });

  // Update content when prop changes
  $effect(() => {
    if (content) {
      codeBlocks = [];
      renderedContent = renderMarkdown(content);
    }
  });
</script>

<div 
  class={cn('prose prose-sm dark:prose-invert max-w-none', className)}
  role="article"
>
  {@html renderedContent}
</div>

<style>
     @reference "../../../app.css";
     
  :global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
    @apply text-foreground;
  }
  
  :global(.prose p) {
    @apply text-foreground;
  }
  
  :global(.prose ul, .prose ol) {
    @apply list-none;
  }
  
  :global(.prose li) {
    @apply relative;
  }
  
  :global(.prose li::before) {
    @apply absolute -left-4 top-0 text-muted-foreground;
    content: "•";
  }
  
  :global(.prose blockquote) {
    @apply italic;
  }
  
  :global(.prose pre) {
    @apply my-0;
  }
  
  :global(.prose code) {
    @apply text-foreground;
  }
</style>