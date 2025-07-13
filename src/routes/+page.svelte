<script lang="ts">
  import { onMount } from "svelte";
  import type { ChatAttachment } from "@/types";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import MCPStatusAlert from "@/components/mcp/mcp-status-alert.svelte";
  import { mcpManager } from "@/mcp/mcp-manager";
  import { getMessageThreadContext } from "@/stores/message-thread.svelte.js";
  import { getAppPrefsContext } from "@/stores/app-prefs.svelte.js";
  import { getMCPToolContext } from "@/stores/mcp-tool.svelte.js";
  import { getProviderManagerContext } from "@/stores/provider-manager.svelte.js";
  import { get_current_weather_genai } from "@/ipc/genai/tooldefs";
  import {listenToStream, sendMessage, streamMessage} from "@/ipc/genai/invoke";
  import { executeToolCall, ToolExecutionManager } from "@/tools/exec-mgr";
  import { mcpStartupManager } from "@/mcp/startup-manager";

  const messageThread = getMessageThreadContext();
  const appPrefs = getAppPrefsContext();
  const mcpTool = getMCPToolContext();
  const providerManager = getProviderManagerContext();

  let selectedProvider = $state<string | undefined>(undefined);

  appPrefs.updateConfig({
    enableVoiceInput: true,
    enableFileUpload: true,
    enableMarkdown: true,
    enableThinking: true,
    enableToolCalls: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['image/*', 'text/*', 'application/pdf', 'application/json'],
    autoScrollToBottom: true,
    showTimestamps: true,
    enableCopy: true,
    enableEdit: true,
    enableDelete: true,
  })

  /**
   * Handles the message send event to the Rust backend
   * @param data The message data
   * @param selectedTools The selected tools
   */
  async function handleMessageSendIPC(data: { content: string; attachments: ChatAttachment[] | undefined; }, selectedTools: string[] = []): Promise<void> {
    
    const userMessageId = await messageThread.addUserMessage(data.content, data.attachments);
    // 1. Make a call to the LLM
    messageThread.setTyping(true);
    const allTools = [get_current_weather_genai];
    const toolManager = new ToolExecutionManager();
    const response = await sendMessage({
      model: providerManager.selectedModel!,
      messages: messageThread.getMessageHistoryForProvider(providerManager.selectedProvider!),
      tools: allTools,
    });

    // 2. Process the response
    if(response) {
      messageThread.setTyping(false);
      await messageThread.addAssistantMessage(response.message, {...response.metadata as unknown as Record<string, unknown>, tool_calls: response.tool_calls || []});
      // 3. Handle tool calls
      if(response.tool_calls && response.tool_calls.length > 0) {
        // Process tool calls from the response
        messageThread.setTyping(true);
        const allToolCalls = toolManager.mergeEndToolCalls(response.tool_calls);
        for (const toolCall of allToolCalls) {
          if (!toolManager.hasToolResult(toolCall.call_id)) {
            try {
              const result = await executeToolCall(toolCall);
              toolManager.addToolResult(toolCall.call_id, result);
            } catch (error) {
              toolManager.addToolResult(toolCall.call_id, { error: error.message });
            }
          }
        }
        for (const [toolCallId, result] of toolManager.getAllResults()) {
          const toolCall = toolManager.getExecutedToolCall(toolCallId);
          await messageThread.addToolResultToMessageHistory(
            toolCallId, 
            JSON.stringify(result),
            {
              threadId: messageThread.currentThreadId!,
              parentMessageId: userMessageId,
              toolCall,
            }
          );
        }
        messageThread.setTyping(false);
      }
      // 4. Send to LLM for final response
      messageThread.setTyping(true);
      const finalResponse = await sendMessage({
        model: providerManager.selectedModel!,
        messages: messageThread.getMessageHistoryForProvider(providerManager.selectedProvider!),
      });
      messageThread.setTyping(false);
      toolManager.clear();

      if(finalResponse) {
        await messageThread.addAssistantMessage(finalResponse.message, finalResponse.metadata as unknown as Record<string, unknown>);
      }
    } else {
      console.log('No tool calls returned from model');
    }
  }

  /**
   * Handles the message stream event to the Rust backend
   * @param data The message data
   * @param selectedTools The selected tools
   */
  async function handleMessageStreamIPC(data: { content: string; attachments: ChatAttachment[] | undefined; }, selectedTools: string[] = []): Promise<void> {
    const userMessageId = await messageThread.addUserMessage(data.content, data.attachments);
    messageThread.setTyping(true);
    let assistantMessageId = await messageThread.addPlaceholderAssistantMessage(userMessageId);

    // Track tool calls and their results
    const toolManager = new ToolExecutionManager();
    
    try {
        // Listen for streaming events
        const unlisten = await listenToStream({
          onChunk: (chunk) => {
            messageThread.updatePlaceholderAssistantMessage(chunk.accumulated);
          },
          onReasoning: (reasoning) => {
            console.log('Reasoning:', reasoning);
          },
          onToolCall: async (toolCall) => {
            if(toolCall) {
              console.log('ToolCall received:', toolCall);

              toolManager.addToolCall(toolCall);
          
              // IMMEDIATE EXECUTION for better UX
              try {
                const result = await executeToolCall(toolCall);
                toolManager.addToolResult(toolCall.call_id, result);
                console.log(`Tool ${toolCall.fn_name} executed:`, result);
                
                // Optional: Show immediate feedback to user
                // messageThread.updatePlaceholderAssistantMessage(
                //   `${chunk.accumulated}\n\n🔧 Executed ${toolCall.fn_name}...`
                // );
                
              } catch (error) {
                console.error('Tool execution failed:', error);
                toolManager.addToolResult(toolCall.call_id, { error: error.message });
              }
            } else {
              console.log('No tool call received');
            }
          },
          onEnd: async (end) => {
            messageThread.setTyping(false);
            await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
            const shouldWrapUp = end.tool_calls?.length;
            // Combine streaming tool calls with any from onEnd
            const allToolCalls = toolManager.mergeEndToolCalls(end.tool_calls);
            // Execute any remaining tool calls that weren't executed during streaming
            for (const toolCall of allToolCalls) {
              if (!toolManager.hasToolResult(toolCall.call_id)) {
                try {
                  const result = await executeToolCall(toolCall);
                  toolManager.addToolResult(toolCall.call_id, result);
                } catch (error) {
                  toolManager.addToolResult(toolCall.call_id, { error: error.message });
                }
              }
            }
            
            if(toolManager.hasAnyToolCalls()) {
              console.log('Final tool calls:', allToolCalls);
          
              // Add tool calls to message history as assistant message
              await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId, allToolCalls);

              // Add all tool results to message history
              for (const [toolCallId, result] of toolManager.getAllResults()) {
                const toolCall = toolManager.getExecutedToolCall(toolCallId);
                await messageThread.addToolResultToMessageHistory(
                  toolCallId, 
                  JSON.stringify(result),
                  {
                    toolCall,
                    threadId: messageThread.currentThreadId!,
                    parentMessageId: userMessageId
                  }
                );
              }
          
              console.log('Updated message history:', messageThread.getMessageHistoryForProvider(providerManager.selectedProvider!));
              
              // Continue conversation with tool results
              assistantMessageId = await messageThread.addPlaceholderAssistantMessage(userMessageId);
              messageThread.setTyping(true);

              toolManager.clear();

              await streamMessage({
                model: providerManager.selectedModel!,
                messages: messageThread.getMessageHistoryForProvider(providerManager.selectedProvider!),
                tools: shouldWrapUp ?  [] : [get_current_weather_genai],
              });
              messageThread.setTyping(false);
            } else {
              await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
              toolManager.clear();
              await unlisten();
            }
          },
          onError: async (error) => {
            messageThread.updatePlaceholderAssistantMessage(`Error: ${error}`);
            await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
            messageThread.setTyping(false);
            toolManager.clear();
            await unlisten();
          }
        })

        // Start the stream
        await streamMessage({
            model: providerManager.selectedModel!,
            messages: messageThread.getMessageHistoryForProvider(providerManager.selectedProvider!),
            tools: [
              get_current_weather_genai
            ],
        });
      } catch (err) {
        console.error('Failed to start streaming:', err);
        messageThread.updatePlaceholderAssistantMessage(`Error: ${err}`);
        messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
        messageThread.setTyping(false);
        toolManager.clear();
    }
  }

  function handleMessageCopy(event: CustomEvent) {
    console.log('Message copied:', event.detail);
    // You could show a toast notification here
  }

  function handleMessageEdit(event: CustomEvent) {
    console.log('Message edit requested:', event.detail);
    // Implement edit functionality
  }

  function handleMessageDelete(event: CustomEvent) {
    console.log('Message deleted:', event.detail);
    // Already handled by the component, but you can add additional logic
  }

  function handleThinkingToggle(event: CustomEvent) {
    console.log('Thinking toggle:', event.detail);
    // Handle thinking process visibility toggle
  }

  function handleToolCancel(event: CustomEvent) {
    console.log('Tool cancelled:', event.detail);
    // Handle tool cancellation
  }

  function handleAttachmentUpload(event: CustomEvent) {
    console.log('Attachment uploaded:', event.detail);
    // Handle file upload logic
  }

  function handleAttachmentRemove(event: CustomEvent) {
    console.log('Attachment removed:', event.detail);
    // Handle file removal logic
  }

  function handleVoiceStart() {
    console.log('Voice input started');
    // Handle voice input start
  }

  function handleVoiceStop() {
    console.log('Voice input stopped');
    // Handle voice input stop
  }

  function handleVoiceResult(event: CustomEvent) {
    console.log('Voice transcript:', event.detail);
    // Handle voice transcript
  }

  

  function handleThemeToggle() {
    appPrefs.toggleTheme();
    // Theme is automatically handled by the component
  }

    onMount(async () => {
      try {
        mcpManager.addEventListener(mcpTool.handleMCPServerEvents);
        mcpTool.isLoading = true;
        await providerManager.initialize();
        const { total } = await mcpStartupManager.initializeFromConfig();
        await mcpTool.initialize(total);       
      } catch (error) {
        mcpTool.initError = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        mcpTool.isLoading = false;
      }
    });
    $effect(() => {
      selectedProvider = providerManager.selectedProvider;
    });
</script>
  <!-- Main Content -->
  <div class="flex-1 flex flex-col min-w-0">
    {#if !mcpTool.isInitialized && !mcpTool.isLoading}
        <MCPStatusAlert startupResult={mcpTool.mcpInitResult} loading={false} />
    {/if}
    <ChatContainer
    initialConfig={appPrefs.config}
    toolServers={mcpTool.toolServers}


    providers={providerManager.providers}
    configuredProviderNames={providerManager.configuredProviders}
    selectedProvider={providerManager.selectedProvider!}
    selectedModel={providerManager.selectedModel!}
    onModelSelect={providerManager.handleModelSelect}

    height="100vh"
    showHeader={true}
    showPromptSuggestions={true}
    onMessageSend={handleMessageStreamIPC}
    onCopy={({ messageId }) => handleMessageCopy({ detail: { messageId } } as CustomEvent)}
    onEdit={({ messageId }) => handleMessageEdit({ detail: { messageId } } as CustomEvent)}
    onRemove={({ messageId }) => handleMessageDelete({ detail: { messageId } } as CustomEvent)}
    onThinkingToggle={({ messageId }) => handleThinkingToggle({ detail: { messageId } } as CustomEvent)}
    onToolCancel={({ toolCallId }) => handleToolCancel({ detail: { toolCallId } } as CustomEvent)}
    onAttachmentAdd={({ attachment }) => handleAttachmentUpload({ detail: { attachment } } as CustomEvent)}
    onAttachmentRemove={({ attachmentId }) => handleAttachmentRemove({ detail: { attachmentId } } as CustomEvent)}
    onVoiceStart={handleVoiceStart}
    onVoiceStop={handleVoiceStop}
    onVoiceResult={({ transcript }) => handleVoiceResult({ detail: { transcript } } as CustomEvent)}
    onPromptSelect={({ suggestion }) => handleMessageStreamIPC({ content: suggestion.text, attachments: [] })}
    onThemeToggle={handleThemeToggle}
  />
</div>

<style>

:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

/* .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
} */
</style>
