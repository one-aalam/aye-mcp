<script lang="ts">
  import { Unplug, PlugZap, Key } from '@lucide/svelte';
  import * as Card from '@/components/ui/card';
  import * as Dialog from '@/components/ui/dialog';
  import { cn } from '@/utils';
  import Button from '../ui/button/button.svelte';
  import type { ProviderConfig } from '@/ipc/genai/types';
  import ProviderIcon from './provider-icon.svelte';

  interface Props {
    provider: ProviderConfig;
    isConfigured: boolean;
    onAdd: () => void;
    onRemove: () => void;
    onTest: () => Promise<boolean>;
    disabled?: boolean;
  }

  let {provider, onAdd, onRemove, onTest, disabled = false, isConfigured = false}: Props = $props();
  
  let testing = $state(false);
  let testResult = $state<boolean | null>(null);
  
  async function handleTest() {
    testing = true;
    testResult = null;
    
    try {
      testResult = await onTest();
    } catch (err) {
      testResult = false;
    } finally {
      testing = false;
    }
  }
  
  function openWebsite() {
    window.open(provider.website, '_blank');
  }
</script>
  
<Card.Root class={cn("provider-card hover:border-gray-300 hover:shadow-sm transition-all relative overflow-hidden", { "border-2 border-green-300 bg-gradient-to-br from-green-300/10 to-green-300/20": isConfigured })}>
    <Card.Header class="flex gap-2">
      <div class="flex-grow">
        <div class="flex flex-col gap-2">
          <h3 class="font-semibold text-xl">{provider.display_name}</h3>
          <div class={cn("w-fit text-xs font-medium border border-border rounded-full px-2 py-1 bg-accent text-accent-foreground", { "configured": isConfigured })}>
            {isConfigured ? '✓ Configured' : '○ Not Configured'}
          </div>
        </div>
      </div>
      
      <ProviderIcon provider={provider.name} />
    </Card.Header>
  
    <Card.Content>
      <p class="text-muted-foreground mb-1">{provider.description}</p>
      
      <div class="flex gap-2">
        <div class="flex-grow flex flex-col mt-4">
          <span class="inline-block text-xs font-medium text-muted-foreground w-full text-left">Available Models</span>
          <div class="flex flex-wrap gap-2 mt-2">
            {#each provider.models.slice(0, 3) as model}
              <span class="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">{model}</span>
            {/each}
            {#if provider.models.length > 3}
              <span class="text-xs font-medium text-muted-foreground">+{provider.models.length - 3} more</span>
            {/if}
          </div>
        </div>

        <div class="flex flex-col gap-0.5 flex-shrink-0 mt-4">
          <span class="inline-block text-xs font-medium text-muted-foreground w-full text-left">Key Format</span>
          <code class="inline-block text-xs font-medium bg-accent text-accent-foreground px-2 py-2 rounded-sm w-full font-mono">{provider.key_format}</code>
        </div>
      </div>
    </Card.Content>
  
    <Card.Footer class="flex gap-2 mb-2">
      <div class="primary-actions flex-grow flex gap-2">
        {#if isConfigured}
          
          <Button 
            onclick={handleTest}
            disabled={disabled || testing}
          >
            {#if testing}
              <PlugZap class="w-4 h-4 animate-spin" /> Testing...
            {:else}
              <PlugZap class="w-4 h-4" /> Check
            {/if}
          </Button>

          <Button 
          variant="outline"
          color="danger" 
          onclick={onRemove}
          {disabled}
        >
          Remove Key
        </Button>
        {:else}
          <Dialog.Trigger>
          <Button 
            variant="default" 
            onclick={onAdd}
            {disabled}
          >
            <Key class="w-4 h-4" /> Add API Key
          </Button>
          </Dialog.Trigger>
        {/if}
      </div>
  
      {#if !provider.is_configured}
      <div class="secondary-actions flex-shrink-0">
        <Button 
          variant="link"
          class="text-primary"
          onclick={openWebsite}
        >
          Get API Key &rarr;
        </Button>
      </div>
      {/if}
    </Card.Footer>
    {#if testResult !== null}
      <Card.Footer onclick={() => testResult = null} class={cn("test-result absolute bottom-0 left-0 right-0 text-xs uppercase px-2 py-1 cursor-pointer", { "bg-green-500 text-white hover:bg-green-600": testResult, "bg-red-500 text-white hover:bg-red-600": !testResult })}>
        {#if testResult}
          &nbsp;  &nbsp; <PlugZap class="w-4 h-4" /> &nbsp; Connection successful
        {:else}
          &nbsp;  &nbsp; <Unplug class="w-4 h-4" /> &nbsp; Connection failed
        {/if}
      </Card.Footer>
    {/if}
  </Card.Root>
  
  <style>
  
    
  </style>