<script lang="ts">
    import { LockKeyhole, Eye, EyeClosed } from "@lucide/svelte";
    import type { ProviderConfig } from "@/ipc/genai/types";
    import * as Dialog from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import ProviderIcon from "./provider-icon.svelte";

    interface Props {
      provider: ProviderConfig;
      onSave: (apiKey: string) => Promise<void>;
      onCancel: () => void;
    }
    
    let { provider, onSave, onCancel }: Props = $props();
  
    let apiKey = $state('');
    let saving = $state(false);
    let error = $state('');
    let showKey = $state(false);
  
    function validateApiKey(key: string): boolean {
      if (!key.trim()) return false;
      
      // Basic validation based on known patterns
      switch (provider.name) {
        case 'openai':
          return key.startsWith('sk-') && key.length > 20;
        case 'anthropic':
          return key.startsWith('sk-ant-') && key.length > 20;
        case 'gemini':
          return key.startsWith('AI') && key.length > 20;
        case 'cohere':
          return key.startsWith('co-') || key.length > 20;
        case 'groq':
          return key.startsWith('gsk_') && key.length > 20;
        case 'xai':
          return key.startsWith('xai-') && key.length > 20;
        case 'deepseek':
          return key.startsWith('sk-') && key.length > 20;
        default:
          return key.length > 10; // Generic validation
      }
    }
  
    async function handleSave() {
      if (!validateApiKey(apiKey)) {
        error = `Invalid API key format. Expected format: ${provider.key_format}`;
        return;
      }
  
      saving = true;
      error = '';
  
      try {
        await onSave(apiKey);
      } catch (err) {
        error = `Failed to save API key: ${err}`;
      } finally {
        saving = false;
      }
    }
  
    function handleCancel() {
      apiKey = '';
      error = '';
      onCancel();
    }
  
    function openWebsite() {
      window.open(provider.website, '_blank');
    }
  
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Enter' && event.ctrlKey) {
        handleSave();
      }
    }
  
    function toggleShowKey() {
      showKey = !showKey;
    }
  </script>
  
  <svelte:window on:keydown={handleKeydown} />
  
  <Dialog.Content>
    <Dialog.Header class="flex gap-2 items-center text-center">
      <ProviderIcon provider={provider.name} />
      <Dialog.Title>Add API Key for {provider.display_name}</Dialog.Title>
      <Dialog.Description>
        Add your API key to use {provider.display_name}.
      </Dialog.Description>
    </Dialog.Header>
      <div class="p-6">
        <div class="mb-6">
          <p class="mb-2 text-muted-foreground text-center">{provider.description}</p>
          <div class="form-section">
            <label for="api-key" class="input-label">
              Your {provider.display_name} API key
              <span class="required">*</span>
            </label>
            
            <div class="input-wrapper">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                bind:value={apiKey}
                placeholder={provider.key_format}
                class="api-key-input"
                class:error={error}
                disabled={saving}
              />
              
              <button
                type="button"
                class="toggle-visibility"
                onclick={toggleShowKey}
                disabled={saving}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {#if showKey}
                  <Eye class="w-6 h-6 text-gray-500" />
                {:else}
                  <EyeClosed class="w-6 h-6 text-gray-500" />
                {/if}
              </button>
            </div>
    
            <div class="input-help">
              <p>Your API key will be encrypted and stored securely using Stronghold.</p>
              {#if apiKey && !validateApiKey(apiKey)}
                <p class="validation-warning">⚠️ Key format doesn't match expected pattern</p>
              {/if}
            </div>
    
            {#if error}
              <div class="error-message">
                <span class="error-icon">⚠️</span>
                {error}
              </div>
            {/if}
          </div>
  
          <div class="mt-4 bg-accent py-4 rounded-md text-center">
            <p class="text-muted-foreground text-sm">Don't have an API key?</p>
            <button class="text-sm font-bold cursor-pointer text-purple-400 hover:text-purple-600" onclick={openWebsite}>
              Get one from {provider.display_name} →
            </button>
          </div>
        </div>
  

      </div>
    <Dialog.Footer>
      <Button variant="outline" disabled={saving} onclick={handleCancel}>Cancel</Button>
      <Button disabled={saving || !apiKey.trim()} onclick={handleSave}>
        {#if saving}
          <span class="spinner w-4 h-4"></span>
          Saving...
        {:else}
          <LockKeyhole class="w-4 h-4" /> Save API Key
        {/if}
      </Button>
    </Dialog.Footer>
    <div class="keyboard-shortcuts">
      <span>Press <kbd>Esc</kbd> to cancel or <kbd>Ctrl+Enter</kbd> to save</span>
    </div>
  </Dialog.Content>
  
  <style>
  
    .form-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 1.5rem;
    }
  
    .input-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 0.5rem;
    }
  
    .required {
      color: #e53e3e;
    }
  
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
  
    .api-key-input {
      width: 100%;
      padding: 0.75rem;
      padding-right: 3rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.875rem;
      font-family: 'Monaco', 'Menlo', monospace;
      transition: border-color 0.2s;
    }
  
    .api-key-input:focus {
      outline: none;
      border-color: #3182ce;
      box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }
  
    .api-key-input.error {
      border-color: #e53e3e;
    }
  
    .api-key-input:disabled {
      background: #f7fafc;
      opacity: 0.6;
    }
  
    .toggle-visibility {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      font-size: 1rem;
      opacity: 0.7;
    }
  
    .toggle-visibility:hover:not(:disabled) {
      opacity: 1;
    }
  
    .toggle-visibility:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  
    .input-help {
      margin-top: 0.5rem;
    }
  
    .input-help p {
      font-size: 0.75rem;
      color: #a0aec0;
      margin: 0;
    }
  
    .validation-warning {
      color: #d69e2e !important;
      font-weight: 500 !important;
    }
  
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fed7d7;
      color: #c53030;
      padding: 0.75rem;
      border-radius: 6px;
      margin-top: 1rem;
      font-size: 0.875rem;
    }
  
    .error-icon {
      font-size: 1rem;
    }
  
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  
    .keyboard-shortcuts {
      text-align: center;
      padding: 0 1.5rem 1rem;
      font-size: 0.75rem;
      color: #a0aec0;
    }
  
    kbd {
      background: #edf2f7;
      border: 1px solid #cbd5e0;
      border-radius: 4px;
      padding: 0.125rem 0.25rem;
      font-family: monospace;
      font-size: 0.7rem;
    }
  </style>