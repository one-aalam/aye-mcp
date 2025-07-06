<script lang="ts">
    import { onMount } from 'svelte';
    import { RefreshCcw, ListRestartIcon, Trash2, SquarePen, CircleCheckBig, CircleMinus, CirclePlus, ServerCog, Terminal, Brackets } from '@lucide/svelte';
    import * as Dialog from '@/components/ui/dialog';
    import * as AlertDialog from '@/components/ui/alert-dialog';
    import { Switch } from '@/components/ui/switch';
    import { Button } from '@/components/ui/button';
    import { mcpConfigManager } from '@/mcp/config-manager';
    import { mcpStartupManager } from '@/mcp/startup-manager';
    import type { MCPConfigFile, MCPServerConfig } from '@/types/mcp-config';
    import { cn } from '@/utils';
    import { mcpManager } from '@/mcp/mcp-manager';
    import { getAppPrefsContext } from '@/stores/app-prefs.svelte.js';
    import ThemeToggle from '../ui/theme-toggle.svelte';
    import { createConfigServerId } from '@/mcp/server-id';

    const appPrefs = getAppPrefsContext();
  
    let config = $state<MCPConfigFile | null>(null);
    let status = $state<Map<string, 'connected' | 'connecting' | 'disconnected' | 'error' | 'unknown'>>(new Map());
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let editingServer = $state<string | null>(null);
    let newServerName = $state('');
    let newServerConfig = $state<MCPServerConfig>({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-'],
      description: '',
      enabled: true,
      timeout: 30000,
      retries: 3
    });
  
    onMount(async () => {
      await loadConfig();
    });
  
    async function loadConfig() {
      try {
        isLoading = true;
        error = null;
        config = await mcpConfigManager.loadConfig();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load configuration';
        console.error('Failed to load MCP config:', err);
      } finally {
        isLoading = false;
      }
    }
  
    async function saveConfig() {
      if (!config) return;
      
      try {
        await mcpConfigManager.saveConfig(config);
        // Show success notification
        console.log('MCP configuration saved successfully');
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to save configuration';
        console.error('Failed to save MCP config:', err);
      }
    }
  
    async function toggleServer(serverName: string, enabled: boolean) {
      if (!config) return;
      
      config.mcpServers[serverName].enabled = enabled;
      await saveConfig();
      
      // Restart the affected server
      if (enabled) {
        try {
          await mcpStartupManager.addServerToConfig(serverName, config.mcpServers[serverName]);
        } catch (err) {
          console.error(`Failed to start server ${serverName}:`, err);
        }
      } else {
        try {
          await mcpStartupManager.removeServerFromConfig(serverName);
        } catch (err) {
          console.error(`Failed to stop server ${serverName}:`, err);
        }
      }
    }
  
    async function addServer() {
      if (!config || !newServerName.trim()) return;
      
      try {
        await mcpStartupManager.addServerToConfig(newServerName, newServerConfig);
        config.mcpServers[newServerName] = { ...newServerConfig };
        
        // Reset form
        newServerName = '';
        newServerConfig = {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-'],
          description: '',
          enabled: true,
          timeout: 30000,
          retries: 3
        };
        
        await loadConfig(); // Refresh the config
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to add server';
        console.error('Failed to add server:', err);
      }
    }
  
    async function removeServer(serverName: string) {
      if (!config) return;
      
      try {
        await mcpStartupManager.removeServerFromConfig(serverName);
        delete config.mcpServers[serverName];
        await loadConfig(); // Refresh the config
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to remove server';
        console.error('Failed to remove server:', err);
      }
    }
  
    async function testServer(serverName: string) {
      try {
        const serverStatus = await mcpManager.getServerStatus(serverName);
        if (serverStatus?.status === 'connected') {
          console.log(`Server ${serverName} is already connected`);
          return;
        }

        
        // Try to initialize the server
        await mcpManager.addServer(
          {
            ...config?.mcpServers[serverName]!,
            id: createConfigServerId(serverName),
            name: serverName,
            env: {},
          }
        );
        
        console.log(`Successfully tested server: ${serverName}`);
      } catch (err) {
        console.error(`Failed to test server ${serverName}:`, err);
        error = `Test failed for ${serverName}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  
    async function getServerStatus(serverName: string): Promise<"error" | "connected" | "disconnected" | "connecting" | "unknown"> {
      const status = await mcpManager.getServerStatus(serverName);
      return status?.status || 'unknown';
    }
  
    function getStatusColor(status: string): string {
      switch (status) {
        case 'connected': return 'text-green-500';
        case 'connecting': return 'text-yellow-500';
        case 'error': return 'text-red-500';
        default: return 'text-gray-500';
      }
    }
  
    function getStatusIcon(status: string): string {
      switch (status) {
        case 'connected': return '●';
        case 'connecting': return '◐';
        case 'error': return '●';
        default: return '○';
      }
    }
  
    function updateServerArg(serverName: string, index: number, value: string) {
      if (!config) return;
      config.mcpServers[serverName].args[index] = value;
    }
  
    function addServerArg(serverName: string) {
      if (!config) return;
      config.mcpServers[serverName].args.push('');
    }
  
    function removeServerArg(serverName: string, index: number) {
      if (!config) return;
      config.mcpServers[serverName].args.splice(index, 1);
    }

    onMount(async () => {
      if (config) {
        for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
          const serverStatus = await getServerStatus(serverName);
          status.set(serverName, serverStatus || 'unknown');
        }
      }
    });
  </script>

<div 
  class={cn(
    'flex flex-col bg-background text-foreground w-full'
  )}
>
<header class="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm">
  <div class="flex items-center gap-3">
    <button
      class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
      onclick={appPrefs.toggleSidebar}
      aria-label={appPrefs.sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      title={appPrefs.sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
  </button>
    <h1 class="text-lg font-semibold">MCP Server Configuration</h1>
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      Manage MCP servers and their settings
      <!---->
    </div>
  </div>

  <div class="flex items-center gap-2">
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>
          <ServerCog class="w-4 h-4" /> + New Server
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title class="flex items-center gap-2"><ServerCog class="w-4 h-4" /> New Server</Dialog.Title>
          <Dialog.Description class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="serverName" class="block text-sm font-medium mb-1">Server Name</label>
                <input
                  type="text"
                  id="serverName"
                  bind:value={newServerName}
                  placeholder="e.g., filesystem, brave_search"
                  class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label for="command" class="block text-sm font-medium mb-1">Command</label>
                <input
                  type="text"
                  id="command"
                  bind:value={newServerConfig.command}
                  class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
      
            <div>
              <label for="args" class="block text-sm font-medium mb-1">Arguments</label>
              <div class="space-y-2">
                {#each newServerConfig.args as arg, index}
                  <div class="flex gap-2">
                    <input
                      type="text"
                      id="args"
                      bind:value={newServerConfig.args[index]}
                      class="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onclick={() => newServerConfig.args.splice(index, 1)}
                      class="p-2 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <CircleMinus class="w-4 h-4" />
                    </button>
                  </div>
                {/each}
                <button
                  onclick={() => newServerConfig.args.push('')}
                  class="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
                >
                  <CirclePlus class="w-4 h-4" />
                  Add Argument
                </button>
              </div>
            </div>
      
            <div>
              <label for="description" class="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                id="description"
                bind:value={newServerConfig.description}
                placeholder="Brief description of what this server does"
                class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
      
            <div class="flex justify-end">
              <Button
                onclick={addServer}
                disabled={!newServerName.trim() || !newServerConfig.command.trim()}
              >
                Add Server
              </Button>
            </div>
          </Dialog.Description>
        </Dialog.Header>
      </Dialog.Content>
    </Dialog.Root>

    <button
      onclick={loadConfig}
      disabled={isLoading}
      class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
      aria-label="Reload Config"
      title="Reload Config"
    >
      <RefreshCcw class="w-4 h-4" />
    </button>

    <button
      onclick={() => mcpStartupManager.reloadConfiguration()}
      class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
      aria-label="Restart All Servers"
      title="Restart All Servers"
    >
      <ListRestartIcon class="w-4 h-4" />
    </button>

    <ThemeToggle onToggle={appPrefs.toggleTheme} />
  </div>
</header>
<div class="space-y-6 flex flex-col p-8">
    <!-- Error Display -->
    {#if error}
      <div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-destructive font-medium">Error</span>
        </div>
        <p class="text-destructive/80 mt-1">{error}</p>
      </div>
    {/if}
  
    <!-- Loading State -->
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    {:else if config}
      <!-- Server List -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Configured Servers</h3>
        
        {#if Object.keys(config.mcpServers).length === 0}
          <div class="text-center py-8 text-muted-foreground">
            <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No MCP servers configured</p>
            <p class="text-sm">Add a server below to get started</p>
          </div>
        {:else}
          {#each Object.entries(config.mcpServers) as [serverName, serverConfig]}
            <div class="border border-border rounded-lg p-4 space-y-4">
              <!-- Server Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class={cn('text-lg', getStatusColor(status.get(serverName) || 'unknown'))}>
                    {getStatusIcon(status.get(serverName) || 'unknown')}
                  </span>
                  <div>
                    <h4 class="font-medium flex items-center gap-2">{serverName}</h4>
                    {#if serverConfig.description}
                      <p class="text-sm text-muted-foreground">{serverConfig.description}</p>
                    {/if}
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <!-- Status Badge -->
                  <span class={cn(
                    'px-2 py-1 text-xs rounded-full',
                    status.get(serverName) === 'connected' ? 'bg-green-100 text-green-800' :
                    status.get(serverName) === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    status.get(serverName) === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {status.get(serverName)}
                  </span>
                  
                  <!-- Enable/Disable Toggle -->
                  <Switch
                    bind:checked={serverConfig.enabled}
                    onchange={(e) => toggleServer(serverName, !serverConfig.enabled)}/>
                  
                  <!-- Action Buttons -->
                  <button
                    onclick={() => testServer(serverName)}
                    class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                    title="Test Connection"
                  >
                    <CircleCheckBig class="w-4 h-4" />
                  </button>
                  
                  <button
                    onclick={() => editingServer = editingServer === serverName ? null : serverName}
                    class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                    title="Edit Server"
                  >
                    <SquarePen class="w-4 h-4" />
                  </button>

                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <button class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded" aria-label="Delete Server" title="Delete Server">
                        <Trash2 class="w-4 h-4 text-destructive" />
                      </button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Header>
                        <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                        <AlertDialog.Description>
                          This action cannot be undone. This will permanently delete this server and remove it from your config.
                        </AlertDialog.Description>
                      </AlertDialog.Header>
                      <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action class="bg-destructive/80 hover:bg-destructive" onclick={() => removeServer(serverName)}>Continue</AlertDialog.Action>
                      </AlertDialog.Footer>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </div>
              </div>
  
              <!-- Server Details (when not editing) -->
              {#if editingServer !== serverName}
                <div class="flex items-center gap-2 text-sm">
                    <!-- <span class="text-muted-foreground">Command:</span> -->
                    <code class="ml-2 bg-muted px-2 py-1 rounded flex items-center gap-2"><Terminal class="w-4 h-4" /> {serverConfig.command}</code>
                    <code class="ml-2 bg-muted px-2 py-1 rounded flex items-center gap-2 shadow-inner scroll-mx-0 overflow-x-auto">{serverConfig.args.join(' ')}</code>
                </div>
              {/if}
  
              <!-- Server Edit Form -->
              {#if editingServer === serverName}
                <div class="space-y-4 border-t pt-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="command" class="block text-sm font-medium mb-1">Command</label>
                      <input
                        type="text"
                        bind:value={serverConfig.command}
                        name="command"
                        aria-label="Command"
                        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-1" for="description">Description</label>
                      <input
                        type="text"
                        bind:value={serverConfig.description}
                        name="description"
                        aria-label="Description"
                        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
  
                  <div>
                    <label class="block text-sm font-medium mb-1" for="args">Arguments</label>
                    <div class="space-y-2">
                      {#each serverConfig.args as arg, index}
                        <div class="flex gap-2">
                          <input
                            type="text"
                            value={arg}
                            oninput={(e) => updateServerArg(serverName, index, e.target.value)}
                            class="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onclick={() => removeServerArg(serverName, index)}
                            class="p-2 text-destructive hover:bg-destructive/10 rounded"
                            aria-label="Remove Argument"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      {/each}
                      <button
                        onclick={() => addServerArg(serverName)}
                        class="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Argument
                      </button>
                    </div>
                  </div>
  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium mb-1" for="timeout">Timeout (ms)</label>
                      <input
                        type="number"
                        bind:value={serverConfig.timeout}
                        name="timeout"
                        aria-label="Timeout"
                        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-1" for="retries">Retries</label>
                      <input
                        type="number"
                        bind:value={serverConfig.retries}
                        name="retries"
                        aria-label="Retries"
                        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
  
                  <div class="flex justify-end gap-2 pt-2">
                    <button
                      onclick={() => editingServer = null}
                      class="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onclick={async () => {
                        await saveConfig();
                        editingServer = null;
                      }}
                      class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>