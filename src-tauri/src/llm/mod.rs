use error::{GenAIError, GenAIResult};
use genai::{chat::{ChatMessage, ChatRequest, ToolCall, ChatStreamEvent}, resolver::{AuthData, AuthResolver}, Client, ModelIden};
use models::{
    AuthProvider, 
    GenAIConfig, 
    ModelConfig, 
    ModelInfo, 
    ModelCapabilities, 
    ProviderConfig, 
    ProviderOperationResponse, 
    SaveProviderKeyRequest, 
    StreamingEventType,
    StreamingSession,
    ChatResponse,
    ResponseMetadata,
    DirectChatRequest,
    StreamingRequest,
    StreamingEventPayload,
};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::RwLock;
use uuid::Uuid;
use futures::StreamExt;
use serde_json::json;

pub mod error;
pub mod models;

#[derive(Debug)]
pub struct GenAIState {
    /// The genai client instance
    pub client: genai::Client,
    /// Global configuration
    pub config: Arc<RwLock<GenAIConfig>>,
    /// Active streaming connections (still needed for stream management)
    pub streams: Arc<RwLock<HashMap<Uuid, StreamingSession>>>,
    /// Cached provider keys (in memory, loaded from Stronghold)
    provider_keys: Arc<RwLock<HashMap<String, String>>>,
}

impl GenAIState {
    pub fn new() -> Self {
        Self {
            client: genai::Client::default(),
            config: Arc::new(RwLock::new(GenAIConfig::default())),
            streams: Arc::new(RwLock::new(HashMap::new())),
            provider_keys: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn with_client(client: genai::Client) -> Self {
        Self {
            client,
            config: Arc::new(RwLock::new(GenAIConfig::default())),
            streams: Arc::new(RwLock::new(HashMap::new())),
            provider_keys: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Initialize with Stronghold-backed authentication
    pub async fn init_with_stronghold_auth(&self) -> GenAIResult<AuthResolver> {
        // Create an auth resolver that uses Stronghold-stored keys
        let provider_keys = self.provider_keys.clone();
        
        let auth_resolver = AuthResolver::from_resolver_fn(
            move |model_iden: ModelIden| -> Result<Option<AuthData>, genai::resolver::Error> {
                let adapter_kind_str = model_iden.adapter_kind.to_string().to_lowercase();
                
                // Try to get key from our cached provider keys
                if let Ok(keys) = provider_keys.try_read() {
                    if let Some(api_key) = keys.get(&adapter_kind_str) {
                        return Ok(Some(AuthData::from_single(api_key.clone())));
                    }
                }
                
                // Fallback to environment variables
                let env_name = match model_iden.adapter_kind {
                    genai::adapter::AdapterKind::OpenAI => "OPENAI_API_KEY",
                    genai::adapter::AdapterKind::Anthropic => "ANTHROPIC_API_KEY",
                    genai::adapter::AdapterKind::Gemini => "GEMINI_API_KEY",
                    genai::adapter::AdapterKind::Cohere => "COHERE_API_KEY",
                    genai::adapter::AdapterKind::Groq => "GROQ_API_KEY",
                    genai::adapter::AdapterKind::Xai => "XAI_API_KEY",
                    genai::adapter::AdapterKind::DeepSeek => "DEEPSEEK_API_KEY",
                    genai::adapter::AdapterKind::Ollama => return Ok(None),
                    _ => return Ok(None),
                };
                
                match std::env::var(env_name) {
                    Ok(key) => Ok(Some(AuthData::from_single(key))),
                    Err(_) => Err(genai::resolver::Error::ApiKeyEnvNotFound {
                        env_name: env_name.to_string(),
                    }),
                }
            },
        );
        
        tracing::info!("Stronghold authentication initialized");
        Ok(auth_resolver)
    }

    /// Update provider keys in memory (called after Stronghold operations)
    pub async fn update_provider_key(&self, provider: &str, key: &str) {
        self.provider_keys.write().await.insert(provider.to_string(), key.to_string());
    }

    /// Remove provider key from memory
    pub async fn remove_provider_key(&self, provider: &str) {
        self.provider_keys.write().await.remove(provider);
    }

    /// Get all configured providers
    pub async fn get_configured_providers(&self) -> Vec<String> {
        self.provider_keys.read().await.keys().cloned().collect()
    }

    pub fn init_logging() {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::INFO)
            .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
            .try_init()
            .ok();
    }

    /// Cleanup only streaming sessions
    pub async fn cleanup(&self) -> GenAIResult<()> {
        let mut streams = self.streams.write().await;
        streams.retain(|_, stream| stream.active);
        Ok(())
    }
}

/// Send a direct chat message without session management
#[tauri::command]
pub async fn send_message(
    request: DirectChatRequest,
    state: tauri::State<'_, GenAIState>,
) -> Result<ChatResponse, GenAIError> {
    let start_time = std::time::Instant::now();

    let chat_messages: Vec<ChatMessage> = request.messages
    .into_iter()
    .map(|msg| match msg.role.as_str() {
        "system" => ChatMessage::system(&msg.content),
        "user" => ChatMessage::user(&msg.content),
        "assistant" => ChatMessage::assistant(&msg.content),
        _ => ChatMessage::user(&msg.content),
    })
    .collect(); 

    // Build chat request from provided messages
    let mut chat_req = ChatRequest::new(chat_messages);

    if let Some(tools) = request.tools {
        chat_req = chat_req.with_tools(tools);
    }

    // Execute the chat request
    let chat_res = state
        .client
        .exec_chat(&request.model, chat_req, request.options.as_ref())
        .await
        .map_err(|e| GenAIError::api(e.to_string()))?;

    let response_text = chat_res
        .first_text()
        .unwrap_or("No response")
        .to_string();
    println!("Response: {}", response_text);
    let usage = chat_res.usage.clone();

    let tool_calls = if !chat_res
        .clone()
        .into_tool_calls()
        .is_empty()
    {
        Some(chat_res.into_tool_calls())
    } else {
        None
    };

    // println!("Tool calls: {:#?}", tool_calls);
    let response_time = start_time.elapsed().as_millis() as u64;

    Ok(ChatResponse {
        message: response_text,
        model: request.model,
        metadata: ResponseMetadata {
            timestamp: chrono::Utc::now(),
            usage: Some(usage),
            response_time_ms: response_time,
            streamed: false,
        },
        tool_calls,
    })
}

#[tauri::command]
pub async fn stream_message(
    request: StreamingRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, GenAIState>,
) -> Result<Uuid, GenAIError> {

    let chat_messages: Vec<ChatMessage> = request.messages
    .into_iter()
    .map(|msg| match msg.role.as_str() {
        "system" => ChatMessage::system(&msg.content),
        "user" => ChatMessage::user(&msg.content),
        "assistant" => ChatMessage::assistant(&msg.content),
        _ => ChatMessage::user(&msg.content),
    })
    .collect(); 

    // Build chat request
    let mut chat_req = ChatRequest::new(chat_messages);
    if let Some(tools) = request.tools {
        chat_req = chat_req.with_tools(tools);
    }

    let model = request.model.clone();

    // Create streaming session
    let stream_id = Uuid::new_v4();
    let mut streaming_session = StreamingSession::new(&model);
    streaming_session.active = true;

    let client = state.client.clone();
    let handle = tokio::spawn(async move {
        match client
            .exec_chat_stream(&model, chat_req, request.options.as_ref())
            .await
        {
            Ok(mut chat_stream) => {
                let mut accumulated_response = String::new();
                let mut tool_calls: Vec<ToolCall> = Vec::new();

                // Emit start event
                let _ = app.emit(
                    "genai-stream-event",
                    StreamingEventPayload {
                        event_type: StreamingEventType::Start,
                        stream_id: stream_id.to_string(),
                        data: json!({
                            "model": model
                        }),
                        timestamp: chrono::Utc::now(),
                    },
                );

                while let Some(result) = chat_stream.stream.next().await {
                    match result {
                        Ok(ChatStreamEvent::Start) => {
                            // Already emitted start event above
                        }
                        Ok(ChatStreamEvent::Chunk(chunk)) => {
                            accumulated_response.push_str(&chunk.content);
                            let _ = app.emit(
                                "genai-stream-event",
                                StreamingEventPayload {
                                    event_type: StreamingEventType::Chunk,
                                    stream_id: stream_id.to_string(),
                                    data: json!({
                                        "content": chunk.content,
                                        "accumulated": accumulated_response.clone(),
                                        // "accumulated": if config.include_accumulated {
                                        //     accumulated_response.clone()
                                        // } else {
                                        //     String::new()
                                        // }
                                    }),
                                    timestamp: chrono::Utc::now(),
                                }
                            );
                        }
                        Ok(ChatStreamEvent::ToolCallChunk(tool_chunk)) => {
                            tool_calls.push(tool_chunk.tool_call.clone());

                            let _ = app.emit("genai-stream-event", StreamingEventPayload {
                                event_type: StreamingEventType::ToolCall,
                                stream_id: stream_id.to_string(),
                                data: json!({
                                    "tool_call": tool_chunk.tool_call
                                }),
                                timestamp: chrono::Utc::now(),
                            });
                        }
                        Ok(ChatStreamEvent::ReasoningChunk(reasoning)) => {
                            let _ = app.emit("genai-stream-event", StreamingEventPayload {
                                event_type: StreamingEventType::Reasoning,
                                stream_id: stream_id.to_string(),
                                data: json!({ "content": reasoning.content }),
                                timestamp: chrono::Utc::now(),
                            });
                        }
                        Ok(ChatStreamEvent::End(end_data)) => {
                            // Check for captured tool calls
                            if let Some(captured_tools) = end_data.captured_into_tool_calls() {
                                tool_calls.extend(captured_tools);
                            }
                            
                            let _ = app.emit(
                                "genai-stream-event",
                                StreamingEventPayload {
                                    event_type: StreamingEventType::End,
                                    stream_id: stream_id.to_string(),
                                    data: json!({
                                        "final_response": accumulated_response,
                                        "tool_calls": tool_calls,
                                    }),
                                    timestamp: chrono::Utc::now(),
                                },
                            );
                        }
                        Err(e) => {
                            let _ = app.emit(
                                "genai-stream-event",
                                StreamingEventPayload {
                                    event_type: StreamingEventType::Error,
                                    stream_id: stream_id.to_string(),
                                    data: json!({
                                        "error": e.to_string()
                                    }),
                                    timestamp: chrono::Utc::now(),
                                },
                            );
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "genai-stream-event",
                    StreamingEventPayload {
                        event_type: StreamingEventType::Error,
                        stream_id: stream_id.to_string(),
                        data: json!({
                            "error": e.to_string()
                        }),
                        timestamp: chrono::Utc::now(),
                });
            }
        }
    });

    streaming_session.handle = Some(handle);
    state
        .streams
        .write()
        .await
        .insert(stream_id, streaming_session);

    Ok(stream_id)
}

/// Stop streaming by stream ID
#[tauri::command]
pub async fn stop_streaming_message(
    stream_id: Uuid,
    state: tauri::State<'_, GenAIState>,
) -> Result<(), GenAIError> {
    let mut streams = state.streams.write().await;
    if let Some(mut stream_session) = streams.remove(&stream_id) {
        stream_session.active = false;
        if let Some(handle) = stream_session.handle {
            handle.abort();
        }
    }
    Ok(())
}

// Save provider API key to Stronghold
#[tauri::command]
pub async fn save_provider_key(
    request: SaveProviderKeyRequest,
    state: tauri::State<'_, GenAIState>,
) -> Result<ProviderOperationResponse, GenAIError> {
    // The actual Stronghold operations would be handled in the frontend
    // Here we just update our in-memory cache
    state.update_provider_key(&request.provider, &request.api_key).await;
    
    tracing::info!("Provider key saved for: {}", request.provider);
    
    Ok(ProviderOperationResponse {
        success: true,
        message: format!("API key saved for {}", request.provider),
        provider: request.provider,
    })
}

/// Remove provider API key
#[tauri::command]
pub async fn remove_provider_key(
    provider: String,
    state: tauri::State<'_, GenAIState>,
) -> Result<ProviderOperationResponse, GenAIError> {
    state.remove_provider_key(&provider).await;
    
    tracing::info!("Provider key removed for: {}", provider);
    
    Ok(ProviderOperationResponse {
        success: true,
        message: format!("API key removed for {}", provider),
        provider,
    })
}

/// Get list of supported providers with configuration status
#[tauri::command]
pub async fn get_provider_configs(
    state: tauri::State<'_, GenAIState>,
) -> Result<Vec<ProviderConfig>, GenAIError> {
    let configured_providers = state.get_configured_providers().await;
    
    let providers = vec![
        ProviderConfig {
            name: "openai".to_string(),
            display_name: "OpenAI".to_string(),
            description: "GPT-4, GPT-4o, and ChatGPT models".to_string(),
            key_format: "sk-...".to_string(),
            website: "https://platform.openai.com/api-keys".to_string(),
            models: vec!["gpt-4o".to_string(), "gpt-4o-mini".to_string(), "gpt-4-turbo".to_string()],
            is_configured: configured_providers.contains(&"openai".to_string()),
        },
        ProviderConfig {
            name: "anthropic".to_string(),
            display_name: "Anthropic".to_string(),
            description: "Claude 3.5 Sonnet, Claude 3 Haiku, and Claude 3 Opus".to_string(),
            key_format: "sk-ant-...".to_string(),
            website: "https://console.anthropic.com/settings/keys".to_string(),
            models: vec!["claude-3-5-sonnet-20241022".to_string(), "claude-3-haiku-20240307".to_string()],
            is_configured: configured_providers.contains(&"anthropic".to_string()),
        },
        ProviderConfig {
            name: "gemini".to_string(),
            display_name: "Google Gemini".to_string(),
            description: "Gemini 2.0 Flash, Gemini 1.5 Pro models".to_string(),
            key_format: "AI...".to_string(),
            website: "https://aistudio.google.com/app/apikey".to_string(),
            models: vec!["gemini-2.0-flash".to_string(), "gemini-1.5-pro".to_string()],
            is_configured: configured_providers.contains(&"gemini".to_string()),
        },
        ProviderConfig {
            name: "cohere".to_string(),
            display_name: "Cohere".to_string(),
            description: "Command and Command Light models".to_string(),
            key_format: "co-...".to_string(),
            website: "https://dashboard.cohere.com/api-keys".to_string(),
            models: vec!["command".to_string(), "command-light".to_string()],
            is_configured: configured_providers.contains(&"cohere".to_string()),
        },
        ProviderConfig {
            name: "groq".to_string(),
            display_name: "Groq".to_string(),
            description: "Ultra-fast inference for Llama, Mixtral models".to_string(),
            key_format: "gsk_...".to_string(),
            website: "https://console.groq.com/keys".to_string(),
            models: vec!["llama-3.1-8b-instant".to_string(), "mixtral-8x7b-32768".to_string()],
            is_configured: configured_providers.contains(&"groq".to_string()),
        },
        ProviderConfig {
            name: "xai".to_string(),
            display_name: "xAI".to_string(),
            description: "Grok models from xAI".to_string(),
            key_format: "xai-...".to_string(),
            website: "https://console.x.ai/".to_string(),
            models: vec!["grok-beta".to_string()],
            is_configured: configured_providers.contains(&"xai".to_string()),
        },
        ProviderConfig {
            name: "deepseek".to_string(),
            display_name: "DeepSeek".to_string(),
            description: "DeepSeek Chat and Coder models".to_string(),
            key_format: "sk-...".to_string(),
            website: "https://platform.deepseek.com/api_keys".to_string(),
            models: vec!["deepseek-chat".to_string(), "deepseek-coder".to_string()],
            is_configured: configured_providers.contains(&"deepseek".to_string()),
        },
    ];
    
    Ok(providers)
}

/// Test provider connection
#[tauri::command]
pub async fn test_provider_connection(
    provider: String,
    state: tauri::State<'_, GenAIState>,
) -> Result<bool, GenAIError> {
    // Get a default model for the provider
    let test_model = match provider.as_str() {
        "openai" => "gpt-4o-mini",
        "anthropic" => "claude-3-haiku-20240307",
        "gemini" => "gemini-2.0-flash",
        "cohere" => "command-light",
        "groq" => "llama-3.1-8b-instant",
        "xai" => "grok-beta",
        "deepseek" => "deepseek-chat",
        _ => return Err(GenAIError::invalid_request(format!("Unknown provider: {}", provider))),
    };
    println!("Testing connection for provider: {}", provider);

    let auth_resolver = state.init_with_stronghold_auth().await?;

    let new_client = Client::builder()
        .with_auth_resolver(auth_resolver)
        .build();
    
    let test_request = ChatRequest::new(vec![ChatMessage::user("Hello")]);
    
    match new_client.exec_chat(test_model, test_request, None).await {
        Ok(_) => Ok(true),
        Err(e) => {
            tracing::warn!("Connection test failed for {}: {}", provider, e);
            Ok(false)
        }
    }
}

/// Load provider keys from Stronghold on startup
#[tauri::command]
pub async fn load_provider_keys_from_stronghold(
    state: tauri::State<'_, GenAIState>,
) -> Result<Vec<String>, GenAIError> {
    // This would be called from the frontend after Stronghold is initialized
    // and keys are loaded. The frontend would then call save_provider_key
    // for each loaded key to populate our in-memory cache.
    
    Ok(state.get_configured_providers().await)
}

/// List available models
#[tauri::command]
pub async fn list_available_models(
    state: tauri::State<'_, GenAIState>,
) -> Result<HashMap<String, Vec<String>>, GenAIError> {
    use genai::adapter::AdapterKind;

    let mut models = HashMap::new();
    let adapter_kinds = [
        AdapterKind::OpenAI,
        AdapterKind::Anthropic,
        AdapterKind::Gemini,
        AdapterKind::Cohere,
        AdapterKind::Groq,
        AdapterKind::Ollama,
        AdapterKind::Xai,
        AdapterKind::DeepSeek,
    ];

    for kind in adapter_kinds {
        match state.client.all_model_names(kind).await {
            Ok(model_names) => {
                models.insert(kind.to_string(), model_names);
            }
            Err(_) => {
                models.insert(kind.to_string(), vec![]);
            }
        }
    }

    Ok(models)
}

#[tauri::command]
pub async fn get_model_info(
    model: String,
    state: State<'_, GenAIState>,
) -> Result<ModelInfo, GenAIError> {
    // Try to resolve the model to get adapter information
    match state.client.resolve_service_target(&model).await {
        Ok(target) => {
            Ok(ModelInfo {
                name: model.clone(),
                provider: target.model.adapter_kind.to_string(),
                available: true,
                capabilities: ModelCapabilities {
                    streaming: true, // Most models support streaming
                    tools: matches!(
                        target.model.adapter_kind,
                        genai::adapter::AdapterKind::OpenAI |
                        genai::adapter::AdapterKind::Anthropic |
                        genai::adapter::AdapterKind::Gemini
                    ),
                    vision: model.contains("vision") || model.contains("4o"),
                    max_context_length: None, // Would need model-specific data
                    modalities: vec!["text".to_string()],
                },
                metadata: HashMap::new(),
            })
        }
        Err(_) => {
            Ok(ModelInfo {
                name: model.clone(),
                provider: "unknown".to_string(),
                available: false,
                capabilities: ModelCapabilities {
                    streaming: false,
                    tools: false,
                    vision: false,
                    max_context_length: None,
                    modalities: vec![],
                },
                metadata: HashMap::new(),
            })
        }
    }
}

/// Test model connection
#[tauri::command]
pub async fn test_model_connection(
    model: String,
    state: tauri::State<'_, GenAIState>,
) -> Result<bool, GenAIError> {
    let test_request = ChatRequest::new(vec![ChatMessage::user("Hello")]);

    match state.client.exec_chat(&model, test_request, None).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Configuration commands (unchanged)
#[tauri::command]
pub async fn update_config(
    config: GenAIConfig,
    state: tauri::State<'_, GenAIState>,
) -> Result<(), GenAIError> {
    *state.config.write().await = config;
    Ok(())
}

#[tauri::command]
pub async fn get_config(state: tauri::State<'_, GenAIState>) -> Result<GenAIConfig, GenAIError> {
    Ok(state.config.read().await.clone())
}

#[tauri::command]
pub async fn set_model_defaults(
    model: String,
    config: ModelConfig,
    state: State<'_, GenAIState>,
) -> Result<(), GenAIError> {
    state
        .config
        .write()
        .await
        .model_configs
        .insert(model.clone(), config);

    tracing::info!("Set defaults for model {}", model);
    Ok(())
}

/// Add authentication provider
#[tauri::command]
pub async fn add_auth_provider(
    provider: AuthProvider,
    state: State<'_, GenAIState>,
) -> Result<(), GenAIError> {
    let provider_name = provider.name.clone();
    state
        .config
        .write()
        .await
        .auth_providers
        .insert(provider_name.clone(), provider);

    tracing::info!("Added auth provider {}", provider_name);
    Ok(())
}

/// Remove authentication provider
#[tauri::command]
pub async fn remove_auth_provider(
    provider_name: String,
    state: State<'_, GenAIState>,
) -> Result<(), GenAIError> {
    state
        .config
        .write()
        .await
        .auth_providers
        .remove(&provider_name);

    tracing::info!("Removed auth provider {}", provider_name);
    Ok(())
}