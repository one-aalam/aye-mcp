<script lang="ts">
    import { CheckIcon, BotIcon, SettingsIcon, HandPlatter } from "@lucide/svelte";
    import { tick } from "svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import * as Command from "$lib/components/ui/command/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import type { ProviderConfig } from "@/ipc/genai/types";

    // Component props
    interface Props {
      providers: ProviderConfig[];
      configuredProviderNames: string[];
      selectedProvider?: string;
      selectedModel?: string;
      onModelSelect?: (model: string, provider: string) => void;
      disabled?: boolean;
    }
    
    let {
      providers,
      configuredProviderNames,
      selectedProvider = $bindable<string>(),
      selectedModel = $bindable<string>(),
      onModelSelect,
      disabled = false,
    }: Props = $props();
    
    let open = $state(false);
    let triggerRef = $state<HTMLButtonElement>(null!);
    
    // Filter to only show configured providers
    const configuredProviders = $derived(
      providers.filter(provider => configuredProviderNames.includes(provider.name))
    );
    
    // Get current provider config
    const currentProvider = $derived(
      configuredProviders.find(p => p.name === selectedProvider)
    );
    
    // Close dropdown and refocus trigger
    function closeAndFocusTrigger() {
      open = false;
      tick().then(() => {
        triggerRef?.focus();
      });
    }

    // Handle model selection
    async function handleModelSelect(modelName: string, providerName: string) {
      onModelSelect?.(modelName, providerName);
      closeAndFocusTrigger();
    }
</script>
    
<div
      class="flex gap-2"
    >
      <DropdownMenu.Root bind:open>
        <DropdownMenu.Trigger bind:ref={triggerRef} {disabled}>
            <Button variant="outline" size="sm" aria-label="Select provider and model" class="justify-between">
                <HandPlatter class="w-4 h-4" />
            </Button>
        </DropdownMenu.Trigger>
        
        <DropdownMenu.Content class="w-[280px]" align="end">
            <!-- Provider Selection Mode -->
            <DropdownMenu.Group>
              <DropdownMenu.Label class="flex items-center">
                <SettingsIcon class="mr-2 size-4" />
                Available Providers
              </DropdownMenu.Label>
              
              {#if configuredProviders.length === 0}
                <DropdownMenu.Item disabled class="text-muted-foreground">
                  No configured providers found
                </DropdownMenu.Item>
              {:else}
                {#each configuredProviders as provider (provider.name)}
                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger>
                          <!-- <TagsIcon class="mr-2 size-4" />
                          {provider.display_name} -->
                          <div class="flex flex-col">
                            <span class="font-medium">{provider.display_name}</span>
                            <span class="text-xs text-muted-foreground truncate">
                              {provider.models.length} model{provider.models.length !== 1 ? 's' : ''} available
                            </span>
                          </div>
                          {#if selectedProvider === provider.name}
                            <CheckIcon class="size-4" />
                          {/if}
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent class="p-0">     
                            {#if provider.models.length === 0}
                                <DropdownMenu.Item disabled class="text-muted-foreground">
                                    No models available
                                </DropdownMenu.Item>
                            {:else}

                                <Command.Root>
                                    <!-- <Command.Input placeholder="Search models..." class="h-9" /> -->
                                    <Command.List>
                                    <Command.Empty>No models found.</Command.Empty>
                                    <Command.Group>
                                        <DropdownMenu.Label class="flex items-center justify-between">
                                            <span class="flex items-center">
                                              <BotIcon class="mr-2 size-4" />
                                              {provider.display_name} Models
                                            </span>
                                        </DropdownMenu.Label>
                                        {#each provider.models as model (model)}
                                        <Command.Item
                                            value={model}
                                            onSelect={() => handleModelSelect(model, provider.name)}
                                            class="flex items-center justify-between"
                                        >
                                            <span class="font-mono text-sm">{model}</span>
                                            {#if selectedModel === model}
                                                <CheckIcon class="size-4" />
                                            {/if}
                                        </Command.Item>
                                        {/each}
                                    </Command.Group>
                                    </Command.List>
                                </Command.Root>
                            {/if}
                            </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                {/each}
              {/if}
            </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <div class="flex flex-col gap-1">   
        {#if selectedProvider}
          <div class="flex items-center gap-2 mt-1">
            <Badge variant="secondary" class="text-xs">
              {currentProvider?.display_name}
            </Badge>
            {#if selectedModel}
              <Badge variant="outline" class="text-xs">
                {selectedModel}
              </Badge>
            {/if}
          </div>
        {:else}
          <div class="flex items-center gap-2 mt-1">
            <Badge variant="secondary" class="text-xs">
                Select AI Provider & Model
            </Badge>
          </div>
        {/if}
    </div>
</div>