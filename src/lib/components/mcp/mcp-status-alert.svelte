<script lang="ts">
    import { mcpStartupManager, type StartupResult } from "@/mcp/startup-manager";

    interface Props {
        startupResult: StartupResult;
        loading: boolean;
    }

    let { startupResult, loading = false }: Props = $props();
    let isLoading = $state(loading);
    let initStatus = $state<StartupResult | null>(startupResult);
    $effect(() => {
        console.log('MCP initialization result:', initStatus, startupResult);
    });
</script>

<div class="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 absolute shadow-2xl top-20 right-0 z-50">
    <div class="flex items-center gap-2 text-sm">
      <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-yellow-800 dark:text-yellow-200">
        {#if initStatus?.total === 0 && !isLoading}
          No MCP servers configured. Tools functionality limited to built-in tools.
        {:else}
          MCP Status: {initStatus?.successful}/{initStatus?.total} servers running
          {#if initStatus?.failed && initStatus?.failed > 0}
            ({initStatus?.failed} failed)
          {/if}
        {/if}
      </span>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button 
        onclick={async () => {
          const result = await mcpStartupManager.reloadConfiguration();
          initStatus = result;
        }}
        class="ml-auto text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
        title="Reload MCP servers"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>