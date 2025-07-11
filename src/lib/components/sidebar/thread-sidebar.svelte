<script lang="ts">
  import { Button } from '@/components/ui/button';
    import { cn, formatTime } from '@/utils.js';
    import type { ChatThread } from '@/types/index.js';
    import { 
      Plus, 
      MessageSquare, 
      MoreHorizontal, 
      Trash2, 
      Archive, 
      Pin, 
      PinOff,
      Search,
      X,
      Loader2,

      SettingsIcon,

      MessageCircle,
      HandPlatter,

    } from '@lucide/svelte';
  
    interface Props {
      threads: ChatThread[];
      currentThreadId?: string | null;
      isLoading?: boolean;
      error?: string | null;
      class?: string;
      onCreate?: () => void;
      onSelect?: (threadId: string) => void;
      onDelete?: (threadId: string) => void;
      onPin?: (threadId: string) => void;
      onArchive?: (threadId: string) => void;
      onDuplicate?: (threadId: string) => void;
    }
  
    let {
      threads,
      currentThreadId = null,
      isLoading = false,
      error = null,
      class: className = '',
      onCreate,
      onSelect,
      onDelete,
      onPin,
      onArchive,
      onDuplicate,
    }: Props = $props();
    
    let searchQuery = $state('');
    let showSearch = $state(false);
    let deleteConfirmId = $state<string | null>(null);
    let threadMenuOpen = $state<string | null>(null);
  
    // Filter threads based on search
    const filteredThreads = $derived.by(() => {
      if (!searchQuery.trim()) return threads;
      
      const query = searchQuery.toLowerCase();
      return threads.filter(thread => 
        thread.title.toLowerCase().includes(query) ||
        thread.description?.toLowerCase().includes(query) ||
        thread.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  
    function handleSelectThread(threadId: string) {
      if (currentThreadId !== threadId) {
        onSelect?.(threadId);
      }
    }
  
    function handleDeleteThread(threadId: string) {
      if (deleteConfirmId === threadId) {
        onDelete?.(threadId);
        deleteConfirmId = null;
      } else {
        deleteConfirmId = threadId;
      }
    }
  
    function cancelDelete() {
      deleteConfirmId = null;
    }
  
    function toggleThreadMenu(threadId: string) {
      threadMenuOpen = threadMenuOpen === threadId ? null : threadId;
    }
  
    function closeThreadMenu() {
      threadMenuOpen = null;
    }
  
    function toggleSearch() {
      showSearch = !showSearch;
      if (!showSearch) {
        searchQuery = '';
      }
    }
  
    function formatThreadDate(dateStr: string): string {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
      if (diffDays === 0) {
        return formatTime(date);
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  
    // Close menus when clicking outside
    function handleClickOutside(event: Event) {
      const target = event.target as HTMLElement;
      if (!target.closest('.thread-menu')) {
        closeThreadMenu();
      }
    }
  </script>
  
  <svelte:window onclick={handleClickOutside} />
  
  <div class={cn(
    'flex flex-col h-full bg-card border-r border-border',
    className
  )}>
    <!-- Header -->
    <div class="flex-shrink-0 p-4 border-b border-border">
      <!-- Create Thread Button -->
      <div class="flex flex-row gap-2 py-2">
        <Button
          class="flex-1"
          onclick={() => onCreate?.()}
          disabled={isLoading}
        >
          {#if isLoading}
            <Loader2 class="w-4 h-4 animate-spin" />
          {:else}
            <Plus class="w-4 h-4" />
          {/if}
          New Chat
        </Button>
        <!-- <Separator orientation="vertical" /> -->
        <Button
          variant="ghost"
          class="ml-0"
          onclick={toggleSearch}
          title="Search conversations"
        >
          {#if showSearch}
            <X class="w-4 h-4" />
          {:else}
            <Search class="w-4 h-4" />
          {/if}
        </Button>
      </div>
      <!-- Search Input -->
      {#if showSearch}
        <div class="mb-3">
          <input
            type="text"
            placeholder="Search conversations..."
            bind:value={searchQuery}
            class="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            autofocus
          />
        </div>
      {/if}
      <div class="flex flex-col gap-2 py-2">
        <a href="/settings" class="flex items-center gap-2"><SettingsIcon class="w-4 h-4" /> Settings</a>
        <a href="/providers" class="flex items-center gap-2"><HandPlatter class="w-4 h-4" /> Providers</a>
        <a href="/" class="flex items-center gap-2"><MessageCircle class="w-4 h-4" /> Chat</a>
      </div>
    </div>
  
    <!-- Thread List -->
    <div class="flex-1 overflow-y-auto">
      {#if error}
        <div class="p-4">
          <div class="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        </div>
      {:else if isLoading && threads.length === 0}
        <div class="p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="w-4 h-4 animate-spin" />
            Loading conversations...
          </div>
        </div>
      {:else if filteredThreads.length === 0}
        <div class="p-4">
          {#if searchQuery}
            <div class="text-center text-sm text-muted-foreground">
              No conversations found for "{searchQuery}"
            </div>
          {:else}
            <div class="text-center text-sm text-muted-foreground">
              <MessageSquare class="w-8 h-8 mx-auto mb-2 opacity-50" />
              No conversations yet
              <br />
              Create your first conversation to get started
            </div>
          {/if}
        </div>
      {:else}
        <div class="p-2 space-y-1">
          {#each filteredThreads as thread (thread.id)}
            {@const isActive = currentThreadId === thread.id}
            {@const isDeleting = deleteConfirmId === thread.id}
            {@const showMenu = threadMenuOpen === thread.id}
            
            <div class="relative">
              <!-- Thread Item -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class={cn(
                  'group relative p-3 rounded-lg cursor-pointer transition-all duration-200',
                  isActive 
                    ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/20' 
                    : 'hover:bg-muted border-transparent',
                  isDeleting && 'bg-destructive/10 border-destructive/20'
                )}
                onclick={() => !isDeleting && handleSelectThread(thread.id)}
              >
                <!-- Thread Content -->
                <div class="flex items-start gap-3">
                  <!-- Pin Indicator -->
                  {#if thread.is_pinned}
                    <Pin class="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                  {/if}
  
                  <div class="flex-1 min-w-0">
                    <!-- Title -->
                    <h3 class={cn(
                      'font-medium text-sm truncate mb-1',
                      isActive ? 'text-primary' : 'text-foreground',
                    )}>
                      {thread.title}
                    </h3>
  
                    <!-- Metadata -->
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{thread.message_count} messages</span>
                      <span>•</span>
                      <span>{formatThreadDate(thread.updated_at.toISOString())}</span>
                    </div>
  
                    <!-- Tags -->
                    {#if thread.tags.length > 0}
                      <div class="flex gap-1 mt-2">
                        {#each thread.tags.slice(0, 2) as tag}
                          <span class="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                            {tag}
                          </span>
                        {/each}
                        {#if thread.tags.length > 2}
                          <span class="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                            +{thread.tags.length - 2}
                          </span>
                        {/if}
                      </div>
                    {/if}
                  </div>
  
                  <!-- Actions -->
                  <div class={cn(
                    'flex items-center opacity-0 group-hover:opacity-100 transition-opacity',
                    (isActive || showMenu) && 'opacity-100'
                  )}>
                    {#if isDeleting}
                      <div class="flex items-center gap-1">
                        <button
                          class="p-1 text-destructive hover:bg-destructive/10 rounded"
                          onclick={(event) => {
                            event.stopPropagation();
                            handleDeleteThread(thread.id);
                          }}
                          title="Confirm delete"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                        <button
                          class="p-1 text-muted-foreground hover:bg-muted rounded"
                          onclick={(event) => {
                            event.stopPropagation();
                            cancelDelete();
                            }}
                          title="Cancel"
                        >
                          <X class="w-3 h-3" />
                        </button>
                      </div>
                    {:else}
                      <button
                        class="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded thread-menu"
                        onclick={(event) => {
                          event.stopPropagation();
                          toggleThreadMenu(thread.id);
                        }}
                        title="More options"
                      >
                        <MoreHorizontal class="w-3 h-3" />
                      </button>
                    {/if}
                  </div>
                </div>
  
                <!-- Delete Confirmation Overlay -->
                {#if isDeleting}
                  <div class="absolute inset-0 bg-destructive/5 rounded-lg flex items-center justify-center pointer-events-none">
                    <span class="text-xs text-destructive font-medium">
                      Click trash to confirm deletion
                    </span>
                  </div>
                {/if}
              </div>
  
              <!-- Thread Menu Dropdown -->
              {#if showMenu}
                <div class="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10 thread-menu">
                  <div class="py-1">
                    <button
                      class="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onclick={() => {
                        onDuplicate?.(thread.id);
                        closeThreadMenu();
                      }}
                    >
                      <MessageSquare class="w-4 h-4" />
                      Duplicate
                    </button>
                    
                    <button
                      class="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onclick={() => {
                        onPin?.(thread.id);
                        closeThreadMenu();
                      }}
                    >
                      {#if thread.is_pinned}
                        <PinOff class="w-4 h-4" />
                        Unpin
                      {:else}
                        <Pin class="w-4 h-4" />
                        Pin
                      {/if}
                    </button>
                    
                    <button
                      class="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onclick={() => {
                        onArchive?.(thread.id);
                        closeThreadMenu();
                      }}
                    >
                      <Archive class="w-4 h-4" />
                      Archive
                    </button>
                    
                    <div class="border-t border-border my-1"></div>
                    
                    <button
                      class="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                      onclick={() => {
                        console.log(`Clicked trash for thread: ${thread.id}`);
                        handleDeleteThread(thread.id);
                        closeThreadMenu();
                      }}
                    >
                      <Trash2 class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  
    <!-- Footer Stats -->
    <div class="flex-shrink-0 p-4 border-t border-border">
      <div class="text-xs text-muted-foreground">
        {filteredThreads.length} of {threads.length} conversations
        {#if searchQuery}
          matching "{searchQuery}"
        {/if}
      </div>
    </div>
  </div>
  
  <style>
    .thread-menu {
      /* Ensure menu stays visible during interactions */
      z-index: 50;
    }
  </style>