<script lang="ts">
  import { onMount } from "svelte";
  import ollama from "ollama/browser";
  import type { ChatAttachment } from "@/types";
  import { MODEL, MCP_SERVERS, prepareMCPToolName, parseMCPToolName } from "@/config";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import { get_current_weather } from "../lib/tools/impl";
  import { get_current_weather as get_current_weather_def } from "../lib/tools/defs";
  import { mcpManager } from "@/mcp/mcp-manager";
  import { mcpStartupManager, type StartupResult } from "@/mcp/startup-manager";
  import type { MCPTool } from "@/types/mcp";
  import { toOllamaTool } from "@/tools/compat";
  import { getMessageThreadContext } from "@/stores/message-thread.svelte.js";
  import { getAppPrefsContext } from "@/stores/app-prefs.svelte.js";

  const messageThread = getMessageThreadContext();
  const appPrefs = getAppPrefsContext();


  let isInitialized = $state(false);
  let initError = $state<string | null>(null);
  let isLoading = $state(true);
  let mcpInitResult = $state<StartupResult | null>(null);

  const availableLocalTools = {
    get_current_weather
  };
  let availableMCPTools = $state<MCPTool[]>([]);

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

  async function loadAvailableMCPTools() {
    try {
      const servers = await mcpManager.getAllTools();
      console.log(servers)
      const tools: MCPTool[] = [];
      // for (const server of servers) {
      //   if (server.is_enabled && server.status === 'connected' && server.tools) {
      //     tools.push(...server.tools.filter(tool => tool.is_enabled).map(tool => ({
      //       ...tool,
      //       serverId: server.id,
      //       serverName: server.name,
      //       type: 'mcp'
      //     })));
      //   }
      // }

      servers.forEach(server => {
        tools.push(...(server.tools.map(tool => ({
          ...tool,
          server_id: server.serverId,
          serverName: server.serverName,
          name: prepareMCPToolName(server.serverId, tool.name),
        }))));
      });
      availableMCPTools = tools;
      console.log(`Loaded ${tools.length} MCP tools from ${servers.length} servers`);
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    }
  }

  // Event handlers
  async function handleMessageSend(data: { content: string; attachments: ChatAttachment[] | undefined; }, selectedTools: string[] = []): Promise<void> {
    await messageThread.addUserMessage(data.content, data.attachments);
    messageThread.setTyping(true);
    // Call LLM
    // Prepare tools for LLM - combine built-in and MCP tools
    const allTools = [get_current_weather_def, ...availableMCPTools.map(toOllamaTool)];
    // const allowedTools = selectedTools.length > 0 ? allTools.filter(tool => {
    //   const toolName = tool.function.name!.startsWith('mcp_') 
    //         ? tool.function.name!.split('_').slice(2).join('_') 
    //         : tool.function.name!;
    //   return selectedTools.includes(toolName)
    // }) : allTools;
    // console.log(allowedTools)
    const { message: llmResponse, ...rest } = await ollama.chat({
      model: MODEL,
      tools: allTools,
      messages: messageThread.messageHistory,
    });
    messageThread.setTyping(false);

    await messageThread.addAssistantMessage(llmResponse.content, rest);
    // If tool calls in the response
    if(llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      // Process tool calls from the response
      messageThread.setTyping(true);
      for (const tool of llmResponse.tool_calls) {
        const toolName = tool.function.name;
        let toolOutput: string | null = null;

        try {
          if(toolName.startsWith(MCP_SERVERS.TOOLS_PREFIX)) {
            const { serverId, toolName: actualToolName } = parseMCPToolName(toolName);
            console.log(`Calling MCP tool: ${actualToolName} on server ${serverId}`);
            const result = await mcpManager.callTool(serverId!, actualToolName, tool.function.arguments);
            toolOutput = JSON.stringify(result);
          } else {
            console.log(`Calling local tool: ${toolName}`);
            // @ts-ignore
            const functionToCall = availableLocalTools[toolName];
            if (functionToCall) {
              const result = await functionToCall(tool.function.arguments);
              toolOutput = result.toString();
            } else {
              console.log('Function', toolName, 'not found');
              toolOutput = 'Function not found';
            }
          }
        } catch (error) {
          console.error(`Error calling tool ${toolName}:`, error);
          toolOutput = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        
        messageThread.addToolOutputToMessageHistory(toolOutput!);
      }
      messageThread.setTyping(false);
      // Send to LLM
      messageThread.setTyping(true);
      const { message: finalLLMResponse, ...rest } = await ollama.chat({
          model: MODEL,
          messages: messageThread.messageHistory
        });
      messageThread.setTyping(false);

      await messageThread.addAssistantMessage(finalLLMResponse.content, rest);

    } else {
      console.log('No tool calls returned from model');
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
      // Load MCP servers and tools
      try {
        mcpManager.addEventListener((event) => {
          switch (event.type) {
            case 'connected':
              // console.log(`MCP server connected`);
              break;
            case 'disconnected':
              console.log(`MCP server disconnected`);
              break;
            case 'error':
              const errorEvent = event as any;
              console.log(`MCP server error: ${errorEvent.error || 'Unknown error'}`);
              break;
            case 'tools_updated':
              const toolsEvent = event as any;
              console.log(`Tools updated for server ${toolsEvent.serverId}:`, toolsEvent.tools);
              break;
          }
        });
        const mcpResult = await mcpStartupManager.initializeFromConfig();
        mcpInitResult = mcpResult;
        isInitialized = true;
      } catch (error) {
        initError = error instanceof Error ? error.message : 'Unknown error';
      } finally {
        isLoading = false;
      }
    });

    $effect(() => {
      if (isInitialized && initError === null) {
        loadAvailableMCPTools();
        // const interval = setInterval(loadAvailableMCPTools, MCP_SERVERS.TOOLS_REFRESH_INTERVAL); // Refresh every 30 seconds
        // return () => clearInterval(interval);
      }
    });
</script>
  <!-- Main Content -->
  <div class="flex-1 flex flex-col min-w-0">
    {#if mcpInitResult && (mcpInitResult.failed > 0 || mcpInitResult.total === 0)}
        <div class="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-yellow-800 dark:text-yellow-200">
              {#if mcpInitResult.total === 0}
                No MCP servers configured. Tools functionality limited to built-in tools.
              {:else}
                MCP Status: {mcpInitResult.successful}/{mcpInitResult.total} servers running
                {#if mcpInitResult.failed > 0}
                  ({mcpInitResult.failed} failed)
                {/if}
              {/if}
            </span>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button 
              onclick={async () => {
                const result = await mcpStartupManager.reloadConfiguration();
                mcpInitResult = result;
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
      {/if}
  <ChatContainer
    initialConfig={appPrefs.config}
    availableTools={availableMCPTools}
    height="100vh"
    showHeader={true}
    showPromptSuggestions={true}
    onMessageSend={handleMessageSend}
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
    onPromptSelect={({ suggestion }) => handleMessageSend({ content: suggestion.text, attachments: [] })}
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
