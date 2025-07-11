import { invoke } from "@tauri-apps/api/core";
import { genaiKeyStore } from "../llm/keystore";
import type { ProviderConfig } from "@/ipc/genai/types";
import { getContext, setContext } from "svelte";

// Provider management class
const PROVIDER_MANAGER_KEY = Symbol("provider_manager");
const LLM_LS_KEY = 'aye_mcp_curr_llm';

export class ProviderManager {

  providers = $state<ProviderConfig[]>([]); 
  configuredProviders = $state<string[]>([]);
  selectedProvider = $state<string | undefined>();
  selectedModel = $state<string | undefined>();

  loadingProviders = $state(false);
  initializing = $state(false);
  initialized = $state(false);
  actingOnKeys = $state(false);
  error = $state('');

  constructor() {
    $effect(() => {
      if(this.selectedProvider && this.selectedModel) {
        localStorage.setItem(LLM_LS_KEY, JSON.stringify({ provider: this.selectedProvider, model: this.selectedModel }));
      }
    });
  }

  loadProviders = async () => {
      try {
        this.loadingProviders = true;
        this.providers = await invoke('get_provider_configs');
      } catch (err) {
        console.error('Load providers error:', err);
      } finally {
        this.loadingProviders = false;
      }
  }

  handleProviderSelect = (provider: string) => {
    this.selectedProvider = provider;
  }

  handleModelSelect = async (model: string, provider: string) => {
    if(!this.configuredProviders.includes(provider)) {
      throw new Error(`Provider ${provider} not configured`);
    }
    if(!this.providers.find(p => p.name === provider)?.models.includes(model)) {
      throw new Error(`Model ${model} not found for provider ${provider}`);
    }

    if(provider !== this.selectedProvider) {
      try {
        await invoke('select_provider', { provider });
        this.selectedProvider = provider
      } catch (error) {
        console.error('Failed to select provider:', error);
        // We might want to show a toast notification here
      }
    }
    if(model !== this.selectedModel) {
      this.selectedModel = model;
    }
  }
    
  initialize = async () => {
    this.initializing = true;
    try {
      const configuredProviders = await genaiKeyStore.getConfiguredProvidersNames();
      if(configuredProviders.length > 0) {
        this.configuredProviders = configuredProviders;
        // load the rust side with keys
        await genaiKeyStore.loadConfiguredKeys();
        // load the providers
        await this.loadProviders();
        // load the selected provider and model
        const llmDetails = localStorage.getItem(LLM_LS_KEY);
        if(llmDetails) {
          try {
            const { provider, model } = JSON.parse(llmDetails);
            await this.handleModelSelect(model, provider);
            this.initialized = true;
          } catch (error) {
            console.error('Failed to load selected provider and model:', error);
          } finally {
            this.initializing = false;
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize provider manager:', error);
    } finally {
      this.initializing = false;
    }
  }


  saveProviderKey = async (provider: string, apiKey: string) => {
    try {
      this.actingOnKeys = true;
      await genaiKeyStore.saveProviderKey(provider, apiKey);
      if(!this.configuredProviders.includes(provider)) {
        this.configuredProviders.push(provider);
      }
    } catch (err) {
      throw new Error(`Failed to save API key: ${err}`);
    } finally {
      this.actingOnKeys = false;
    }
  }

  removeProviderKey = async (provider: string) => {
    if(this.selectedProvider === provider) {
      throw new Error(`Cannot remove API key for selected provider: ${provider}. Please select another provider first.`);
    }
    try {
      this.actingOnKeys = true;
      await genaiKeyStore.removeProviderKey(provider);
      this.configuredProviders = this.configuredProviders.filter(p => p !== provider);
    } catch (err) {
      throw new Error(`Failed to remove API key: ${err}`);
    } finally {
      this.actingOnKeys = false;
    }
  }

  retrieveAllProviderModels = async (): Promise<Record<string, string[]>> => {
    const allModels = await invoke('list_available_models');
    return allModels as Record<string, string[]>;
  }

  retrieveProviderModels = async (providerName: string): Promise<string[]> => {
    const allModels = await this.retrieveAllProviderModels();
    return allModels[providerName] || [];
  }
}


export const setProviderManagerContext = () => {
  const providerManager = new ProviderManager();
  return setContext(PROVIDER_MANAGER_KEY, providerManager);
}

export const getProviderManagerContext = () => {
  return getContext<ReturnType<typeof setProviderManagerContext>>(PROVIDER_MANAGER_KEY);
} 
  
// Usage example: OpenAI + Gemini vs Ollama
// export const providerManager = new ProviderManager();
//   await providerManager.initialize();
  
// Example: Use OpenAI for complex tasks, Gemini for quick queries, Ollama for local processing
export class SmartModelSelector {
    constructor(private providerManager: ProviderManager) {}
    
    async sendMessage(message: string, taskType: 'complex' | 'quick' | 'local' = 'quick') {
      let targetProvider: string;
      let model: string;
      
      switch (taskType) {
        case 'complex':
          // Use OpenAI for complex reasoning
          targetProvider = 'openai';
          model = 'gpt-4o-mini';
          break;
          
        case 'quick':
          // Use Gemini for quick responses
          targetProvider = 'gemini';
          model = 'gemini-2.0-flash';
          break;
          
        case 'local':
          // Use Ollama for local processing
          targetProvider = 'ollama';
          model = 'llama3.2:3b';
          break;
      }
      await this.providerManager.handleModelSelect(model, targetProvider);
      
      // Send the message
      const response = await invoke('send_direct_message', {
        request: {
          model,
          messages: [{ role: 'user', content: message }],
          options: this.getOptionsForTaskType(taskType)
        }
      });
      
      return {
        response: response.message,
        provider: targetProvider,
        model,
        taskType
      };
    }
    
    private getOptionsForTaskType(taskType: string) {
      switch (taskType) {
        case 'complex':
          return { temperature: 0.3, max_tokens: 4000 }; // More deterministic for complex tasks
        case 'quick':
          return { temperature: 0.7, max_tokens: 1000 }; // Balanced for quick responses
        case 'local':
          return { temperature: 0.5, max_tokens: 2000 }; // Moderate for local processing
        default:
          return { temperature: 0.7, max_tokens: 1000 };
      }
    }
  }
  
  // Usage
//   const smartSelector = new SmartModelSelector(providerManager);
  
//   // Different types of queries routed to appropriate providers
//   const complexAnalysis = await smartSelector.sendMessage(
//     "Analyze the economic implications of quantum computing on financial markets",
//     'complex'
//   );
  
//   const quickQuestion = await smartSelector.sendMessage(
//     "What's the capital of France?",
//     'quick'
//   );
  
//   const localProcessing = await smartSelector.sendMessage(
//     "Summarize this text for me: [...]",
//     'local'
//   );
  
//   console.log('Complex (OpenAI):', complexAnalysis);
//   console.log('Quick (Gemini):', quickQuestion);
//   console.log('Local (Ollama):', localProcessing);