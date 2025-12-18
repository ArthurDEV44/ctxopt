//! Configuration du wrapper
//!
//! Gère ~/.ctxopt/config.toml et les settings
//! de session.

use serde::{Deserialize, Serialize};

/// Configuration du PTY wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Intervalle minimum entre injections (ms)
    pub injection_interval_ms: u64,

    /// Activer les suggestions
    pub suggestions_enabled: bool,

    /// Verbose logging
    pub verbose: bool,
}

impl Config {
    /// Crée une nouvelle configuration avec valeurs par défaut
    pub fn new() -> Self {
        Self {
            injection_interval_ms: 5000,
            suggestions_enabled: true,
            verbose: false,
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::new()
    }
}
