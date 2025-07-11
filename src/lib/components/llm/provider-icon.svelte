<script lang="ts">
  import { AnthropicIcon, OpenAIIcon, GroqIcon, XAIIcon, OllamaIcon, GeminiIcon, CohereIcon, DeepSeekIcon } from './icons';

  interface Props {
    provider: string;
  }

  let { provider }: Props = $props();
</script>

<div class="w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-xl bg-gradient-to-br from-accent/10 to-accent-foreground/10 shadow-md">
    {#if provider == 'anthropic'}
      <AnthropicIcon/>
    {/if}
    {#if provider == 'openai'}
      <OpenAIIcon />
    {/if}
    {#if provider == 'groq'}
      <GroqIcon />
    {/if}
    {#if provider == 'xai'}
      <XAIIcon />
    {/if}
    {#if provider == 'ollama'}
      <OllamaIcon />
    {/if}
    {#if provider == 'gemini'}
      <GeminiIcon />
    {/if}
    {#if provider == 'cohere'}
      <CohereIcon />
    {/if}
    {#if provider == 'deepseek'}
      <DeepSeekIcon />
    {/if}
</div>