import type { ChatConfig, ChatTheme, PromptSuggestion } from "@/types";
import { DEFAULT_CONFIG, DEFAULT_THEME } from "@/config";

/**
 * AppPrefs - Manages application preferences and global state
 */
export class AppPrefs {
    config = $state<ChatConfig>(DEFAULT_CONFIG);
    currentTheme = $state<ChatTheme>(DEFAULT_THEME);
    isDarkMode = $state(false);
    promptSuggestions = $state<PromptSuggestion[]>([]);
    
    // UI state
    sidebarOpen = $state(false);
    settingsOpen = $state(false);
    
    // Performance preferences
    animationsEnabled = $state(true);
    autoSaveEnabled = $state(true);
    debugMode = $state(false);
  
    // Configuration methods
    updateConfig = (updates: Partial<ChatConfig>): void => {
      this.config = { ...this.config, ...updates };
    }
  
    resetConfig = (): void => {
      this.config = DEFAULT_CONFIG;
    }
  
    // Theme methods
    toggleTheme = (): void => {
      this.isDarkMode = !this.isDarkMode;
      this.applyTheme();
    }
  
    setTheme = (isDark: boolean): void => {
      this.isDarkMode = isDark;
      this.applyTheme();
    }
  
    updateTheme = (updates: Partial<ChatTheme>): void => {
      this.currentTheme = { ...this.currentTheme, ...updates };
    }
  
    private applyTheme = (): void => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.isDarkMode);
      }
    }
  
    // Prompt suggestions
    setPromptSuggestions = (suggestions: PromptSuggestion[]): void => {
      this.promptSuggestions = suggestions;
    }
  
    addPromptSuggestion = (suggestion: PromptSuggestion): void => {
      this.promptSuggestions.push(suggestion);
    }
  
    removePromptSuggestion = (id: string): void => {
      this.promptSuggestions = this.promptSuggestions.filter(s => s.id !== id);
    }
  
    // UI state methods
    toggleSidebar = (): void => {
      this.sidebarOpen = !this.sidebarOpen;
    }
  
    toggleSettings = (): void => {
      this.settingsOpen = !this.settingsOpen;
    }
  
    // Performance methods
    toggleAnimations = (): void => {
      this.animationsEnabled = !this.animationsEnabled;
    }
  
    toggleAutoSave = (): void => {
      this.autoSaveEnabled = !this.autoSaveEnabled;
    }
  
    toggleDebugMode = (): void => {
      this.debugMode = !this.debugMode;
    }
  
    // Persistence
    saveToLocalStorage = (): void => {
      if (typeof localStorage !== 'undefined') {
        const data = {
          config: this.config,
          isDarkMode: this.isDarkMode,
          currentTheme: this.currentTheme,
          promptSuggestions: this.promptSuggestions,
          animationsEnabled: this.animationsEnabled,
          autoSaveEnabled: this.autoSaveEnabled,
        };
        localStorage.setItem('chat-app-prefs', JSON.stringify(data));
      }
    }
  
    loadFromLocalStorage = (): void => {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('chat-app-prefs');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            this.config = { ...this.config, ...data.config };
            this.isDarkMode = data.isDarkMode ?? false;
            this.currentTheme = { ...this.currentTheme, ...data.currentTheme };
            this.promptSuggestions = data.promptSuggestions ?? [];
            this.animationsEnabled = data.animationsEnabled ?? true;
            this.autoSaveEnabled = data.autoSaveEnabled ?? true;
            this.applyTheme();
          } catch (error) {
            console.warn('Failed to load preferences from localStorage:', error);
          }
        }
      }
    }
  }