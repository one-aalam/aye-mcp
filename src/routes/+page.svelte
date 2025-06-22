<script lang="ts">
  import { onMount } from "svelte";
  import ChatContainer from "@/components/chat/chat-container.svelte";
  import { createChatMessage } from "../lib";
  import { appPrefs, messageThread } from "../lib/stores/index.js";
  import type { ChatAttachment } from "@/types";
  import { CUSTOM_SUGGESTIONS, INITIAL_MESSAGES } from "../lib/constants";


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
  function handleMessageSend(data: { content: string; attachments: ChatAttachment[] | undefined; }): void {
    console.log('Message sent:', data);
    
    // Simulate typing indicator
    messageThread.addMessage(createChatMessage(data.content, 'user'));
    messageThread.setTyping(true);
    
    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponse = createChatMessage(
        'I received your message! This is a simulated AI response.',
        'assistant'
      );
      
      messageThread.addMessage(aiResponse);
      messageThread.setTyping(false);
    }, 2000);
  }

  function handlePromptSelect(event: CustomEvent) {
    console.log('Prompt selected:', event.detail);
    
    // Auto-send the selected suggestion
    const message = createChatMessage(event.detail.suggestion.text, 'user');
    // chatActions.addMessage(message);
    
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


    onMount(() => {
      // Set up initial state
      // @TODO: Fix infinite loop and enable this
      // if(INITIAL_MESSAGES.length > 0) {
      //   messageThread.setMessages(INITIAL_MESSAGES);
      // }
      appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
  });
</script>

<main class="h-screen bg-background">
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
</style>
