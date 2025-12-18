# P03 - Context Injector

## Objectif

Implémenter le système d'injection de contexte qui génère des suggestions basées sur les patterns détectés et les injecte dans le stdin du PTY au moment opportun.

## Contexte

### Stratégie d'Injection
L'injection doit être:
- **Non-intrusive** - Ne pas interrompre le workflow utilisateur
- **Throttled** - Maximum une injection toutes les 5 secondes
- **Contextuelle** - Suggestions pertinentes basées sur le pattern détecté
- **Optionnelle** - Peut être désactivée par l'utilisateur

### Moments d'Injection
1. **Après erreurs de build** - Suggérer `mcp__ctxopt__auto_optimize`
2. **Après output volumineux** - Suggérer `mcp__ctxopt__compress_context`
3. **Après prompt ready** - Rappel léger des outils disponibles
4. **Après lecture fichier** - Suggérer `mcp__ctxopt__smart_file_read`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ContextInjector                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │    Trigger     │──────►│   Template     │                    │
│  │   Evaluator    │       │   Generator    │                    │
│  └────────────────┘       └───────┬────────┘                    │
│          ▲                        │                              │
│          │                        ▼                              │
│  ┌───────┴────────┐       ┌────────────────┐                    │
│  │  ContentType   │       │  Suggestion    │                    │
│  │   (input)      │       │   (output)     │                    │
│  └────────────────┘       └───────┬────────┘                    │
│                                   │                              │
│  ┌────────────────┐       ┌───────▼────────┐                    │
│  │   Throttle     │◄──────│  Rate Limiter  │                    │
│  │   Timer        │       │  (5s min)      │                    │
│  └────────────────┘       └────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Rust Complet

### src/injector/mod.rs

```rust
//! Context injection via stdin
//!
//! Injecte des suggestions dans le stdin du PTY
//! quand des patterns optimisables sont détectés.

pub mod triggers;
pub mod templates;

pub use triggers::ContextInjector;
pub use templates::{Suggestion, SuggestionType};
```

### src/injector/templates.rs

```rust
//! Templates de suggestions pour chaque type de contenu

use crate::stream::patterns::BuildTool;

/// Type de suggestion
#[derive(Debug, Clone, PartialEq)]
pub enum SuggestionType {
    /// Erreurs de build détectées
    BuildErrors,
    /// Output volumineux
    LargeOutput,
    /// Prompt ready (rappel léger)
    PromptReminder,
    /// Lecture de fichier
    FileRead,
}

/// Suggestion générée
#[derive(Debug, Clone)]
pub struct Suggestion {
    /// Type de suggestion
    pub suggestion_type: SuggestionType,

    /// Message à afficher (pas injecté dans stdin)
    pub display_message: String,

    /// Commande à injecter (optionnel)
    pub inject_command: Option<String>,

    /// Priorité (plus haut = plus important)
    pub priority: u8,
}

impl Suggestion {
    /// Crée une suggestion pour erreurs de build
    pub fn build_errors(error_count: usize, tool: BuildTool) -> Self {
        Self {
            suggestion_type: SuggestionType::BuildErrors,
            display_message: format!(
                "\x1b[33m[ctxopt]\x1b[0m {} {} errors detected. \
                 Use \x1b[36mmcp__ctxopt__auto_optimize\x1b[0m to compress (95%+ savings).",
                error_count,
                tool.as_str()
            ),
            inject_command: None, // On n'injecte pas automatiquement
            priority: 10,
        }
    }

    /// Crée une suggestion pour output volumineux
    pub fn large_output(size: usize) -> Self {
        let size_kb = size / 1024;
        Self {
            suggestion_type: SuggestionType::LargeOutput,
            display_message: format!(
                "\x1b[33m[ctxopt]\x1b[0m Large output (~{}KB). \
                 Use \x1b[36mmcp__ctxopt__compress_context\x1b[0m for 40-60% savings.",
                size_kb
            ),
            inject_command: None,
            priority: 8,
        }
    }

    /// Crée un rappel après prompt ready
    pub fn prompt_reminder() -> Self {
        Self {
            suggestion_type: SuggestionType::PromptReminder,
            display_message: format!(
                "\x1b[90m[ctxopt] MCP tools: smart_file_read, auto_optimize, compress_context\x1b[0m"
            ),
            inject_command: None,
            priority: 1, // Basse priorité
        }
    }

    /// Crée une suggestion pour lecture de fichier
    pub fn file_read(file_path: &str) -> Self {
        Self {
            suggestion_type: SuggestionType::FileRead,
            display_message: format!(
                "\x1b[33m[ctxopt]\x1b[0m Reading {}. \
                 Consider \x1b[36mmcp__ctxopt__smart_file_read\x1b[0m for 50-70% savings.",
                file_path
            ),
            inject_command: None,
            priority: 5,
        }
    }

    /// Formatte le message pour affichage terminal
    pub fn format_for_display(&self) -> String {
        format!("\n{}\n", self.display_message)
    }
}

/// Messages pré-formatés pour injection rapide
pub mod quick_messages {
    /// Message court pour erreurs build
    pub const BUILD_HINT: &str = "\n\x1b[33m[ctxopt]\x1b[0m TIP: Use auto_optimize for build errors\n";

    /// Message court pour output volumineux
    pub const LARGE_HINT: &str = "\n\x1b[33m[ctxopt]\x1b[0m TIP: Use compress_context for large output\n";

    /// Message court pour fichiers
    pub const FILE_HINT: &str = "\n\x1b[33m[ctxopt]\x1b[0m TIP: Use smart_file_read for code files\n";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_errors_suggestion() {
        let suggestion = Suggestion::build_errors(42, BuildTool::TypeScript);
        assert_eq!(suggestion.suggestion_type, SuggestionType::BuildErrors);
        assert!(suggestion.display_message.contains("42"));
        assert!(suggestion.display_message.contains("tsc"));
    }

    #[test]
    fn test_large_output_suggestion() {
        let suggestion = Suggestion::large_output(10240);
        assert!(suggestion.display_message.contains("10KB"));
    }
}
```

### src/injector/triggers.rs

```rust
//! Logique de déclenchement des injections

use std::time::{Duration, Instant};
use crate::stream::patterns::{ContentType, BuildTool};
use super::templates::{Suggestion, SuggestionType};

/// Intervalle minimum entre deux injections (en secondes)
const MIN_INJECTION_INTERVAL_SECS: u64 = 5;

/// Nombre maximum de rappels prompt par session
const MAX_PROMPT_REMINDERS: usize = 3;

/// Contexte d'injection avec état
pub struct ContextInjector {
    /// Dernier timestamp d'injection
    last_injection: Instant,

    /// Intervalle minimum entre injections
    min_interval: Duration,

    /// Compteur de suggestions générées
    suggestions_count: usize,

    /// Compteur de rappels prompt
    prompt_reminder_count: usize,

    /// Suggestions activées
    enabled: bool,

    /// Historique des types injectés (pour éviter répétitions)
    recent_types: Vec<SuggestionType>,
}

impl ContextInjector {
    /// Crée un nouvel injecteur
    pub fn new() -> Self {
        Self {
            // Permet une injection immédiate au démarrage
            last_injection: Instant::now() - Duration::from_secs(60),
            min_interval: Duration::from_secs(MIN_INJECTION_INTERVAL_SECS),
            suggestions_count: 0,
            prompt_reminder_count: 0,
            enabled: true,
            recent_types: Vec::new(),
        }
    }

    /// Crée un injecteur avec intervalle personnalisé
    pub fn with_interval(interval_ms: u64) -> Self {
        let mut injector = Self::new();
        injector.min_interval = Duration::from_millis(interval_ms);
        injector
    }

    /// Active/désactive les suggestions
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    /// Vérifie si une injection est autorisée
    fn can_inject(&self) -> bool {
        self.enabled && self.last_injection.elapsed() >= self.min_interval
    }

    /// Vérifie si ce type a été récemment suggéré
    fn was_recently_suggested(&self, suggestion_type: &SuggestionType) -> bool {
        self.recent_types.iter().rev().take(3).any(|t| t == suggestion_type)
    }

    /// Évalue si une injection doit être faite pour le ContentType donné
    pub fn should_inject(&self, content_type: &ContentType) -> bool {
        if !self.can_inject() {
            return false;
        }

        match content_type {
            ContentType::BuildError { error_count, .. } => {
                // Injecter si plus de 3 erreurs et pas récemment suggéré
                *error_count >= 3 && !self.was_recently_suggested(&SuggestionType::BuildErrors)
            }
            ContentType::LargeOutput { size } => {
                // Injecter si > 10KB et pas récemment suggéré
                *size > 10000 && !self.was_recently_suggested(&SuggestionType::LargeOutput)
            }
            ContentType::FileRead { .. } => {
                // Injecter seulement si c'est un fichier code et pas récemment suggéré
                !self.was_recently_suggested(&SuggestionType::FileRead)
            }
            ContentType::PromptReady => {
                // Limiter les rappels prompt
                self.prompt_reminder_count < MAX_PROMPT_REMINDERS
            }
            ContentType::Normal => false,
        }
    }

    /// Génère une suggestion pour le ContentType donné
    pub fn generate_suggestion(&mut self, content_type: &ContentType) -> Option<Suggestion> {
        if !self.should_inject(content_type) {
            return None;
        }

        let suggestion = match content_type {
            ContentType::BuildError { error_count, tool } => {
                Some(Suggestion::build_errors(*error_count, *tool))
            }
            ContentType::LargeOutput { size } => {
                Some(Suggestion::large_output(*size))
            }
            ContentType::FileRead { file_path } => {
                // Seulement pour les fichiers code
                if Self::is_code_file(file_path) {
                    Some(Suggestion::file_read(file_path))
                } else {
                    None
                }
            }
            ContentType::PromptReady => {
                self.prompt_reminder_count += 1;
                Some(Suggestion::prompt_reminder())
            }
            ContentType::Normal => None,
        };

        if let Some(ref s) = suggestion {
            self.last_injection = Instant::now();
            self.suggestions_count += 1;
            self.recent_types.push(s.suggestion_type.clone());

            // Garder seulement les 10 derniers types
            if self.recent_types.len() > 10 {
                self.recent_types.remove(0);
            }
        }

        suggestion
    }

    /// Vérifie si le fichier est un fichier code
    fn is_code_file(path: &str) -> bool {
        let code_extensions = [
            ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go",
            ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".rb",
            ".php", ".swift", ".kt", ".scala", ".ex", ".exs",
        ];
        code_extensions.iter().any(|ext| path.ends_with(ext))
    }

    /// Retourne le nombre total de suggestions générées
    pub fn total_suggestions(&self) -> usize {
        self.suggestions_count
    }

    /// Reset les compteurs (nouvelle session)
    pub fn reset(&mut self) {
        self.suggestions_count = 0;
        self.prompt_reminder_count = 0;
        self.recent_types.clear();
        self.last_injection = Instant::now() - Duration::from_secs(60);
    }

    /// Retourne le temps restant avant prochaine injection possible (en ms)
    pub fn time_until_next_injection(&self) -> u64 {
        let elapsed = self.last_injection.elapsed();
        if elapsed >= self.min_interval {
            0
        } else {
            (self.min_interval - elapsed).as_millis() as u64
        }
    }
}

impl Default for ContextInjector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_inject_build_errors() {
        let injector = ContextInjector::new();

        // Moins de 3 erreurs: pas d'injection
        assert!(!injector.should_inject(&ContentType::BuildError {
            error_count: 2,
            tool: BuildTool::TypeScript,
        }));

        // 3+ erreurs: injection
        assert!(injector.should_inject(&ContentType::BuildError {
            error_count: 5,
            tool: BuildTool::TypeScript,
        }));
    }

    #[test]
    fn test_throttling() {
        let mut injector = ContextInjector::with_interval(100); // 100ms pour test

        // Première injection OK
        let content = ContentType::BuildError {
            error_count: 10,
            tool: BuildTool::Rust,
        };
        assert!(injector.generate_suggestion(&content).is_some());

        // Deuxième immédiate: bloquée par throttle
        assert!(injector.generate_suggestion(&content).is_none());

        // Après attente: OK (mais bloquée par recent_types)
        std::thread::sleep(Duration::from_millis(150));
        assert!(injector.generate_suggestion(&content).is_none()); // Recent type

        // Différent type: OK
        let other_content = ContentType::LargeOutput { size: 50000 };
        assert!(injector.generate_suggestion(&other_content).is_some());
    }

    #[test]
    fn test_is_code_file() {
        assert!(ContextInjector::is_code_file("src/main.ts"));
        assert!(ContextInjector::is_code_file("app.py"));
        assert!(ContextInjector::is_code_file("lib.rs"));
        assert!(!ContextInjector::is_code_file("README.md"));
        assert!(!ContextInjector::is_code_file("config.json"));
    }

    #[test]
    fn test_prompt_reminder_limit() {
        let mut injector = ContextInjector::new();

        // Les 3 premiers OK
        for _ in 0..3 {
            assert!(injector.generate_suggestion(&ContentType::PromptReady).is_some());
            // Reset throttle pour test
            injector.last_injection = Instant::now() - Duration::from_secs(60);
        }

        // Le 4ème bloqué
        injector.last_injection = Instant::now() - Duration::from_secs(60);
        assert!(injector.generate_suggestion(&ContentType::PromptReady).is_none());
    }
}
```

---

## Intégration avec PTY

```rust
// Exemple d'utilisation dans la boucle principale

use crate::pty::PtyManager;
use crate::stream::StreamAnalyzer;
use crate::injector::ContextInjector;

async fn main_loop(pty: &PtyManager) {
    let mut analyzer = StreamAnalyzer::new();
    let mut injector = ContextInjector::new();

    loop {
        // Lire du PTY
        let output = pty.read().await?;
        if output.is_empty() {
            tokio::time::sleep(Duration::from_millis(10)).await;
            continue;
        }

        // Analyser
        let text = String::from_utf8_lossy(&output);
        let analysis = analyzer.analyze(&text);

        // Afficher la sortie originale
        print!("{}", text);

        // Vérifier si injection nécessaire
        for content_type in &analysis.content_types {
            if let Some(suggestion) = injector.generate_suggestion(content_type) {
                // Afficher la suggestion (pas injectée dans stdin)
                eprint!("{}", suggestion.format_for_display());
            }
        }
    }
}
```

---

## Tâches

- [ ] Créer `src/injector/mod.rs` avec les exports
- [ ] Créer `src/injector/templates.rs` avec Suggestion et SuggestionType
- [ ] Créer `src/injector/triggers.rs` avec ContextInjector
- [ ] Implémenter le throttling (5s minimum)
- [ ] Implémenter la détection de types récents
- [ ] Implémenter les templates pour chaque type
- [ ] Implémenter la limite de prompt reminders
- [ ] Implémenter `is_code_file()`
- [ ] Ajouter couleurs ANSI aux messages
- [ ] Écrire tests unitaires complets
- [ ] Tester l'intégration avec StreamAnalyzer

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/injector/mod.rs` | Module exports |
| `src/injector/templates.rs` | Templates de suggestions |
| `src/injector/triggers.rs` | Logique de déclenchement |

---

## Dépendances

**Prérequis**: P00 (project setup), P02 (stream analyzer)

**Bloque**: P04 (napi bindings)

---

## Critères de Succès

1. Throttling fonctionne (5s minimum entre injections)
2. Ne répète pas le même type de suggestion 3 fois de suite
3. Limite les prompt reminders à 3 par session
4. Génère des messages colorés lisibles
5. Détecte correctement les fichiers code vs autres
6. Peut être désactivé via `set_enabled(false)`
7. Reset fonctionne correctement
8. Tous les tests passent
