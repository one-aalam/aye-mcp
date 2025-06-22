import { MessageThread } from './message-thread.svelte.js';
import { AppPrefs } from './app-prefs.svelte.js';
import { ChatInputState } from './chat-input.svelte.js';

// Global instances
export const messageThread = new MessageThread();
export const appPrefs = new AppPrefs();
export const chatInput = new ChatInputState();  

// Context key for providing chat context
// export const CHAT_CONTEXT_KEY = Symbol('chat-context');
// Context keys for dependency injection
export const MESSAGE_THREAD_KEY = Symbol('message-thread');
export const APP_PREFS_KEY = Symbol('app-prefs');
export const CHAT_INPUT_KEY = Symbol('chat-input');