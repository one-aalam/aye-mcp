//! Data models and types for the GenAI Tauri integration

use genai::chat::{ChatOptions, Tool, ToolCall, Usage};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct MessageInput {
    pub role: String,
    pub content: String,
}

/// Configuration for the GenAI integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenAIConfig {
    /// Default model to use
    pub default_model: Option<String>,
    /// Default chat options
    pub default_options: ChatOptions,
    /// Authentication providers
    pub auth_providers: HashMap<String, AuthProvider>,
    /// Model-specific configurations
    pub model_configs: HashMap<String, ModelConfig>,
    /// Global settings
    pub settings: GlobalSettings,
}

impl Default for GenAIConfig {
    fn default() -> Self {
        Self {
            default_model: None,
            default_options: ChatOptions::default(),
            auth_providers: HashMap::new(),
            model_configs: HashMap::new(),
            settings: GlobalSettings::default(),
        }
    }
}

/// Authentication provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthProvider {
    /// Provider name (e.g., "openai", "anthropic")
    pub name: String,
    /// Provider type
    pub provider_type: AuthProviderType,
    /// Configuration parameters
    pub config: HashMap<String, String>,
    /// Whether this provider is enabled
    pub enabled: bool,
}

/// Types of authentication providers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthProviderType {
    /// Environment variable-based auth
    EnvVar { env_name: String },
    /// API key-based auth
    ApiKey { key: String },
    /// OAuth-based auth
    OAuth {
        client_id: String,
        client_secret: String,
    },
    /// Custom authentication
    Custom { config: HashMap<String, String> },
}

/// Model-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    /// Model identifier
    pub model: String,
    /// Model-specific options
    pub options: ChatOptions,
    /// Custom parameters
    pub parameters: HashMap<String, serde_json::Value>,
    /// Whether this model is enabled
    pub enabled: bool,
}

/// Global settings for the GenAI integration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSettings {
    /// Enable debug logging
    pub debug_logging: bool,
    /// Request timeout in seconds
    pub request_timeout: u64,
    /// Maximum number of sessions to keep in memory
    pub max_sessions: usize,
    /// Auto-save sessions
    pub auto_save_sessions: bool,
    /// Session storage path
    pub session_storage_path: Option<String>,
}

impl Default for GlobalSettings {
    fn default() -> Self {
        Self {
            debug_logging: false,
            request_timeout: 60,
            max_sessions: 100,
            auto_save_sessions: false,
            session_storage_path: None,
        }
    }
}

/// Information about available models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// Model name
    pub name: String,
    /// Provider/adapter kind
    pub provider: String,
    /// Whether the model is available
    pub available: bool,
    /// Model capabilities
    pub capabilities: ModelCapabilities,
    /// Additional metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Model capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    /// Supports streaming responses
    pub streaming: bool,
    /// Supports tool/function calling
    pub tools: bool,
    /// Supports image inputs
    pub vision: bool,
    /// Maximum context length
    pub max_context_length: Option<u32>,
    /// Supported modalities
    pub modalities: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct DirectChatRequest {
    /// Model to use
    pub model: String,
    /// Conversation messages (managed by UI/DB)
    // pub messages: Vec<ChatMessage>,
    pub messages: Vec<MessageInput>,
    /// Optional chat options
    pub options: Option<ChatOptions>,
    /// Optional tools for this conversation
    pub tools: Option<Vec<Tool>>,
}

/// Response for direct chat
#[derive(Debug, Serialize)]
pub struct ChatResponse {
    /// The response message
    pub message: String,
    /// Model used
    pub model: String,
    /// Response metadata
    pub metadata: ResponseMetadata,
    /// Tool calls if any
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, serde::Serialize)]
pub struct ResponseMetadata {
    /// Timestamp of the response
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Token usage if available
    pub usage: Option<Usage>,
    /// Response time in milliseconds
    pub response_time_ms: u64,
    /// Whether the response was streamed
    pub streamed: bool,
}

/// Streaming request without session dependency
#[derive(Debug, Deserialize)]
pub struct StreamingRequest {
    /// Model to use
    pub model: String,
    /// Conversation messages
    // pub messages: Vec<ChatMessage>,
    pub messages: Vec<MessageInput>,
    /// Optional chat options
    pub options: Option<ChatOptions>,
    /// Optional tools
    pub tools: Option<Vec<Tool>>,
    /// Optional context identifier (for UI correlation)
    pub context_id: Option<String>,
    /// Optional stream configuration
    pub stream_config: Option<StreamConfig>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamConfig {
    /// Include accumulated text in chunk events
    pub include_accumulated: bool,
    /// Buffer size for streaming
    pub buffer_size: usize,
    /// Timeout for stream operations in milliseconds
    pub timeout_ms: u64,
    /// Whether to capture tool calls
    pub capture_tool_calls: bool,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self {
            include_accumulated: false,
            buffer_size: 1024,
            timeout_ms: 30000,
            capture_tool_calls: true,
        }
    }
}

#[derive(Serialize, Clone)]
pub struct StreamingEventPayload {
    pub event_type: StreamingEventType,
    pub stream_id: String,
    // context_id: String,
    pub data: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Types of streaming events
#[derive(Debug, Clone, Serialize)]
pub enum StreamingEventType {
    /// Stream started
    Start,
    /// Content chunk received
    Chunk,
    /// Tool call received
    ToolCall,
    /// Reasoning content (for models that support it)
    Reasoning,
    /// Stream ended
    End,
    /// Error occurred
    Error,
}

#[derive(Debug, Clone)]
pub enum StreamControlMessage {
    /// Stop the stream
    Stop,
    /// Pause the stream
    Pause,
    /// Resume the stream
    Resume,
}


/// Streaming session that manages real-time chat streams
#[derive(Debug)]
pub struct StreamingSession {
    /// Unique identifier for the streaming session
    pub id: Uuid,
    /// Associated chat session ID
    pub chat_session_id: Option<Uuid>,
    /// Model being used
    pub model: String,
    /// Whether the stream is currently active
    pub active: bool,
    /// Handle to the streaming task for cancellation
    pub handle: Option<tokio::task::JoinHandle<()>>,
    /// Channel for sending control messages
    pub control_tx: Option<mpsc::UnboundedSender<StreamControlMessage>>,
    /// Stream configuration
    pub config: StreamConfig,
}

impl StreamingSession {
    /// Create a new streaming session
    pub fn new(model: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            chat_session_id: None,
            model: model.to_string(),
            active: false,
            handle: None,
            control_tx: None,
            config: StreamConfig::default(),
        }
    }

    // pub fn with_config(model: &str, config: StreamConfig) -> Self {
    //     Self {
    //         id: Uuid::new_v4(),
    //         chat_session_id: None,
    //         model: model.to_string(),
    //         active: false,
    //         handle: None,
    //         control_tx: None,
    //         config,
    //     }
    // }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub key_format: String,
    pub website: String,
    pub models: Vec<String>,
    pub is_configured: bool,
}

/// Request to save a provider key
#[derive(Debug, Deserialize)]
pub struct SaveProviderKeyRequest {
    pub provider: String,
    pub api_key: String,
    // pub display_name: Option<String>,
}

/// Response for provider operations
#[derive(Debug, Serialize)]
pub struct ProviderOperationResponse {
    pub success: bool,
    pub message: String,
    pub provider: String,
}