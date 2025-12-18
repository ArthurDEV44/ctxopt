# P04 - NAPI Bindings

## Objectif

Exposer le module Rust vers Node.js via napi-rs pour permettre l'utilisation du PTY wrapper depuis TypeScript/JavaScript.

## Contexte

### napi-rs
- Framework pour créer des addons Node.js natifs en Rust
- Utilise Node-API (N-API) pour la compatibilité cross-version
- Génère automatiquement les fichiers `.d.ts` pour TypeScript
- Support async/await natif

### Ressources
- [napi-rs docs](https://napi.rs/docs/introduction/getting-started)
- [napi-rs async](https://napi.rs/docs/concepts/async-fn)
- [napi-rs structs](https://napi.rs/docs/concepts/class)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Node.js Layer                             │
│  const session = new CtxOptSession(24, 80);                      │
│  const result = await session.read();                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NAPI Bindings (lib.rs)                       │
│  #[napi]                                                         │
│  pub struct CtxOptSession { ... }                                │
│                                                                  │
│  #[napi]                                                         │
│  impl CtxOptSession {                                            │
│      pub fn new() -> Self                                        │
│      pub async fn read() -> ReadResult                           │
│      pub async fn write(data: String)                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Rust Core Modules                           │
│  PtyManager + StreamAnalyzer + ContextInjector                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Rust Complet

### src/lib.rs

```rust
#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::Arc;
use tokio::sync::Mutex;

mod config;
mod injector;
mod pty;
mod stream;
mod tokens;

use config::Config;
use injector::ContextInjector;
use pty::{PtyManager, PtySize};
use stream::StreamAnalyzer;
use tokens::TokenEstimator;

/// Version du module natif
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Résultat d'une lecture du PTY
#[napi(object)]
#[derive(Clone)]
pub struct ReadResult {
    /// Output brut du PTY
    pub output: String,

    /// Suggestions générées (si applicable)
    pub suggestions: Vec<String>,

    /// Estimation de tokens pour cet output
    pub token_estimate: u32,

    /// Types de contenu détectés
    pub detected_types: Vec<String>,

    /// Taille totale accumulée
    pub total_size: u32,
}

/// Statistiques de session
#[napi(object)]
#[derive(Clone)]
pub struct SessionStats {
    /// Tokens totaux estimés
    pub total_tokens: u32,

    /// Nombre total de suggestions affichées
    pub total_suggestions: u32,

    /// Nombre d'erreurs de build détectées
    pub total_build_errors: u32,

    /// Temps écoulé en millisecondes
    pub elapsed_ms: u32,
}

/// Session PTY principale exposée à Node.js
#[napi]
pub struct CtxOptSession {
    /// Gestionnaire PTY
    pty: Arc<Mutex<PtyManager>>,

    /// Analyseur de flux
    analyzer: Arc<Mutex<StreamAnalyzer>>,

    /// Injecteur de contexte
    injector: Arc<Mutex<ContextInjector>>,

    /// Configuration
    config: Config,

    /// Timestamp de démarrage
    started_at: std::time::Instant,
}

#[napi]
impl CtxOptSession {
    /// Crée une nouvelle session PTY pour Claude Code
    ///
    /// # Arguments
    /// * `rows` - Nombre de lignes du terminal (défaut: 24)
    /// * `cols` - Nombre de colonnes du terminal (défaut: 80)
    /// * `command` - Commande à exécuter (défaut: "claude")
    #[napi(constructor)]
    pub fn new(
        rows: Option<u32>,
        cols: Option<u32>,
        command: Option<String>,
    ) -> Result<Self> {
        let size = PtySize {
            rows: rows.unwrap_or(24) as u16,
            cols: cols.unwrap_or(80) as u16,
        };

        let cmd = command.unwrap_or_else(|| "claude".to_string());

        let pty = PtyManager::new(&cmd, &[], size)
            .map_err(|e| Error::from_reason(format!("Failed to create PTY: {}", e)))?;

        Ok(Self {
            pty: Arc::new(Mutex::new(pty)),
            analyzer: Arc::new(Mutex::new(StreamAnalyzer::new())),
            injector: Arc::new(Mutex::new(ContextInjector::new())),
            config: Config::default(),
            started_at: std::time::Instant::now(),
        })
    }

    /// Crée une session avec configuration personnalisée
    #[napi(factory)]
    pub fn with_config(
        rows: Option<u32>,
        cols: Option<u32>,
        command: Option<String>,
        injection_interval_ms: Option<u32>,
        suggestions_enabled: Option<bool>,
    ) -> Result<Self> {
        let mut session = Self::new(rows, cols, command)?;

        if let Some(interval) = injection_interval_ms {
            session.config.injection_interval_ms = interval as u64;
        }

        if let Some(enabled) = suggestions_enabled {
            session.config.suggestions_enabled = enabled;
        }

        Ok(session)
    }

    /// Lit les données disponibles du PTY
    ///
    /// Retourne l'output, les suggestions générées et les statistiques.
    #[napi]
    pub async fn read(&self) -> Result<ReadResult> {
        let pty = self.pty.lock().await;
        let output_bytes = pty
            .read()
            .await
            .map_err(|e| Error::from_reason(format!("Read error: {}", e)))?;

        // Conversion en string
        let output = String::from_utf8_lossy(&output_bytes).to_string();

        if output.is_empty() {
            return Ok(ReadResult {
                output: String::new(),
                suggestions: Vec::new(),
                token_estimate: 0,
                detected_types: vec!["empty".to_string()],
                total_size: 0,
            });
        }

        // Analyse
        let mut analyzer = self.analyzer.lock().await;
        let analysis = analyzer.analyze(&output);

        // Génération de suggestions
        let mut suggestions = Vec::new();
        let mut injector = self.injector.lock().await;

        if self.config.suggestions_enabled {
            for content_type in &analysis.content_types {
                if let Some(suggestion) = injector.generate_suggestion(content_type) {
                    suggestions.push(suggestion.format_for_display());
                }
            }
        }

        // Types détectés en string
        let detected_types: Vec<String> = analysis
            .content_types
            .iter()
            .map(|ct| format!("{:?}", ct))
            .collect();

        Ok(ReadResult {
            output: analysis.clean_text,
            suggestions,
            token_estimate: analysis.token_estimate as u32,
            detected_types,
            total_size: analysis.total_size as u32,
        })
    }

    /// Écrit des données dans le PTY (stdin de Claude)
    #[napi]
    pub async fn write(&self, data: String) -> Result<()> {
        let pty = self.pty.lock().await;
        pty.write_str(&data)
            .await
            .map_err(|e| Error::from_reason(format!("Write error: {}", e)))
    }

    /// Écrit des bytes bruts dans le PTY
    #[napi]
    pub async fn write_bytes(&self, data: Buffer) -> Result<()> {
        let pty = self.pty.lock().await;
        pty.write(&data)
            .await
            .map_err(|e| Error::from_reason(format!("Write error: {}", e)))
    }

    /// Vérifie si le process est toujours en cours d'exécution
    #[napi]
    pub async fn is_running(&self) -> bool {
        let pty = self.pty.lock().await;
        pty.is_running().await
    }

    /// Attend la fin du process et retourne le code de sortie
    #[napi]
    pub async fn wait(&self) -> Result<u32> {
        let pty = self.pty.lock().await;
        pty.wait()
            .await
            .map_err(|e| Error::from_reason(format!("Wait error: {}", e)))
    }

    /// Redimensionne le PTY
    #[napi]
    pub async fn resize(&self, rows: u32, cols: u32) -> Result<()> {
        let pty = self.pty.lock().await;
        pty.resize(PtySize {
            rows: rows as u16,
            cols: cols as u16,
        })
        .await
        .map_err(|e| Error::from_reason(format!("Resize error: {}", e)))
    }

    /// Termine le process
    #[napi]
    pub async fn kill(&self) -> Result<()> {
        let pty = self.pty.lock().await;
        pty.kill()
            .await
            .map_err(|e| Error::from_reason(format!("Kill error: {}", e)))
    }

    /// Retourne les statistiques de session
    #[napi]
    pub async fn stats(&self) -> SessionStats {
        let analyzer = self.analyzer.lock().await;
        let injector = self.injector.lock().await;

        SessionStats {
            total_tokens: analyzer.total_tokens() as u32,
            total_suggestions: injector.total_suggestions() as u32,
            total_build_errors: analyzer.total_errors() as u32,
            elapsed_ms: self.started_at.elapsed().as_millis() as u32,
        }
    }

    /// Active/désactive les suggestions
    #[napi]
    pub async fn set_suggestions_enabled(&self, enabled: bool) {
        let mut injector = self.injector.lock().await;
        injector.set_enabled(enabled);
    }

    /// Reset les compteurs de session
    #[napi]
    pub async fn reset_stats(&self) {
        let mut analyzer = self.analyzer.lock().await;
        let mut injector = self.injector.lock().await;
        analyzer.reset();
        injector.reset();
    }
}

/// Utilitaires exposés à Node.js
#[napi]
pub mod utils {
    use super::*;

    /// Estime le nombre de tokens pour un texte
    #[napi]
    pub fn estimate_tokens(text: String) -> u32 {
        TokenEstimator::new().estimate(&text) as u32
    }

    /// Vérifie si un fichier est un fichier code
    #[napi]
    pub fn is_code_file(path: String) -> bool {
        let code_extensions = [
            ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go",
            ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".rb",
        ];
        code_extensions.iter().any(|ext| path.ends_with(ext))
    }

    /// Retire les codes ANSI d'un texte
    #[napi]
    pub fn strip_ansi(text: String) -> String {
        use once_cell::sync::Lazy;
        use regex::Regex;

        static ANSI: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07").unwrap()
        });

        ANSI.replace_all(&text, "").to_string()
    }
}
```

---

## Types TypeScript Générés

napi-rs génère automatiquement `index.d.ts`:

```typescript
// Auto-generated by napi-rs

export function version(): string;

export interface ReadResult {
  output: string;
  suggestions: string[];
  tokenEstimate: number;
  detectedTypes: string[];
  totalSize: number;
}

export interface SessionStats {
  totalTokens: number;
  totalSuggestions: number;
  totalBuildErrors: number;
  elapsedMs: number;
}

export class CtxOptSession {
  constructor(rows?: number, cols?: number, command?: string);

  static withConfig(
    rows?: number,
    cols?: number,
    command?: string,
    injectionIntervalMs?: number,
    suggestionsEnabled?: boolean
  ): CtxOptSession;

  read(): Promise<ReadResult>;
  write(data: string): Promise<void>;
  writeBytes(data: Buffer): Promise<void>;
  isRunning(): Promise<boolean>;
  wait(): Promise<number>;
  resize(rows: number, cols: number): Promise<void>;
  kill(): Promise<void>;
  stats(): Promise<SessionStats>;
  setSuggestionsEnabled(enabled: boolean): Promise<void>;
  resetStats(): Promise<void>;
}

export namespace utils {
  export function estimateTokens(text: string): number;
  export function isCodeFile(path: string): boolean;
  export function stripAnsi(text: string): string;
}
```

---

## Tâches

- [ ] Compléter `src/lib.rs` avec tous les exports
- [ ] Créer `ReadResult` struct avec `#[napi(object)]`
- [ ] Créer `SessionStats` struct avec `#[napi(object)]`
- [ ] Implémenter `CtxOptSession` class avec `#[napi]`
- [ ] Implémenter `new()` constructor
- [ ] Implémenter `with_config()` factory
- [ ] Implémenter `read()` async
- [ ] Implémenter `write()` et `write_bytes()` async
- [ ] Implémenter `is_running()`, `wait()`, `kill()` async
- [ ] Implémenter `resize()` async
- [ ] Implémenter `stats()` async
- [ ] Implémenter `set_suggestions_enabled()` async
- [ ] Créer module `utils` avec fonctions utilitaires
- [ ] Vérifier génération `index.d.ts`
- [ ] Tester import depuis Node.js

---

## Fichiers à Créer/Modifier

| Fichier | Description |
|---------|-------------|
| `src/lib.rs` | Exports napi complets |
| `index.d.ts` | Auto-généré par napi-rs |
| `index.js` | Auto-généré par napi-rs |

---

## Dépendances

**Prérequis**: P00, P01, P02, P03

**Bloque**: P05 (npm distribution), P06 (CLI wrapper)

---

## Critères de Succès

1. `bun run build` génère `ctxopt-core.[platform].node`
2. `index.d.ts` généré avec tous les types
3. `const { CtxOptSession } = require('@ctxopt/core')` fonctionne
4. `new CtxOptSession()` crée une session
5. `session.read()` retourne un `ReadResult`
6. `session.write()` envoie des données
7. `session.stats()` retourne les statistiques
8. `utils.estimateTokens()` fonctionne
9. Pas de memory leaks (vérifier avec `--expose-gc`)
