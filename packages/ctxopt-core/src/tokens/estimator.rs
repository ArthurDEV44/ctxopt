//! Token estimator implementation
//!
//! Utilise claude-tokenizer pour estimer le nombre de tokens.

/// Estimateur de tokens pour Claude
pub struct TokenEstimator {
    // Stateless - uses claude_tokenizer functions directly
}

impl TokenEstimator {
    /// Crée un nouvel estimateur
    pub const fn new() -> Self {
        Self {}
    }

    /// Estime le nombre de tokens pour un texte
    #[allow(clippy::unused_self)] // Stateless but kept as method for API consistency
    pub fn estimate(&self, text: &str) -> usize {
        // Use claude-tokenizer's count_tokens function
        // Falls back to approximation if tokenization fails
        claude_tokenizer::count_tokens(text).unwrap_or(text.len() / 4)
    }
}

impl Default for TokenEstimator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_basic() {
        let estimator = TokenEstimator::new();
        let count = estimator.estimate("hello world");
        // Should produce some tokens
        assert!(count > 0);
    }

    #[test]
    fn test_estimate_empty() {
        let estimator = TokenEstimator::new();
        let count = estimator.estimate("");
        assert_eq!(count, 0);
    }

    #[test]
    fn test_estimate_longer_text() {
        let estimator = TokenEstimator::new();
        let short_count = estimator.estimate("hello");
        let long_count = estimator.estimate("hello world, this is a longer sentence");
        assert!(long_count > short_count);
    }

    #[test]
    fn test_estimate_code() {
        let estimator = TokenEstimator::new();
        let count = estimator.estimate("fn main() { println!(\"Hello\"); }");
        assert!(count > 0);
    }
}
