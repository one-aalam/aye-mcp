import type { ChatMessage, PromptSuggestion } from "@/types";
import { DEFAULT_PROMPT_SUGGESTIONS } from "./config";

  // Sample initial messages
export const INITIAL_MESSAGES: ChatMessage[] = [
    {
      id: '1',
      content: 'Hello! How can I help you today?',
      role: 'assistant',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
    {
      id: '2',
      content: 'I need help with building a chat interface in Svelte.',
      role: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
    },
    {
      id: '3',
      content: `I'd be happy to help you build a chat interface in Svelte! Here are some key considerations:

## Key Components Needed

1. **Message Display**: Show conversations with proper styling
2. **Input Area**: Text input with file upload and voice support
3. **Real-time Updates**: Handle streaming responses
4. **Theming**: Dark/light mode support

## Implementation Approach

\`\`\`typescript
// Basic setup
import { ChatContainer } from 'svelte-chat-ui';

// Configure your chat
const config = {
  enableVoiceInput: true,
  enableFileUpload: true,
  enableMarkdown: true,
};
\`\`\`

Would you like me to dive deeper into any specific aspect?`,
      role: 'assistant',
      timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      thinking: {
        id: 'thinking-1',
        status: 'complete',
        startTime: new Date(Date.now() - 1000 * 60 * 3 - 5000),
        endTime: new Date(Date.now() - 1000 * 60 * 3),
        steps: [
          {
            id: 'step-1',
            content: 'The user is asking about building a chat interface in Svelte. I should provide a comprehensive but structured response.',
            timestamp: new Date(Date.now() - 1000 * 60 * 3 - 4000),
            type: 'reasoning',
          },
          {
            id: 'step-2',
            content: 'I should cover the main components needed and provide some code examples to be helpful.',
            timestamp: new Date(Date.now() - 1000 * 60 * 3 - 2000),
            type: 'decision',
          },
        ],
      },
    },
];

export const CUSTOM_SUGGESTIONS: PromptSuggestion[] = [
    ...DEFAULT_PROMPT_SUGGESTIONS,
    {
      id: 'custom-1',
      text: 'Show me advanced chat features',
      icon: 'sparkles',
      category: 'Chat',
    },
    {
      id: 'custom-2',
      text: 'Help with voice integration',
      icon: 'mic',
      category: 'Voice',
    },
  ];