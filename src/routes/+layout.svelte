<script lang="ts">
    import { goto } from '$app/navigation';
    import { getMessageThreadContext, setMessageThreadContext } from '@/stores/message-thread.svelte';
    import { setAppPrefsContext, getAppPrefsContext } from '@/stores/app-prefs.svelte';
    import { setMCPToolContext } from '@/stores/mcp-tool.svelte';
    import { cn } from '../lib';
	import '../app.css';
    import ThreadSidebar from '@/components/sidebar/thread-sidebar.svelte';
	
	let { children } = $props();
    let sidebarWidth = $state(320);
    let sidebarCollapsed = $state(false);
    let isResizing = $state(false);

    setMessageThreadContext();
    setAppPrefsContext();
    setMCPToolContext();

    const messageThread = getMessageThreadContext();
    const appPrefs = getAppPrefsContext();

    // Sidebar resizing
    function handleMouseDown(event: MouseEvent) {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isResizing) return;
        
        const newWidth = Math.max(240, Math.min(500, event.clientX));
        sidebarWidth = newWidth;
    }

    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
</script>

<main class="h-screen bg-background flex text-foreground overflow-hidden">
      <!-- Sidebar -->
  <div 
    class={cn(
    'relative flex-shrink-0 transition-all duration-300 ease-in-out',
    appPrefs.sidebarOpen ? '' : 'w-0'
    )}
  style:width={appPrefs.sidebarOpen ? `${sidebarWidth}px` : '0px'}
>
  <div class={cn(
    'h-full overflow-hidden',
    !appPrefs.sidebarOpen && 'opacity-0'
  )}>
    <ThreadSidebar
      threads={messageThread.threads}
      currentThreadId={messageThread.currentThreadId}
      isLoading={false}
      error={null}
      onCreate={messageThread.handleCreateThread}
      onSelect={(threadId) => {
        goto('/');
        messageThread.handleSelectThread(threadId);
      }}
      onDelete={messageThread.handleDeleteThread}
      onPin={messageThread.handlePinThread}
      onArchive={messageThread.handleArchiveThread}
      class="h-full"
    />
  </div>

  <!-- Resize Handle -->
  {#if !sidebarCollapsed}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-border hover:bg-primary/20 transition-colors"
      onmousedown={handleMouseDown}
      role="separator"
      aria-label="Resize sidebar"
      tabindex="0"
    ></div>
  {/if}
</div>
    {@render children()}
</main>
