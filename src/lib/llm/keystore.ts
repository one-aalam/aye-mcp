import { invoke } from '@tauri-apps/api/core';
import { StrongholdStoreFactory } from '@/stronghold';

const GENAI_PROVIDER_KEYS = 'genai-provider-keys';
const GENAI_PROVIDER_SUPPORTED = ['openai', 'anthropic', 'gemini', 'cohere', 'groq', 'xai', 'deepseek'];

export class GenAIKeyStore {
  // Save API key to Stronghold
  async saveProviderKey(provider: string, apiKey: string) {
    const store = await StrongholdStoreFactory.getInstance(GENAI_PROVIDER_KEYS);
    await store.insert(this.getKeyName(provider), apiKey);
    await invoke('save_provider_key', {
      request: {
        provider,
        api_key: apiKey,
        // display_name: 'OpenAI' // Optional
      }
    });
  }

  // Remove API key from Stronghold
  async removeProviderKey(provider: string) {
    const store = await StrongholdStoreFactory.getInstance(GENAI_PROVIDER_KEYS);
    await store.remove(this.getKeyName(provider));
    await invoke('remove_provider_key', {
      request: {
        provider
      }
    });
  }

  // Get API key from Stronghold
  async getProviderKey(provider: string) {
    const store = await StrongholdStoreFactory.getInstance(GENAI_PROVIDER_KEYS);
    return await store.get(this.getKeyName(provider));
  }

  // Get all API keys from Stronghold
  async getAllProviderKeys() {
    const store = await StrongholdStoreFactory.getInstance(GENAI_PROVIDER_KEYS);
    return await store.getAll(GENAI_PROVIDER_SUPPORTED.map(p => this.getKeyName(p)));
  }

  async hasConfiguredProviders() {
    const keys = await this.getAllProviderKeys();
    return keys.some(({value}) => value !== null);
  }

  async getConfiguredProviders() {
    const keys = await this.getAllProviderKeys();
    return keys.filter(({value}) => value !== null);
  }

  async getConfiguredProvidersNames() {
    const keys = await this.getConfiguredProviders();
    return keys.map(({key}) => key.replace('_api_key', ''));
  }

  // Load all API keys from Stronghold
  async loadConfiguredKeys() {
    const keys = await this.getConfiguredProviders();
    for (const {key, value} of keys) {
      if(value) {
        await invoke('save_provider_key', {
          request: {
            provider: key,
            api_key: value,
            // display_name: 'OpenAI' // Optional
          }
        });
      }
    }
  }

  private getKeyName(provider: string) {
    return `${provider}_api_key`;
  }
}

export const genaiKeyStore = new GenAIKeyStore();