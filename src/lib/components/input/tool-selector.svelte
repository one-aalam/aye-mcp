<script lang="ts">
  import type { MCPToolDef, MCPToolServerDef } from '@/types/mcp';
  import { Search, Delete } from '@lucide/svelte';
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { cn } from '@/utils';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    

  interface Props {
    toolServers: MCPToolServerDef[];
    selectedTools: string[];
    searchQuery?: string;
    onToggleTool: (toolName: string) => void;
    onClose: () => void;
    class?: string;
  }

  let {
    toolServers,
    selectedTools,
    searchQuery = '',
    onToggleTool,
    onClose,
    class: className = '',
  }: Props = $props();

  let searchInput: HTMLInputElement;
  let localSearchQuery = $state(searchQuery);

  function isToolSelected(toolName: string): boolean {
    return selectedTools.includes(toolName);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  function getToolIcon(tool: MCPToolDef): string {
    // Return appropriate icon based on tool type/category
    const name = tool.name.toLowerCase();
    
    if (name.includes('weather')) return 'cloud';
    if (name.includes('search') || name.includes('web')) return 'search';
    if (name.includes('file') || name.includes('read') || name.includes('write')) return 'file';
    if (name.includes('calc') || name.includes('math')) return 'calculator';
    if (name.includes('email') || name.includes('mail')) return 'mail';
    if (name.includes('calendar') || name.includes('schedule')) return 'calendar';
    if (name.includes('database') || name.includes('db')) return 'database';
    if (name.includes('api') || name.includes('request')) return 'globe';
    
    return 'tool';
  }

  function renderIcon(iconName: string) {
    const iconPaths: Record<string, string> = {
      cloud: 'M3 17a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2z M20 16V7a4 4 0 0 0-8 0V4a4 4 0 0 0-8 0v3',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
      calculator: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      database: 'M4 6v6s0 3 7 3 7-3 7-3V6M4 6s0-3 7-3 7 3 7 3M4 6s0 3 7 3 7-3 7-3M4 12v6s0 3 7 3 7-3 7-3v-6',
      globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    };
    
    return iconPaths[iconName] || iconPaths.tool;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class={cn('bg-background', className)}>
<DropdownMenu.Group class="w-52">
  <DropdownMenu.Label>Select Tools <span class="text-sm text-muted-foreground">({selectedTools.length} selected)</span></DropdownMenu.Label>
  <DropdownMenu.Separator />
  {#if toolServers.length === 0}
      <div class="p-8 text-center text-muted-foreground w-52">
        {#if localSearchQuery.trim()}
          <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div class="text-lg font-medium mb-2">No tools found</div>
          <div>Try adjusting your search terms</div>
        {:else}
          <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="text-lg font-medium mb-2">No tools available</div>
          <div>Connect MCP servers to see available tools</div>
        {/if}
      </div>
    <!-- Search -->
    <div class="pt-2 pb-2 border-b border-border">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          bind:this={searchInput}
          bind:value={localSearchQuery}
          type="text"
          placeholder="Search tools..."
          class="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    </div>
  {:else}
    {#each toolServers as serverGroup}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>{serverGroup.serverName} <span class="text-sm text-muted-foreground">({serverGroup.tools.length} tools)</span></DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <Tooltip.Provider>
            <Command.Root>
              <Command.Input class="w-full border-0 focus:ring-0" placeholder="Type a command..." />
                <Command.List>
                  <Command.Empty>No results found.</Command.Empty>
                  <Command.Group heading={`${serverGroup.serverName} (${serverGroup.tools.length} tools)`}>
                      {#each serverGroup.tools as tool}
                      {@const selected = isToolSelected(tool.name)}
                        <Command.Item class={cn(selected && 'bg-primary/5')}>
                          <Tooltip.Root>
                            <Tooltip.Trigger class={cn('flex items-center w-full')} onclick={() => onToggleTool(tool.name)}>
                              <svg xmlns="http://www.w3.org/2000/svg" class={cn(selected && 'text-primary', 'w-4 h-4')} fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d={renderIcon(getToolIcon(tool))} />
                              </svg>
                              <span class="ml-2 font-medium truncate">{tool.name.replace('mcp_', '').replace(`${serverGroup.serverName}_`, '')}</span>
                              <Switch class="ml-auto" checked={selected} onCheckedChange={() => onToggleTool(tool.name)} />
                            </Tooltip.Trigger>
                            <Tooltip.Content class="w-64">
                              <span>{tool.description}</span>
                            </Tooltip.Content>
                          </Tooltip.Root>
                        </Command.Item>
                      {/each}
                  </Command.Group>
                </Command.List>
            </Command.Root>
          </Tooltip.Provider>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    {/each}
    <!-- Footer -->
    {#if selectedTools.length > 0}
      <div class="bg-muted/30 p-2">
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} selected
          </div>
          <button
            onclick={() => {
              for (const toolName of selectedTools) {
                onToggleTool(toolName);
              }
            }}
            class="text-sm text-red-300 hover:text-red-500 ml-auto"
          >
            <Delete class="w-4 h-4 inline-block" /> clear all
          </button>
        </div>
      </div>
    {/if}
  {/if}
</DropdownMenu.Group>
</div>