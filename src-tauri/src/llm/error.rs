//! Error types for the GenAI Tauri integration

use genai::Error as GErr;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Main error type for the GenAI Tauri integration
#[derive(Error, Debug, Serialize, Deserialize)]
pub enum GenAIError {
    /// Session-related errors
    #[error("Session error: {message}")]
    Session { message: String },

    /// Model-related errors
    #[error("Model error: {message}")]
    Model { message: String },

    /// Authentication errors
    #[error("Authentication error: {message}")]
    Authentication { message: String },

    /// Configuration errors
    #[error("Configuration error: {message}")]
    Configuration { message: String },

    /// Streaming errors
    #[error("Streaming error: {message}")]
    Streaming { message: String },

    /// Tool-related errors
    #[error("Tool error: {message}")]
    Tool { message: String },

    /// Network/API errors
    #[error("API error: {message}")]
    Api { message: String },

    /// Serialization/deserialization errors
    #[error("Serialization error: {message}")]
    Serialization { message: String },

    /// File I/O errors
    #[error("IO error: {message}")]
    Io { message: String },

    /// Generic errors
    #[error("Error: {message}")]
    Generic { message: String },

    /// Session not found
    #[error("Session not found: {session_id}")]
    SessionNotFound { session_id: String },

    /// Model not available
    #[error("Model not available: {model}")]
    ModelNotAvailable { model: String },

    /// Invalid request
    #[error("Invalid request: {details}")]
    InvalidRequest { details: String },

    /// Rate limit exceeded
    #[error("Rate limit exceeded: {details}")]
    RateLimit { details: String },

    /// Timeout error
    #[error("Request timeout: {timeout_seconds}s")]
    Timeout { timeout_seconds: u64 },

    /// Insufficient permissions
    #[error("Insufficient permissions: {operation}")]
    Permission { operation: String },
}

/// Result type alias for GenAI operations
pub type GenAIResult<T> = Result<T, GenAIError>;

impl GenAIError {
    /// Create a new session error
    pub fn session(message: impl Into<String>) -> Self {
        Self::Session {
            message: message.into(),
        }
    }

    /// Create a new model error
    pub fn model(message: impl Into<String>) -> Self {
        Self::Model {
            message: message.into(),
        }
    }

    /// Create a new authentication error
    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication {
            message: message.into(),
        }
    }

    /// Create a new configuration error
    pub fn configuration(message: impl Into<String>) -> Self {
        Self::Configuration {
            message: message.into(),
        }
    }

    /// Create a new streaming error
    pub fn streaming(message: impl Into<String>) -> Self {
        Self::Streaming {
            message: message.into(),
        }
    }

    /// Create a new tool error
    pub fn tool(message: impl Into<String>) -> Self {
        Self::Tool {
            message: message.into(),
        }
    }

    /// Create a new API error
    pub fn api(message: impl Into<String>) -> Self {
        Self::Api {
            message: message.into(),
        }
    }

    /// Create a new generic error
    pub fn generic(message: impl Into<String>) -> Self {
        Self::Generic {
            message: message.into(),
        }
    }

    /// Create a session not found error
    pub fn session_not_found(session_id: impl Into<String>) -> Self {
        Self::SessionNotFound {
            session_id: session_id.into(),
        }
    }

    /// Create a model not available error
    pub fn model_not_available(model: impl Into<String>) -> Self {
        Self::ModelNotAvailable {
            model: model.into(),
        }
    }

    /// Create an invalid request error
    pub fn invalid_request(details: impl Into<String>) -> Self {
        Self::InvalidRequest {
            details: details.into(),
        }
    }

    /// Create a rate limit error
    pub fn rate_limit(details: impl Into<String>) -> Self {
        Self::RateLimit {
            details: details.into(),
        }
    }

    /// Create a timeout error
    pub fn timeout(timeout_seconds: u64) -> Self {
        Self::Timeout { timeout_seconds }
    }

    /// Create a permission error
    pub fn permission(operation: impl Into<String>) -> Self {
        Self::Permission {
            operation: operation.into(),
        }
    }

    /// Get the error category
    pub fn category(&self) -> &'static str {
        match self {
            Self::Session { .. } => "session",
            Self::Model { .. } => "model",
            Self::Authentication { .. } => "authentication",
            Self::Configuration { .. } => "configuration",
            Self::Streaming { .. } => "streaming",
            Self::Tool { .. } => "tool",
            Self::Api { .. } => "api",
            Self::Serialization { .. } => "serialization",
            Self::Io { .. } => "io",
            Self::Generic { .. } => "generic",
            Self::SessionNotFound { .. } => "session",
            Self::ModelNotAvailable { .. } => "model",
            Self::InvalidRequest { .. } => "request",
            Self::RateLimit { .. } => "rate_limit",
            Self::Timeout { .. } => "timeout",
            Self::Permission { .. } => "permission",
        }
    }

    /// Check if the error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::Api { .. } | Self::Timeout { .. } | Self::RateLimit { .. }
        )
    }
}

// Convert from genai errors
impl From<GErr> for GenAIError {
    fn from(err: GErr) -> Self {
        Self::Api {
            message: err.to_string(),
        }
    }
}

// Convert from serde_json errors
impl From<serde_json::Error> for GenAIError {
    fn from(err: serde_json::Error) -> Self {
        Self::Serialization {
            message: err.to_string(),
        }
    }
}

// Convert from std::io errors
impl From<std::io::Error> for GenAIError {
    fn from(err: std::io::Error) -> Self {
        Self::Io {
            message: err.to_string(),
        }
    }
}

// Convert from anyhow errors
impl From<anyhow::Error> for GenAIError {
    fn from(err: anyhow::Error) -> Self {
        Self::Generic {
            message: err.to_string(),
        }
    }
}

/// Error context for better error reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorContext {
    /// Error code for programmatic handling
    pub code: String,
    /// Human-readable message
    pub message: String,
    /// Additional context data
    pub context: std::collections::HashMap<String, serde_json::Value>,
    /// Timestamp when error occurred
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Stack trace or call stack information
    pub stack: Option<String>,
}

impl ErrorContext {
    /// Create a new error context
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            context: std::collections::HashMap::new(),
            timestamp: chrono::Utc::now(),
            stack: None,
        }
    }

    /// Add context data
    pub fn with_context(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.context.insert(key.into(), value);
        self
    }

    /// Add stack trace
    pub fn with_stack(mut self, stack: impl Into<String>) -> Self {
        self.stack = Some(stack.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = GenAIError::session("Test session error");
        assert_eq!(err.category(), "session");
        assert!(!err.is_retryable());
    }

    #[test]
    fn test_retryable_errors() {
        let timeout_err = GenAIError::timeout(30);
        assert!(timeout_err.is_retryable());

        let session_err = GenAIError::session("test");
        assert!(!session_err.is_retryable());
    }

    #[test]
    fn test_error_context() {
        let ctx = ErrorContext::new("TEST_001", "Test error message")
            .with_context("session_id", serde_json::json!("12345"));

        assert_eq!(ctx.code, "TEST_001");
        assert_eq!(ctx.message, "Test error message");
        assert!(ctx.context.contains_key("session_id"));
    }
}
