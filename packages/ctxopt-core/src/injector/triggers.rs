//! Trigger logic for context injection
//!
//! Détermine quand et quoi injecter dans le stdin.

/// Injecteur de contexte pour suggestions MCP
pub struct ContextInjector {
    /// Intervalle minimum entre injections (ms)
    interval_ms: u64,
    /// Timestamp de la dernière injection
    last_injection: Option<std::time::Instant>,
}

impl ContextInjector {
    /// Crée un nouvel injecteur avec l'intervalle donné
    pub fn new(interval_ms: u64) -> Self {
        Self {
            interval_ms,
            last_injection: None,
        }
    }

    /// Vérifie si une injection est possible (throttling)
    pub fn can_inject(&self) -> bool {
        match self.last_injection {
            None => true,
            Some(last) => last.elapsed().as_millis() >= self.interval_ms as u128,
        }
    }

    /// Marque une injection comme effectuée
    pub fn mark_injected(&mut self) {
        self.last_injection = Some(std::time::Instant::now());
    }
}

impl Default for ContextInjector {
    fn default() -> Self {
        Self::new(5000) // 5 secondes par défaut
    }
}
