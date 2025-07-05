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
import { createMessage as persistMessage } from '@/db/chat_message';

import { createAssistantChatMessage, createChatThread, createUserChatMessage } from '..';
  
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

    messageHistory = $state<{ role: string; content: string }[]>([]);
    pendingThreadCreate = $state(false);
  
    threads = $state<ChatThread[]>([]);
    currentThreadId = $state<string | null>(null);

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
      this.messageHistory.push({
        role: 'user',
        content: genPromptWithSystemPrompt(message),
      });

      const threadId = await this.getOrCreateThread(message);
      userMessage.thread_id = threadId;
      await persistMessage(userMessage);
      return userMessage.id;
    }

    addAssistantMessage = async(message: string, metadata: Record<string, unknown>): Promise<string> => {
      if(message.trim() === '') return '';
      
      const assistantMessage = createAssistantChatMessage(message, {
        thread_id: this.currentThreadId!,
        metadata: metadata,
      });

      this.messages.push(assistantMessage);
      this.messageHistory.push({
        role: 'assistant',
        content: message,
      });

      await persistMessage(assistantMessage);

      return assistantMessage.id;
    }

    addToolOutputToMessageHistory = (toolOutput: string) => {
      this.messageHistory.push({
        role: 'tool',
        content: toolOutput,
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
      this.currentThreadId = null;
      this.pendingThreadCreate = true;
    }

    handleSelectThread = async (threadId: string) => {
      this.currentThreadId = threadId;
      this.setMessages([]);
      this.messageHistory = [];
      const messages = await getMessagesByThread(threadId);
      if(messages.length > 0) {
        this.messageHistory = messages.map((message) => {
          return {
            role: message.role,
            content: message.content,
          };
        });
        this.setMessages(messages);
      } else {
        this.appPrefs.setPromptSuggestions(CUSTOM_SUGGESTIONS);
      }
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