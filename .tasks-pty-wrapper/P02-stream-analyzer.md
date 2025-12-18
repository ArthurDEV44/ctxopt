# P02 - Stream Analyzer

## Objectif

Implémenter l'analyseur de flux qui détecte les patterns dans le stdout du PTY pour identifier les opportunités d'optimisation (erreurs build, outputs volumineux, prompts ready).

## Contexte

### Patterns à Détecter
1. **Erreurs de build** - TypeScript, ESLint, Rust, Go, Python
2. **Lectures de fichiers** - Quand Claude lit des fichiers volumineux
3. **Outputs volumineux** - Sorties > 5000 caractères
4. **Prompt ready** - Quand Claude attend une entrée utilisateur

### Ressources
- [regex crate](https://docs.rs/regex/latest/regex/)
- [once_cell](https://docs.rs/once_cell/latest/once_cell/) - Lazy static patterns

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      StreamAnalyzer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │  RingBuffer    │──────►│ Pattern Matcher│                    │
│  │ (historique)   │       │   (regex)      │                    │
│  └────────────────┘       └───────┬────────┘                    │
│                                   │                              │
│                           ┌───────▼────────┐                    │
│                           │  ContentType   │                    │
│                           │    Enum        │                    │
│                           └───────┬────────┘                    │
│                                   │                              │
│  ┌────────────────┐       ┌───────▼────────┐                    │
│  │ Token Counter  │◄──────│   Analysis     │                    │
│  │  (estimation)  │       │   Results      │                    │
│  └────────────────┘       └────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Rust Complet

### src/stream/mod.rs

```rust
//! Stream analysis pour détecter les patterns
//!
//! Analyse le stdout du PTY pour identifier:
//! - Erreurs de build
//! - Lectures de fichiers
//! - Outputs volumineux
//! - Prompts ready

pub mod analyzer;
pub mod buffer;
pub mod patterns;

pub use analyzer::{StreamAnalyzer, AnalysisResult};
pub use buffer::RingBuffer;
pub use patterns::ContentType;
```

### src/stream/patterns.rs

```rust
//! Définition des patterns et types de contenu détectés

use once_cell::sync::Lazy;
use regex::Regex;

/// Types de contenu détectés dans le flux
#[derive(Debug, Clone, PartialEq)]
pub enum ContentType {
    /// Erreurs de build détectées
    BuildError {
        /// Nombre d'erreurs détectées
        error_count: usize,
        /// Type de build tool (tsc, eslint, cargo, go, python)
        tool: BuildTool,
    },

    /// Lecture de fichier détectée
    FileRead {
        /// Chemin du fichier lu
        file_path: String,
    },

    /// Output volumineux (> threshold)
    LargeOutput {
        /// Taille en caractères
        size: usize,
    },

    /// Claude est prêt pour une entrée
    PromptReady,

    /// Contenu normal (pas de pattern détecté)
    Normal,
}

/// Outils de build reconnus
#[derive(Debug, Clone, PartialEq, Copy)]
pub enum BuildTool {
    TypeScript,  // tsc, ts-node
    ESLint,      // eslint
    Rust,        // cargo, rustc
    Go,          // go build
    Python,      // python, pytest
    Webpack,     // webpack
    Vite,        // vite
    Generic,     // autre
}

impl BuildTool {
    pub fn as_str(&self) -> &'static str {
        match self {
            BuildTool::TypeScript => "tsc",
            BuildTool::ESLint => "eslint",
            BuildTool::Rust => "cargo",
            BuildTool::Go => "go",
            BuildTool::Python => "python",
            BuildTool::Webpack => "webpack",
            BuildTool::Vite => "vite",
            BuildTool::Generic => "generic",
        }
    }
}

// Patterns regex compilés une seule fois
pub static PATTERNS: Lazy<Patterns> = Lazy::new(Patterns::new);

pub struct Patterns {
    /// Erreurs TypeScript: TS2304, TS7006, etc.
    pub typescript_error: Regex,

    /// Erreurs ESLint
    pub eslint_error: Regex,

    /// Erreurs Rust/Cargo
    pub rust_error: Regex,

    /// Erreurs Go
    pub go_error: Regex,

    /// Erreurs Python
    pub python_error: Regex,

    /// Pattern générique d'erreur
    pub generic_error: Regex,

    /// Lecture de fichier (Read tool, file_path)
    pub file_read: Regex,

    /// Prompt ready (❯, >, $)
    pub prompt_ready: Regex,

    /// ANSI escape codes (pour stripping)
    pub ansi_escape: Regex,
}

impl Patterns {
    pub fn new() -> Self {
        Self {
            // TypeScript: error TS2304: Cannot find name 'foo'
            typescript_error: Regex::new(
                r"(?i)error\s+TS\d{4}:|Cannot find (name|module)|has no exported member"
            ).unwrap(),

            // ESLint: error  'foo' is not defined  no-undef
            eslint_error: Regex::new(
                r"(?i)\d+:\d+\s+(error|warning)\s+.+\s+\S+/\S+"
            ).unwrap(),

            // Rust: error[E0425]: cannot find value `foo`
            rust_error: Regex::new(
                r"(?i)error\[E\d{4}\]:|cannot find (value|type|crate)"
            ).unwrap(),

            // Go: undefined: foo
            go_error: Regex::new(
                r"(?i)undefined:|cannot find package|syntax error"
            ).unwrap(),

            // Python: NameError, ImportError, SyntaxError
            python_error: Regex::new(
                r"(?i)(NameError|ImportError|SyntaxError|ModuleNotFoundError|TypeError):"
            ).unwrap(),

            // Générique: error, failed, cannot
            generic_error: Regex::new(
                r"(?i)(^|\s)(error|failed|cannot|unexpected|compilation failed)(\s|:)"
            ).unwrap(),

            // File read patterns
            file_read: Regex::new(
                r#"(?i)(Read(ing)?(\s+file)?|file_path)[:\s]+["']?([^\s"']+\.(ts|js|tsx|jsx|py|rs|go|java|c|cpp|h|hpp|md|json|yaml|yml|toml))["']?"#
            ).unwrap(),

            // Prompt ready (fin de ligne avec prompt shell)
            prompt_ready: Regex::new(
                r"(❯|>\s*$|\$\s*$|claude\s*>\s*$)"
            ).unwrap(),

            // ANSI escape sequences
            ansi_escape: Regex::new(
                r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07"
            ).unwrap(),
        }
    }
}

impl Default for Patterns {
    fn default() -> Self {
        Self::new()
    }
}
```

### src/stream/buffer.rs

```rust
//! Ring buffer pour stocker l'historique du flux

use std::collections::VecDeque;

/// Buffer circulaire pour stocker les derniers N caractères
#[derive(Debug)]
pub struct RingBuffer {
    /// Données stockées
    data: VecDeque<char>,

    /// Capacité maximale
    capacity: usize,
}

impl RingBuffer {
    /// Crée un nouveau buffer avec la capacité spécifiée
    pub fn new(capacity: usize) -> Self {
        Self {
            data: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    /// Ajoute des caractères au buffer
    pub fn push(&mut self, text: &str) {
        for ch in text.chars() {
            if self.data.len() >= self.capacity {
                self.data.pop_front();
            }
            self.data.push_back(ch);
        }
    }

    /// Retourne le contenu actuel du buffer
    pub fn content(&self) -> String {
        self.data.iter().collect()
    }

    /// Vide le buffer
    pub fn clear(&mut self) {
        self.data.clear();
    }

    /// Retourne la taille actuelle
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Vérifie si le buffer est vide
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Retourne les N derniers caractères
    pub fn last_n(&self, n: usize) -> String {
        let start = self.data.len().saturating_sub(n);
        self.data.iter().skip(start).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ring_buffer_push() {
        let mut buf = RingBuffer::new(10);
        buf.push("hello");
        assert_eq!(buf.content(), "hello");
        assert_eq!(buf.len(), 5);
    }

    #[test]
    fn test_ring_buffer_overflow() {
        let mut buf = RingBuffer::new(5);
        buf.push("hello world");
        assert_eq!(buf.content(), "world");
        assert_eq!(buf.len(), 5);
    }

    #[test]
    fn test_ring_buffer_last_n() {
        let mut buf = RingBuffer::new(100);
        buf.push("hello world");
        assert_eq!(buf.last_n(5), "world");
    }
}
```

### src/stream/analyzer.rs

```rust
//! Analyseur de flux principal

use super::buffer::RingBuffer;
use super::patterns::{BuildTool, ContentType, PATTERNS};
use crate::tokens::TokenEstimator;

/// Seuil pour détecter un output volumineux (en caractères)
const LARGE_OUTPUT_THRESHOLD: usize = 5000;

/// Capacité du ring buffer (caractères)
const BUFFER_CAPACITY: usize = 50000;

/// Résultat d'analyse d'un chunk
#[derive(Debug, Clone)]
pub struct AnalysisResult {
    /// Types de contenu détectés
    pub content_types: Vec<ContentType>,

    /// Estimation de tokens pour ce chunk
    pub token_estimate: usize,

    /// Taille totale accumulée
    pub total_size: usize,

    /// Texte nettoyé (sans ANSI)
    pub clean_text: String,
}

/// Analyseur de flux stdout
pub struct StreamAnalyzer {
    /// Buffer pour l'historique
    buffer: RingBuffer,

    /// Estimateur de tokens
    token_estimator: TokenEstimator,

    /// Compteur de tokens total
    total_tokens: usize,

    /// Compteur d'erreurs détectées
    error_count: usize,
}

impl StreamAnalyzer {
    /// Crée un nouvel analyseur
    pub fn new() -> Self {
        Self {
            buffer: RingBuffer::new(BUFFER_CAPACITY),
            token_estimator: TokenEstimator::new(),
            total_tokens: 0,
            error_count: 0,
        }
    }

    /// Analyse un chunk de données et retourne les types détectés
    pub fn analyze(&mut self, chunk: &str) -> AnalysisResult {
        // Nettoyer les ANSI escape codes
        let clean_text = self.strip_ansi(chunk);

        // Ajouter au buffer
        self.buffer.push(&clean_text);

        // Estimer les tokens
        let token_estimate = self.token_estimator.estimate(&clean_text);
        self.total_tokens += token_estimate;

        // Détecter les patterns
        let mut content_types = Vec::new();

        // 1. Détecter les erreurs de build
        if let Some(build_error) = self.detect_build_errors(&clean_text) {
            content_types.push(build_error);
        }

        // 2. Détecter les lectures de fichiers
        if let Some(file_read) = self.detect_file_read(&clean_text) {
            content_types.push(file_read);
        }

        // 3. Détecter les outputs volumineux
        if self.buffer.len() > LARGE_OUTPUT_THRESHOLD {
            content_types.push(ContentType::LargeOutput {
                size: self.buffer.len(),
            });
        }

        // 4. Détecter le prompt ready
        if self.detect_prompt_ready(&clean_text) {
            content_types.push(ContentType::PromptReady);
            // Reset le buffer après un prompt
            self.buffer.clear();
        }

        // Si aucun pattern détecté
        if content_types.is_empty() {
            content_types.push(ContentType::Normal);
        }

        AnalysisResult {
            content_types,
            token_estimate,
            total_size: self.buffer.len(),
            clean_text,
        }
    }

    /// Supprime les codes ANSI escape
    fn strip_ansi(&self, text: &str) -> String {
        PATTERNS.ansi_escape.replace_all(text, "").to_string()
    }

    /// Détecte les erreurs de build
    fn detect_build_errors(&mut self, text: &str) -> Option<ContentType> {
        // TypeScript
        let ts_count = PATTERNS.typescript_error.find_iter(text).count();
        if ts_count > 0 {
            self.error_count += ts_count;
            return Some(ContentType::BuildError {
                error_count: ts_count,
                tool: BuildTool::TypeScript,
            });
        }

        // ESLint
        let eslint_count = PATTERNS.eslint_error.find_iter(text).count();
        if eslint_count > 0 {
            self.error_count += eslint_count;
            return Some(ContentType::BuildError {
                error_count: eslint_count,
                tool: BuildTool::ESLint,
            });
        }

        // Rust
        let rust_count = PATTERNS.rust_error.find_iter(text).count();
        if rust_count > 0 {
            self.error_count += rust_count;
            return Some(ContentType::BuildError {
                error_count: rust_count,
                tool: BuildTool::Rust,
            });
        }

        // Go
        let go_count = PATTERNS.go_error.find_iter(text).count();
        if go_count > 0 {
            self.error_count += go_count;
            return Some(ContentType::BuildError {
                error_count: go_count,
                tool: BuildTool::Go,
            });
        }

        // Python
        let python_count = PATTERNS.python_error.find_iter(text).count();
        if python_count > 0 {
            self.error_count += python_count;
            return Some(ContentType::BuildError {
                error_count: python_count,
                tool: BuildTool::Python,
            });
        }

        // Générique
        let generic_count = PATTERNS.generic_error.find_iter(text).count();
        if generic_count > 0 {
            self.error_count += generic_count;
            return Some(ContentType::BuildError {
                error_count: generic_count,
                tool: BuildTool::Generic,
            });
        }

        None
    }

    /// Détecte les lectures de fichiers
    fn detect_file_read(&self, text: &str) -> Option<ContentType> {
        if let Some(captures) = PATTERNS.file_read.captures(text) {
            if let Some(file_match) = captures.get(4) {
                return Some(ContentType::FileRead {
                    file_path: file_match.as_str().to_string(),
                });
            }
        }
        None
    }

    /// Détecte si le prompt est prêt
    fn detect_prompt_ready(&self, text: &str) -> bool {
        // Vérifier les derniers caractères
        let last_chars = self.buffer.last_n(50);
        PATTERNS.prompt_ready.is_match(&last_chars) ||
            PATTERNS.prompt_ready.is_match(text)
    }

    /// Retourne le total de tokens estimés
    pub fn total_tokens(&self) -> usize {
        self.total_tokens
    }

    /// Retourne le total d'erreurs détectées
    pub fn total_errors(&self) -> usize {
        self.error_count
    }

    /// Reset les compteurs
    pub fn reset(&mut self) {
        self.buffer.clear();
        self.total_tokens = 0;
        self.error_count = 0;
    }
}

impl Default for StreamAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_typescript_error() {
        let mut analyzer = StreamAnalyzer::new();
        let result = analyzer.analyze("error TS2304: Cannot find name 'foo'");

        assert!(result.content_types.iter().any(|ct| matches!(
            ct,
            ContentType::BuildError { tool: BuildTool::TypeScript, .. }
        )));
    }

    #[test]
    fn test_detect_rust_error() {
        let mut analyzer = StreamAnalyzer::new();
        let result = analyzer.analyze("error[E0425]: cannot find value `foo`");

        assert!(result.content_types.iter().any(|ct| matches!(
            ct,
            ContentType::BuildError { tool: BuildTool::Rust, .. }
        )));
    }

    #[test]
    fn test_detect_file_read() {
        let mut analyzer = StreamAnalyzer::new();
        let result = analyzer.analyze("Reading file: src/main.ts");

        assert!(result.content_types.iter().any(|ct| matches!(
            ct,
            ContentType::FileRead { .. }
        )));
    }

    #[test]
    fn test_detect_large_output() {
        let mut analyzer = StreamAnalyzer::new();

        // Générer un output volumineux
        let large_text = "x".repeat(6000);
        let result = analyzer.analyze(&large_text);

        assert!(result.content_types.iter().any(|ct| matches!(
            ct,
            ContentType::LargeOutput { .. }
        )));
    }

    #[test]
    fn test_strip_ansi() {
        let analyzer = StreamAnalyzer::new();
        let text_with_ansi = "\x1b[31mError\x1b[0m: something failed";
        let clean = analyzer.strip_ansi(text_with_ansi);

        assert_eq!(clean, "Error: something failed");
    }
}
```

---

## Tâches

- [ ] Créer `src/stream/mod.rs` avec les exports
- [ ] Créer `src/stream/patterns.rs` avec tous les patterns regex
- [ ] Créer `src/stream/buffer.rs` avec RingBuffer
- [ ] Créer `src/stream/analyzer.rs` avec StreamAnalyzer
- [ ] Implémenter la détection TypeScript/ESLint
- [ ] Implémenter la détection Rust/Cargo
- [ ] Implémenter la détection Go/Python
- [ ] Implémenter la détection de fichiers lus
- [ ] Implémenter la détection d'outputs volumineux
- [ ] Implémenter la détection de prompt ready
- [ ] Implémenter le stripping ANSI
- [ ] Écrire tests unitaires pour chaque pattern
- [ ] Tester avec des vraies sorties de build

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/stream/mod.rs` | Module exports |
| `src/stream/patterns.rs` | Patterns regex compilés |
| `src/stream/buffer.rs` | RingBuffer |
| `src/stream/analyzer.rs` | StreamAnalyzer principal |

---

## Dépendances

**Prérequis**: P00 (project setup)

**Bloque**: P03 (context injector), P04 (napi bindings)

---

## Critères de Succès

1. Détecte correctement les erreurs TypeScript (TS2304, etc.)
2. Détecte correctement les erreurs Rust (E0425, etc.)
3. Détecte correctement les erreurs Go et Python
4. Détecte les lectures de fichiers (.ts, .js, .py, .rs, .go)
5. Détecte les outputs > 5000 caractères
6. Détecte le prompt ready (❯, $)
7. Strip correctement les codes ANSI
8. RingBuffer fonctionne correctement avec overflow
9. Tous les tests passent
