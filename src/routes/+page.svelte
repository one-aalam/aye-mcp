<script lang="ts">
  import { onMount } from "svelte";
  import type { ChatAttachment } from "@/types";
  import { MODEL, MCP_SERVERS, parseMCPToolName } from "@/config";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import MCPStatusAlert from "@/components/mcp/mcp-status-alert.svelte";
  import { get_current_weather } from "../lib/tools/impl";
  import { mcpManager } from "@/mcp/mcp-manager";
  import { getMessageThreadContext } from "@/stores/message-thread.svelte.js";
  import { getAppPrefsContext } from "@/stores/app-prefs.svelte.js";
  import { getMCPToolContext } from "@/stores/mcp-tool.svelte.js";
  import type { GenaiToolCall } from "@/ipc/genai/types";
  import { get_current_weather_genai } from "@/ipc/genai/tooldefs";
  import {listenToStream, sendMessage, streamMessage} from "@/ipc/genai/invoke";
  import { mcpStartupManager } from "@/mcp/startup-manager";

  const messageThread = getMessageThreadContext();
  const appPrefs = getAppPrefsContext();
  const mcpTool = getMCPToolContext();

  const availableLocalTools = {
    get_current_weather,
  };

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

  async function handleToolCalls(toolCalls: GenaiToolCall[]) {
        for (const toolCall of toolCalls) {
          const toolName = toolCall.fn_name;
          let toolOutput: string | null = null;
          try {
            if(toolCall.fn_name.startsWith(MCP_SERVERS.TOOLS_PREFIX)) {
              const { serverId, toolName: actualToolName } = parseMCPToolName(toolCall.fn_name);
              const result = await mcpManager.callTool(serverId!, actualToolName, toolCall.fn_arguments);
              toolOutput = JSON.stringify(result);
            } else {
            // @ts-ignore
              const functionToCall = availableLocalTools[toolName];
              if (functionToCall) {
                const result = await functionToCall(toolCall.fn_arguments);
                toolOutput = JSON.stringify(result);
              } else {
                toolOutput = 'Function not found';
              }
            }
          } catch (error) {
            toolOutput = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          messageThread.addToolOutputToMessageHistory(toolOutput!);
        }
  }


  /**
   * Handles the message send event to the Rust backend
   * @param data The message data
   * @param selectedTools The selected tools
   */
  async function handleMessageSendIPC(data: { content: string; attachments: ChatAttachment[] | undefined; }, selectedTools: string[] = []): Promise<void> {
    
    await messageThread.addUserMessage(data.content, data.attachments);
    // 1. Make a call to the LLM
    messageThread.setTyping(true);
    const allTools = [get_current_weather_genai];
    const response = await sendMessage({
      model: MODEL,
      messages: messageThread.messageHistory,
      tools: allTools,
    });

    // 2. Process the response
    if(response) {
      messageThread.setTyping(false);
      await messageThread.addAssistantMessage(response.message, response.metadata as unknown as Record<string, unknown>);
      // 3. Handle tool calls
      if(response.tool_calls && response.tool_calls.length > 0) {
        // Process tool calls from the response
        messageThread.setTyping(true);
        await handleToolCalls(response.tool_calls);
        messageThread.setTyping(false);
      }
      // 4. Send to LLM for final response
      messageThread.setTyping(true);
      const finalResponse = await sendMessage({
        model: MODEL,
        messages: messageThread.messageHistory
      });
      messageThread.setTyping(false);

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
    await messageThread.addUserMessage(data.content, data.attachments);
    messageThread.setTyping(true);
    let assistantMessageId = await messageThread.addPlaceholderAssistantMessage();
    
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
              console.log('ToolCall:', toolCall)
              messageThread.setTyping(true);
              await handleToolCalls([toolCall]);
              messageThread.setTyping(false);
            }
          },
          onEnd: async (end) => {
            messageThread.setTyping(false);
            await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
            if(end.tool_calls && end.tool_calls.length > 0) {
              assistantMessageId = await messageThread.addPlaceholderAssistantMessage();
              
              messageThread.setTyping(true);
              await streamMessage({
                model: MODEL,
                messages: messageThread.messageHistory
              });
              messageThread.setTyping(false);
            } else {
              await unlisten();
            }
          },
          onError: async (error) => {
            messageThread.updatePlaceholderAssistantMessage(`Error: ${error}`);
            await messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
            messageThread.setTyping(false);
            await unlisten();
          }
        })

        // Start the stream
        await streamMessage({
            model: MODEL,
            messages: messageThread.messageHistory,
            tools: [
              get_current_weather_genai
            ],
        });
      } catch (err) {
        console.error('Failed to start streaming:', err);
        messageThread.updatePlaceholderAssistantMessage(`Error: ${err}`);
        messageThread.finalizePlaceholderAssistantMessage(assistantMessageId);
        messageThread.setTyping(false);
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
        const { total } = await mcpStartupManager.initializeFromConfig();
        await mcpTool.initialize(total);
       
      } catch (error) {
        mcpTool.initError = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        mcpTool.isLoading = false;
      }
    });
</script>
  <!-- Main Content -->
  <div class="flex-1 flex flex-col min-w-0">
    {#if !mcpTool.isInitialized && !mcpTool.isLoading}
        <MCPStatusAlert startupResult={mcpTool.mcpInitResult} loading={false} />
    {/if}
    <ChatContainer
    initialConfig={appPrefs.config}
    availableTools={mcpTool.tools}
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
