<script lang="ts">
    import { onMount } from 'svelte';
    import { invoke } from '@tauri-apps/api/core';
    import ProviderCard from './provider-card.svelte';
    import AddProviderModal from './provider-add-dialog.svelte';
    import { cn } from '@/utils';
    import { getAppPrefsContext } from '@/stores/app-prefs.svelte';
    import type { ProviderConfig } from '@/ipc/genai/types';
    import * as Dialog from '@/components/ui/dialog';
    import { getProviderManagerContext } from '@/stores/provider-manager.svelte';

    const appPrefs = getAppPrefsContext();
    const providerManager = getProviderManagerContext();

    const CHECK_API_KEY_VALIDITY = false;
  
    let selectedProvider: ProviderConfig | null = $state(null);
    let checkingAPIKeyValidity = $state(false);
    let error = $state('');

    // Test provider connection
    async function checkAPIKeyValidity(provider: string): Promise<boolean> {
      try {
        checkingAPIKeyValidity = true;
        const isValid: boolean = await invoke('test_provider_connection', { provider });
        return isValid;
      } catch (err) {
        return false;
      } finally {
        checkingAPIKeyValidity = false;
      }
    }
  
    // Handle adding new provider key
    async function handleAddProvider(provider: ProviderConfig, apiKey: string) {
      try {
        selectedProvider = null;
        if(CHECK_API_KEY_VALIDITY) {
          const isValid = await checkAPIKeyValidity(provider.name);
          if(isValid) {
            await providerManager.saveProviderKey(provider.name, apiKey);
          } else {
            error = `Validation failed for ${provider.name}. Please check your API key, and try again.`;
          }
        } else {
          await providerManager.saveProviderKey(provider.name, apiKey);
        }
      } catch (err) {
        error = `Failed to add provider: ${err}`;
      }
    }
  
    // Open add provider modal
    function openAddModal(provider: ProviderConfig) {
      selectedProvider = provider;
    }
  
    onMount(async () => {
      selectedProvider = null;
      try {
        await providerManager.initialize();
      } catch (error) {
        console.error(`Failed to initialize provider manager: ${error}`);
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
    <h1 class="text-lg font-semibold">AI Provider Configuration</h1>
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      Securely manage your API keys for different AI providers using Stronghold encryption.
    </div>
  </div>
</header>
<div class="space-y-6 flex-1 overflow-y-auto scroll-smooth p-8">
    {#if error}
      <div class="error-banner">
        <span class="error-icon">⚠️</span>
        {error}
        <button onclick={() => error = ''} class="close-btn">×</button>
      </div>
    {/if}
      <div class="providers-grid">
        <Dialog.Root>
          {#each providerManager.providers as provider}
            <ProviderCard 
              {provider}
              isConfigured={providerManager.configuredProviders.includes(provider.name)}
              onAdd={() => openAddModal(provider)}
              onRemove={async () => await providerManager.removeProviderKey(provider.name)}
              onTest={async () => {
                const isValid = await checkAPIKeyValidity(provider.name);
                if(isValid) {
                  error = '';
                } else {
                  error = `Validation failed for ${provider.name}. Please check your API key, and try again.`;
                }
                return isValid;
              }}
              disabled={providerManager.actingOnKeys || checkingAPIKeyValidity}
            />
          {/each}
          {#if selectedProvider}
            <AddProviderModal 
              provider={selectedProvider} 
              onSave={async (apiKey: string) => handleAddProvider(selectedProvider!, apiKey)} 
              onCancel={() => { selectedProvider = null; }} 
            />
          {/if}
        </Dialog.Root>
      </div>
</div>
</div>
  
  <style>
    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fed7d7;
      color: #c53030;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
  
    .error-icon {
      font-size: 1.2rem;
    }
  
    .close-btn {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #c53030;
    }
  
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
    }
  
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #3182ce;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  
    .providers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }
  </style>