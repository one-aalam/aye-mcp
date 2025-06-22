import type { 
    ChatMessage
} from '@/types';
  
/**
 * MessageThread - Manages all message-related state and operations
 */
export class MessageThread {
    messages = $state<ChatMessage[]>([]);
    isTyping = $state(false);
    expandedThinking = $state<Set<string>>(new Set());
    expandedTools = $state<Set<string>>(new Set());
  
    // Derived state
    hasMessages = $derived(this.messages.length > 0);
    lastMessage = $derived(this.messages.length > 0 ? this.messages[this.messages.length - 1] : null);
    messageCount = $derived(this.messages.length);
  
    // Message operations
    addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
      const newMessage: ChatMessage = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      this.messages.push(newMessage);
      return newMessage.id;
    }
  
    updateMessage = (id: string, updates: Partial<ChatMessage>): boolean => {
      const index = this.messages.findIndex(msg => msg.id === id);
      if (index === -1) return false;
      
      this.messages[index] = { ...this.messages[index], ...updates };
      return true;
    }
  
    deleteMessage = (id: string): boolean => {
      const index = this.messages.findIndex(msg => msg.id === id);
      if (index === -1) return false;
      
      this.messages.splice(index, 1);
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
}