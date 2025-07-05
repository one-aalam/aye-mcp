import type { ChatAttachment, VoiceInputState } from "@/types";
import { getContext, setContext } from "svelte";

/**
 * ChatInputState - Manages chat input state and operations
 */
export class ChatInputState {
    message = $state('');
    attachments = $state<ChatAttachment[]>([]);
    isDragging = $state(false);
    isComposing = $state(false);
    
    // Voice input state
    voiceState = $state<VoiceInputState>({
      isRecording: false,
      isProcessing: false,
      audioLevel: 0,
      transcript: '',
    });
  
    // Input history
    messageHistory = $state<string[]>([]);
    historyIndex = $state(-1);
    maxHistorySize = 50;
  
    // Draft state
    hasDraft = $state(false);
    draftSaved = $state(false);
  
    // Derived state
    canSend = $derived(this.message.trim().length > 0 || this.attachments.length > 0);
    hasContent = $derived(this.message.length > 0 || this.attachments.length > 0);
    isVoiceActive = $derived(this.voiceState.isRecording || this.voiceState.isProcessing);
    characterCount = $derived(this.message.length);
    wordCount = $derived(this.message.trim().split(/\s+/).filter(word => word.length > 0).length);
  
    // Message methods
    setMessage = (text: string): void => {
      this.message = text;
      this.updateDraftState();
    }
  
    appendMessage = (text: string): void => {
      this.message += text;
      this.updateDraftState();
    }
  
    clearMessage = (): void => {
      this.message = '';
      this.hasDraft = false;
      this.draftSaved = false;
    }
  
    insertAtCursor = (text: string, cursorPos: number): void => {
      const before = this.message.substring(0, cursorPos);
      const after = this.message.substring(cursorPos);
      this.message = before + text + after;
      this.updateDraftState();
    }
  
    // History methods
    addToHistory = (text: string): void => {
      if (text.trim() && !this.messageHistory.includes(text)) {
        this.messageHistory.unshift(text);
        if (this.messageHistory.length > this.maxHistorySize) {
          this.messageHistory = this.messageHistory.slice(0, this.maxHistorySize);
        }
      }
      this.historyIndex = -1;
    }
  
    getPreviousFromHistory = (): string | null => {
      if (this.historyIndex < this.messageHistory.length - 1) {
        this.historyIndex++;
        return this.messageHistory[this.historyIndex];
      }
      return null;
    }
  
    getNextFromHistory = (): string | null => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        return this.messageHistory[this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        return '';
      }
      return null;
    }
  
    // Attachment methods
    addAttachment = (attachment: ChatAttachment): void => {
      this.attachments.push(attachment);
      this.updateDraftState();
    }
  
    removeAttachment = (id: string): void => {
      this.attachments = this.attachments.filter(att => att.id !== id);
      this.updateDraftState();
    }
  
    updateAttachment = (id: string, updates: Partial<ChatAttachment>): void => {
      const index = this.attachments.findIndex(att => att.id === id);
      if (index !== -1) {
        this.attachments[index] = { ...this.attachments[index], ...updates };
      }
    }
  
    clearAttachments = (): void => {
      this.attachments = [];
      this.updateDraftState();
    }
  
    getAttachment = (id: string): ChatAttachment | undefined => {
      return this.attachments.find(att => att.id === id);
    }
  
    // Voice methods
    updateVoiceState = (updates: Partial<VoiceInputState>): void => {
      this.voiceState = { ...this.voiceState, ...updates };
    }
  
    startVoiceRecording = (): void => {
      this.voiceState.isRecording = true;
      this.voiceState.isProcessing = false;
      this.voiceState.error = undefined;
    }
  
    stopVoiceRecording = (): void => {
      this.voiceState.isRecording = false;
      this.voiceState.isProcessing = true;
    }
  
    setVoiceTranscript = (transcript: string): void => {
      this.voiceState.transcript = transcript;
      if (transcript) {
        this.appendMessage(transcript + ' ');
      }
    }
  
    setVoiceError = (error: string): void => {
      this.voiceState.error = error;
      this.voiceState.isRecording = false;
      this.voiceState.isProcessing = false;
    }
  
    clearVoiceState = (): void => {
      this.voiceState = {
        isRecording: false,
        isProcessing: false,
        audioLevel: 0,
        transcript: '',
      };
    }
  
    // Drag & Drop methods
    setDragging = (dragging: boolean): void => {
      this.isDragging = dragging;
    }
  
    // Composition methods
    setComposing = (composing: boolean): void => {
      this.isComposing = composing;
    }
  
    // Draft methods
    private updateDraftState = (): void => {
      this.hasDraft = this.hasContent;
      this.draftSaved = false;
    }
  
    saveDraft = (): void => {
      if (this.hasDraft && typeof localStorage !== 'undefined') {
        const draft = {
          message: this.message,
          attachments: this.attachments,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('chat-input-draft', JSON.stringify(draft));
        this.draftSaved = true;
      }
    }
  
    loadDraft = (): boolean => {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('chat-input-draft');
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            this.message = draft.message || '';
            this.attachments = draft.attachments || [];
            this.updateDraftState();
            return true;
          } catch (error) {
            console.warn('Failed to load draft:', error);
          }
        }
      }
      return false;
    }
  
    clearDraft = (): void => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('chat-input-draft');
      }
      this.hasDraft = false;
      this.draftSaved = false;
    }
  
    // Reset methods
    reset = (): void => {
      this.clearMessage();
      this.clearAttachments();
      this.clearVoiceState();
      this.isDragging = false;
      this.isComposing = false;
      this.historyIndex = -1;
    }
  
    // Utility methods
    getMessagePreview = (maxLength: number = 100): string => {
      if (this.message.length <= maxLength) return this.message;
      return this.message.substring(0, maxLength) + '...';
    }
  
    hasMedia = (): boolean => {
      return this.attachments.some(att => 
        att.type === 'image' || att.type === 'video' || att.type === 'audio'
      );
    }
  
    hasDocuments = (): boolean => {
      return this.attachments.some(att => att.type === 'file');
    }
  
    getTotalAttachmentSize = (): number => {
      return this.attachments.reduce((total, att) => total + att.size, 0);
    }
}

const CHAT_INPUT_KEY = Symbol("chat_input");

export const setChatInputContext = () => {
  const chatInput = new ChatInputState();
  return setContext(CHAT_INPUT_KEY, chatInput);
}

export const getChatInputContext = () => {
  return getContext<ReturnType<typeof setChatInputContext>>(CHAT_INPUT_KEY);
} 