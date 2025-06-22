<script lang="ts">
  import { onMount } from "svelte";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import ThreadSidebar from "@/components/sidebar/thread-sidebar.svelte";
  import { cn, createUserChatMessage, createAssistantChatMessage } from "../lib";
  import { addChatMessage, getChatMessages } from "@/db/chat_message";
  import { appPrefs, messageThread } from "../lib/stores/index.js";
  import type { ChatAttachment, ChatMessage } from "@/types";
  import { CUSTOM_SUGGESTIONS } from "../lib/constants";

  let sidebarWidth = $state(320);
  let sidebarCollapsed = $state(false);
  let isResizing = $state(false);
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

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
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
    console.log('Message sent:', data);
    
    // Simulate typing indicator
    const message = createUserChatMessage(data.content, {
      attachments: data.attachments || [],
    });
    
    messageThread.addMessage(message);
    await addChatMessage(message);
    messageThread.setTyping(true);
    
    // Simulate AI response after delay
    setTimeout(async () => {
      const aiResponse = createAssistantChatMessage('I received your message! This is a simulated AI response.');
      
      messageThread.addMessage(aiResponse);
      await addChatMessage(aiResponse);
      messageThread.setTyping(false);
    }, 2000);
  }

  function handlePromptSelect(event: CustomEvent) {
    console.log('Prompt selected:', event.detail);
    
    // Auto-send the selected suggestion
    const message = createUserChatMessage(event.detail.suggestion.text, {
      attachments: [],
    });
    // Trigger AI response
    handleMessageSend({ content: message.content, attachments: message.attachments });
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
      const messages = await getChatMessages();
      // Set up initial state
      // @TODO: Fix infinite loop and enable this
      if(messages.length > 0) {
        messageThread.setMessages(messages);
      } else {
        appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
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
        threads={[{
          id: '1',
          title: 'Conversation 1',
          tags: ['tag1', 'tag2'],
          is_archived: false,
          is_pinned: false,
          message_count: 9,
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: '2025-06-22T16:55:00.000Z',
          total_tokens: 0,
        }, {
          id: '2',
          title: 'Conversation 2',
          tags: ['tag1', 'tag2'],
          is_archived: false,
          is_pinned: true,
          message_count: 12,
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: '2025-06-22T16:55:00.000Z',
          total_tokens: 0,
        }, {
          id: '3',
          title: 'Conversation 3',
          tags: ['tag1', 'tag2'],
          is_archived: false,
          is_pinned: false,
          message_count: 19,
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: '2025-06-22T16:55:00.000Z',
          total_tokens: 0,
        }]}
        currentThreadId={'1'}
        isLoading={false}
        error={null}
        onCreate={() => console.log('Create thread')}
        onSelect={(threadId) => console.log(`Select thread: ${threadId}`)}
        onDelete={(threadId) => console.log(`Delete thread: ${threadId}`)}
        onPin={(threadId) => console.log(`Pin thread: ${threadId}`)}
        onArchive={(threadId) => console.log(`Archive thread: ${threadId}`)}
        onDuplicate={(threadId) => console.log(`Duplicate thread: ${threadId}`)}
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
    onPromptSelect={({ suggestion }) => handlePromptSelect({ detail: { suggestion } } as CustomEvent)}
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
