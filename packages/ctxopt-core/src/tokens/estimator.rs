//! Token estimator implementation
//!
//! Utilise claude-tokenizer pour estimer le nombre de tokens.

/// Estimateur de tokens pour Claude
pub struct TokenEstimator {
    // TODO: Implement in future phase
}

impl TokenEstimator {
    /// Crée un nouvel estimateur
    pub fn new() -> Self {
        Self {}
    }

    /// Estime le nombre de tokens pour un texte
    pub fn estimate(&self, text: &str) -> usize {
        // Approximation simple: ~4 caractères par token
        text.len() / 4
    }
}

impl Default for TokenEstimator {
    fn default() -> Self {
        Self::new()
    }
}
