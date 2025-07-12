import { CUSTOM_SUGGESTIONS } from '@/constants';
import { getMessagesByThread } from '@/db/chat_message';
import type { 
  ChatAttachment,
    ChatMessage,
    ChatThread
} from '@/types';
import { getContext, onMount, setContext } from 'svelte';
import { AppPrefs, getAppPrefsContext } from './app-prefs.svelte';
import { DEFAULT_THREAD_ID, genPromptWithSystemPrompt, MODEL, MODEL_PROVIDER, SYSTEM_PROMPT, THREADS_SELECTED_KEY } from '@/config';
import { archiveThread, createThread, deleteThread, getThreads, pinThread } from '@/db/chat_thread';
import { createMessage as persistMessage, updateMessage as updatePersistedMessage } from '@/db/chat_message';

import { createAssistantChatMessage, createChatThread, createUserChatMessage } from '..';

// Provider-agnostic message format for API calls
interface ProviderMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}
  
/**
 * MessageThread - Manages all message-related state and operations
 */
export class MessageThread {

    appPrefs: AppPrefs;

    messages = $state<ChatMessage[]>([]);
    isTyping = $state(false);
    expandedThinking = $state<Set<string>>(new Set());
    expandedTools = $state<Set<string>>(new Set());
  
    // Derived state
    hasMessages = $derived(this.messages.length > 0);
    lastMessage = $derived(this.messages.length > 0 ? this.messages[this.messages.length - 1] : null);
    messageCount = $derived(this.messages.length);

    // Updated to use provider-agnostic format
    messageHistory = $state<ProviderMessage[]>([]);
    pendingThreadCreate = $state(false);
  
    threads = $state<ChatThread[]>([]);
    currentThreadId = $state<string | null>(null);

    // Track pending tool calls for proper message history
    pendingToolCalls = $state<any[]>([]);

    constructor() {
      this.appPrefs = getAppPrefsContext();

      onMount(async () => {
        // Load threads
        this.threads = await getThreads();
        if(this.threads.length) {
          // first start
          await this.handleSelectThread(localStorage.getItem(THREADS_SELECTED_KEY) || DEFAULT_THREAD_ID);
        } else {
          // first start
          this.pendingThreadCreate = true;
          this.appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
        }
      });

      $effect(() => {
        if(this.currentThreadId) {
          localStorage.setItem(THREADS_SELECTED_KEY, this.currentThreadId);
        }
      });
    }

    addUserMessage = async(message: string, attachments: ChatAttachment[] = []): Promise<string> => {
      const userMessage = createUserChatMessage(message, {
        attachments: attachments,
        thread_id: this.currentThreadId!,
      });

      this.messages.push(userMessage);
      
      // Add to message history in provider-agnostic format
      this.messageHistory.push({
        role: 'user',
        content: genPromptWithSystemPrompt(message),
      });

      const threadId = await this.getOrCreateThread(message);
      userMessage.thread_id = threadId;
      await persistMessage(userMessage);
      return userMessage.id;
    }

    addAssistantMessage = async(message: string, metadata: Record<string, unknown>, toolCalls?: any[]): Promise<string> => {
      if(message.trim() === '') return '';
      
      const assistantMessage = createAssistantChatMessage(message, {
        thread_id: this.currentThreadId!,
        metadata: metadata,
        tool_calls: toolCalls || [],
      });

      this.messages.push(assistantMessage);
      
      // Add to message history
      this.messageHistory.push({
        role: 'assistant',
        content: message,
        tool_calls: toolCalls || [],
      });

      await persistMessage(assistantMessage);
      return assistantMessage.id;
    }

    addPlaceholderAssistantMessage = async(): Promise<string> => {
      const assistantMessage = createAssistantChatMessage('', {
        thread_id: this.currentThreadId!,
        metadata: {},
      });

      this.messages.push(assistantMessage);
      
      // Don't add to messageHistory yet - wait for finalization
      
      await persistMessage(assistantMessage);
      return assistantMessage.id;
    }

    updatePlaceholderAssistantMessage = (message: string) => {
      this.messages[this.messages.length - 1].content = message;
    }

    finalizePlaceholderAssistantMessage = async(id: string, toolCalls?: any[]) => {
      const finalContent = this.messages[this.messages.length - 1].content;
      
      // Add finalized content to message history
      const historyMessage: ProviderMessage = {
        role: 'assistant',
        content: finalContent,
      };
      
      // Add tool calls if provided
      if (toolCalls && toolCalls.length > 0) {
        historyMessage.tool_calls = toolCalls;
      }
      // Add finalized content to message history
      this.messageHistory.push(historyMessage);

      // Update persisted message
      const updateData: any = { content: finalContent };
      if (toolCalls && toolCalls.length > 0) {
        updateData.toolCalls = toolCalls;
      }
      
      await updatePersistedMessage(
        id,
        updateData,
      );
    }

    // NEW: Add tool calls to message history (as assistant message)
    addToolCallsToMessageHistory = (toolCalls: any[]) => {
      // Store for potential use in next assistant message
      this.pendingToolCalls = toolCalls;
      
      // Add assistant message with tool calls
      this.messageHistory.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCalls
      });
    }

    // NEW: Add tool results to message history
    addToolResultToMessageHistory = (toolCallId: string, result: string) => {
      this.messageHistory.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: result,
      });
    }

    // DEPRECATED: Keep for backward compatibility but log warning
    addToolOutputToMessageHistory = (toolOutput: string, toolCallId: string) => {
      console.warn('addToolOutputToMessageHistory is deprecated, use addToolResultToMessageHistory');
      this.addToolResultToMessageHistory(toolCallId, toolOutput);
    }

    // NEW: Handle multiple tool results
    addMultipleToolResults = (toolResults: Array<{toolCallId: string, result: string}>) => {
      toolResults.forEach(({toolCallId, result}) => {
        this.addToolResultToMessageHistory(toolCallId, result);
      });
    }

    // NEW: Get message history formatted for specific provider
    getMessageHistoryForProvider = (provider: string): any[] => {
      // For now, return the standard format
      // In future, you could add provider-specific formatting here
      return $state.snapshot(this.messageHistory).map(msg => {
        // Ensure content is not undefined for providers that require it
        if (msg.content === null || msg.content === undefined) {
          return { ...msg, content: msg.tool_calls ? '' : '' };
        }
        return msg;
      });
    }
  
    updateMessage = (id: string, updates: Partial<ChatMessage>): boolean => {
      const index = this.messages.findIndex(msg => msg.id === id);
      if (index === -1) return false;
      
      this.messages[index] = { ...this.messages[index], ...updates };
      return true;
    }
  
    clearMessages = (): void => {
      this.messages = [];
      this.messageHistory = [];
      this.pendingToolCalls = [];
      this.expandedThinking.clear();
      this.expandedTools.clear();
    }
  
    getMessage = (id: string): ChatMessage | undefined => {
      return this.messages.find(msg => msg.id === id);
    }
  
    getMessagesByRole = (role: ChatMessage['role']): ChatMessage[] => {
      return this.messages.filter(msg => msg.role === role);
    }
  
    // Typing state
    setTyping = (typing: boolean): void => {
      this.isTyping = typing;
    }
  
    // Thinking/Tools expansion state
    toggleThinking = (messageId: string): void => {
      if (this.expandedThinking.has(messageId)) {
        this.expandedThinking.delete(messageId);
      } else {
        this.expandedThinking.add(messageId);
      }
    }
  
    isThinkingExpanded = (messageId: string): boolean => {
      return this.expandedThinking.has(messageId);
    }
  
    toggleTools = (messageId: string): void => {
      if (this.expandedTools.has(messageId)) {
        this.expandedTools.delete(messageId);
      } else {
        this.expandedTools.add(messageId);
      }
    }
  
    isToolsExpanded = (messageId: string): boolean => {
      return this.expandedTools.has(messageId);
    }
  
    // Batch operations
    addMessages = (messages: ChatMessage[]): void => {
      this.messages.push(...messages);
    }
  
    setMessages = (messages: ChatMessage[]): void => {
      this.messages = [...messages];
    }
  
    // Search and filtering
    searchMessages = (query: string): ChatMessage[] => {
      const lowercaseQuery = query.toLowerCase();
      return this.messages.filter(msg => 
        msg.content.toLowerCase().includes(lowercaseQuery) ||
        msg.attachments?.some(att => att.name.toLowerCase().includes(lowercaseQuery))
      );
    }
  
    getMessagesWithAttachments = (): ChatMessage[] => {
      return this.messages.filter(msg => msg.attachments && msg.attachments.length > 0);
    }
  
    getMessagesWithThinking = (): ChatMessage[] => {
      return this.messages.filter(msg => msg.thinking);
    }
  
    getMessagesWithTools = (): ChatMessage[] => {
      return this.messages.filter(msg => msg.toolCalls && msg.toolCalls.length > 0);
    }

    getOrCreateThread = async(message: string): Promise<string> => {
      if(!this.pendingThreadCreate) return this.currentThreadId!;
      this.pendingThreadCreate = false;
      const chatThread = createChatThread(`Conversation ${this.threads.length + 1}`, message, {
          model_provider: MODEL_PROVIDER,
          model_name: MODEL,
          system_prompt: SYSTEM_PROMPT
      });
      await createThread(chatThread);
      this.threads = await getThreads();
      this.currentThreadId = chatThread.id;
      return chatThread.id;
    }

    handleCreateThread = async () => {
      // Reset state, don't mount, or transition to another page
      this.setMessages([]);
      this.messageHistory = [];
      this.pendingToolCalls = [];
      this.currentThreadId = null;
      this.pendingThreadCreate = true;
    }

    handleSelectThread = async (threadId: string) => {
      this.currentThreadId = threadId;
      this.setMessages([]);
      this.messageHistory = [];
      this.pendingToolCalls = [];
      
      const messages = await getMessagesByThread(threadId);
      if(messages.length > 0) {
        // Reconstruct message history from stored messages
        this.messageHistory = this.reconstructMessageHistory(messages);
        this.setMessages(messages);
      } else {
        this.appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
      }
    }

    // NEW: Reconstruct proper message history from stored messages
    private reconstructMessageHistory = (messages: ChatMessage[]): ProviderMessage[] => {
      const history: ProviderMessage[] = [];
      
      for (const message of messages) {
        if (message.role === 'user') {
          history.push({
            role: 'user',
            content: message.content
          });
        } else if (message.role === 'assistant') {
          // Check if this message has tool calls stored
          if (message.toolCalls && message.toolCalls.length > 0) {
            // Add assistant message with tool calls
            history.push({
              role: 'assistant',
              content: message.content || null,
              tool_calls: message.toolCalls
            });
            
            // Add tool results if available
            // Note: You might need to modify your DB schema to store tool results
            // For now, assume they're in metadata
            if (message.metadata?.toolResults) {
              const toolResults = message.metadata.toolResults as any[];
              toolResults.forEach(result => {
                history.push({
                  role: 'tool',
                  tool_call_id: result.toolCallId,
                  content: result.content
                });
              });
            }
          } else {
            // Regular assistant message
            history.push({
              role: 'assistant',
              content: message.content
            });
          }
        }
      }
      
      return history;
    }

    handleDeleteThread = async (threadId: string) => {
      await deleteThread(threadId);
      this.threads = await getThreads();
    }

    handlePinThread = async (threadId: string) => {
      await pinThread(threadId);
      this.threads = await getThreads();
    }

    handleArchiveThread = async (threadId: string) => {
      await archiveThread(threadId);
      this.threads = await getThreads();
    }
}

const MESSAGE_THREAD_KEY = Symbol("message_thread");

export const setMessageThreadContext = () => {
  const messageThread = new MessageThread();
  return setContext(MESSAGE_THREAD_KEY, messageThread);
}

export const getMessageThreadContext = () => {
  return getContext<ReturnType<typeof setMessageThreadContext>>(MESSAGE_THREAD_KEY);
}