<script lang="ts">
  import { onMount } from "svelte";
  import ollama from "ollama/browser";
  import type { ChatAttachment, ChatThread } from "@/types";
  import { THREADS_SELECTED_KEY, DEFAULT_THREAD_ID, genPromptWithSystemPrompt, MODEL, MODEL_PROVIDER, SYSTEM_PROMPT } from "@/config";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import ThreadSidebar from "@/components/sidebar/thread-sidebar.svelte";
  import { cn, createUserChatMessage, createAssistantChatMessage, createChatThread } from "../lib";
  import { appPrefs, messageThread } from "../lib/stores/index.js";
  import { CUSTOM_SUGGESTIONS } from "../lib/constants";
  import { createMessage as persistMessage, getMessagesByThread } from "@/db/chat_message";
  import { createThread, deleteThread, getThreads, pinThread, archiveThread } from "@/db/chat_thread";
  import { get_current_weather } from "../lib/tools/impl";
  import { get_current_weather as get_current_weather_def } from "../lib/tools/defs";

  const availableTools = {
    get_current_weather
  };

  let sidebarWidth = $state(320);
  let sidebarCollapsed = $state(false);
  let isResizing = $state(false);
  let messageHistory = $state<{ role: string; content: string }[]>([]);
  let pendingThreadCreate = $state(false);

  let threads = $state<ChatThread[]>([]);
  let currentThreadId = $state<string | null>(null);


  // Sidebar resizing
  function handleMouseDown(event: MouseEvent) {
    isResizing = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing) return;
    
    const newWidth = Math.max(240, Math.min(500, event.clientX));
    sidebarWidth = newWidth;
  }

  function handleMouseUp() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

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
  // Event handlers
  async function handleMessageSend(data: { content: string; attachments: ChatAttachment[] | undefined; }): Promise<void> {
    // Create a complete user chat message
    const userMessage = createUserChatMessage(data.content, {
        attachments: data.attachments || [],
        thread_id: currentThreadId!,
    });

    messageThread.addMessage(userMessage);
    messageHistory.push({
      role: 'user',
      content: genPromptWithSystemPrompt(data.content),
    });
    if(pendingThreadCreate) {
      pendingThreadCreate = false;
      const chatThread = createChatThread(`Conversation ${threads.length + 1}`, data.content, {
        model_provider: MODEL_PROVIDER,
        model_name: MODEL,
        system_prompt: SYSTEM_PROMPT
      });
      await createThread(chatThread);
      threads = await getThreads();
      currentThreadId = chatThread.id;
    }
    // Persist to DB
    userMessage.thread_id = currentThreadId!;
    await persistMessage(userMessage);
    // Set typing indicator
    messageThread.setTyping(true);
    // Call LLM
    const { message: llmResponse, ...rest } = await ollama.chat({
      model: MODEL,
      tools: [
        get_current_weather_def
      ],
      messages: messageHistory,
    });
    messageThread.setTyping(false);

    messageHistory.push({
      role: 'assistant',
      content: llmResponse.content,
    });
    
    if(llmResponse.content.trim() !== '') {
      // Create a complete assistant chat message
      const aiResponse = createAssistantChatMessage(llmResponse.content, {
        thread_id: currentThreadId!,
        metadata: rest,
      });
      // Persist to store
      messageThread.addMessage(aiResponse);
      messageHistory.push({
        role: 'assistant',
        content: llmResponse.content,
      });
      // Persist to DB
      await persistMessage(aiResponse);
    }
    // If tool calls in the response
    if(llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {

      // Process tool calls from the response
      messageThread.setTyping(true);
      for (const tool of llmResponse.tool_calls) {
        // @ts-ignore
        const functionToCall = availableTools[tool.function.name];
        if (functionToCall) {
          let output = await functionToCall(tool.function.arguments);
          // Add the function response to messages for the model to use
          messageHistory.push({
            role: 'tool',
            content: output.toString(),
          });
        } else {
          console.log('Function', tool.function.name, 'not found');
          messageHistory.push({
            role: 'tool',
            content: 'Function not found',
          });
        }
      }
      messageThread.setTyping(false);
      // Send to LLM
      messageThread.setTyping(true);
      const { message: finalLLMResponse, ...rest } = await ollama.chat({
          model: MODEL,
          messages: messageHistory
        });
      messageThread.setTyping(false);

      const finalResponseMessage = createAssistantChatMessage(finalLLMResponse.content, {
          thread_id: currentThreadId!,
          metadata: rest,
      });

      if(finalLLMResponse.content.trim() !== '') {
        messageHistory.push({
          role: 'assistant',
          content: finalLLMResponse.content,
        });
        // Persist to store
        messageThread.addMessage(finalResponseMessage);
        // Persist to DB
        await persistMessage(finalResponseMessage);
      }
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

  async function handleCreateThread() {
    // Reset state, don't mount, or transition to another page
    messageThread.setMessages([]);
    messageHistory = [];
    currentThreadId = null;
    pendingThreadCreate = true;
  }

  async function handleSelectThread(threadId: string) {
    currentThreadId = threadId;
    messageThread.setMessages([]);
    messageHistory = [];
    const messages = await getMessagesByThread(threadId);
    if(messages.length > 0) {
      messageHistory = messages.map((message) => {
        return {
          role: message.role,
          content: message.content,
        };
      });
      messageThread.setMessages(messages);
    } else {
      appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
    }
  }


    onMount(async () => {
      threads = await getThreads();
      if(threads.length) {
        // first start
        await handleSelectThread(localStorage.getItem(THREADS_SELECTED_KEY) || DEFAULT_THREAD_ID);
      } else {
        // first start
        pendingThreadCreate = true;
        appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
      }
    });

    $effect(() => {
      if(currentThreadId) {
        localStorage.setItem(THREADS_SELECTED_KEY, currentThreadId);
      }
    });
</script>

<main class="h-screen bg-background flex text-foreground overflow-hidden">
  <!-- Sidebar -->
  <div 
    class={cn(
      'relative flex-shrink-0 transition-all duration-300 ease-in-out',
      appPrefs.sidebarOpen ? '' : 'w-0'
    )}
    style:width={appPrefs.sidebarOpen ? `${sidebarWidth}px` : '0px'}
  >
    <div class={cn(
      'h-full overflow-hidden',
      !appPrefs.sidebarOpen && 'opacity-0'
    )}>
      <ThreadSidebar
        threads={threads}
        currentThreadId={currentThreadId}
        isLoading={false}
        error={null}
        onCreate={handleCreateThread}
        onSelect={handleSelectThread}
        onDelete={async (threadId) => {
          await deleteThread(threadId);
          threads = await getThreads();
        }}
        onPin={async (threadId) => {
          await pinThread(threadId);
          threads = await getThreads();
        }}
        onArchive={async (threadId) => {
          await archiveThread(threadId);
          threads = await getThreads();
        }}
        class="h-full"
      />
    </div>

    <!-- Resize Handle -->
    {#if !sidebarCollapsed}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-border hover:bg-primary/20 transition-colors"
        onmousedown={handleMouseDown}
        role="separator"
        aria-label="Resize sidebar"
        tabindex="0"
      ></div>
    {/if}
  </div>
  <!-- Main Content -->
  <div class="flex-1 flex flex-col min-w-0">
  <ChatContainer
    initialConfig={appPrefs.config}
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
</main>

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
