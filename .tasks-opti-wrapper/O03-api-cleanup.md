# O03 - API Surface Cleanup

> **Priorité**: Moyenne
> **Effort estimé**: 1-2 heures
> **Dépendances**: O00 (Dead Code Cleanup)
> **Impact**: Code plus maintenable, API plus claire

---

## Objectif

Réduire la surface d'API publique aux seuls éléments nécessaires et documenter l'API restante.

---

## État Actuel des Exports

### stream/mod.rs

```rust
pub mod analyzer;
pub mod buffer;
pub mod patterns;

pub use analyzer::StreamAnalyzer;
pub use buffer::OutputBuffer;      // ⚠️ Jamais utilisé hors du module
pub use patterns::ContentType;
pub use patterns::PATTERNS;        // ⚠️ Usage interne seulement
```

### injector/mod.rs

```rust
pub mod templates;
pub mod triggers;

pub use templates::Suggestion;      // ⚠️ Jamais utilisé hors du module
pub use templates::SuggestionType;  // ⚠️ Jamais utilisé hors du module
pub use triggers::ContextInjector;
```

### pty/mod.rs

```rust
mod manager;

pub use manager::enter_raw_mode;
pub use manager::PtyError;          // ⚠️ Converti en napi::Error, pas exposé
pub use manager::PtyManager;
pub use manager::PtySize;
pub use manager::RawModeGuard;
```

### tokens/mod.rs

```rust
mod estimator;

pub use estimator::TokenEstimator;
```

---

## Analyse des Usages

### Utilisé depuis lib.rs

| Type | Usage dans lib.rs | Doit rester `pub` |
|------|-------------------|-------------------|
| `StreamAnalyzer` | `analyzer.analyze()` | `pub(crate)` suffit |
| `ContextInjector` | `injector.generate_suggestion()` | `pub(crate)` suffit |
| `PtyManager` | `pty.read_async()`, etc. | `pub(crate)` suffit |
| `PtySize` | Constructeur session | `pub(crate)` suffit |
| `TokenEstimator` | `utils::estimate_tokens()` | `pub(crate)` suffit |
| `ContentType` | Pour suggestions | `pub(crate)` suffit |
| `PATTERNS` | `utils::strip_ansi()` | `pub(crate)` suffit |
| `enter_raw_mode` | Exposé via `#[napi]` | `pub` nécessaire |
| `RawModeGuard` | Type interne | `pub(crate)` suffit |

### Réellement exposé à Node.js (via #[napi])

| Élément | Fichier | Exposé |
|---------|---------|--------|
| `CtxOptSession` | lib.rs | Oui |
| `ReadResult` | lib.rs | Oui |
| `SessionStats` | lib.rs | Oui |
| `utils::estimate_tokens` | lib.rs | Oui |
| `utils::is_code_file` | lib.rs | Oui |
| `utils::strip_ansi` | lib.rs | Oui |
| `enter_raw_mode` | lib.rs | Oui |
| `exit_raw_mode` | lib.rs | Oui |
| `is_raw_mode` | lib.rs | Oui |
| `version` | lib.rs | Oui |
| `ping` | lib.rs | Oui |

---

## Changements Proposés

### 1. stream/mod.rs

```rust
// Avant
pub mod analyzer;
pub mod buffer;
pub mod patterns;

pub use analyzer::StreamAnalyzer;
pub use buffer::OutputBuffer;
pub use patterns::ContentType;
pub use patterns::PATTERNS;

// Après
pub(crate) mod analyzer;
pub(crate) mod buffer;
pub(crate) mod patterns;

pub(crate) use analyzer::StreamAnalyzer;
// OutputBuffer: supprimé (voir O00)
pub(crate) use patterns::ContentType;
pub(crate) use patterns::PATTERNS;
```

### 2. injector/mod.rs

```rust
// Avant
pub mod templates;
pub mod triggers;

pub use templates::Suggestion;
pub use templates::SuggestionType;
pub use triggers::ContextInjector;

// Après
pub(crate) mod templates;
pub(crate) mod triggers;

// Suggestion/SuggestionType: supprimés (voir O00)
pub(crate) use triggers::ContextInjector;
```

### 3. pty/mod.rs

```rust
// Avant
mod manager;

pub use manager::enter_raw_mode;
pub use manager::PtyError;
pub use manager::PtyManager;
pub use manager::PtySize;
pub use manager::RawModeGuard;

// Après
mod manager;

// Seul enter_raw_mode doit rester pub (utilisé dans lib.rs #[napi])
pub use manager::enter_raw_mode;
pub(crate) use manager::PtyError;
pub(crate) use manager::PtyManager;
pub(crate) use manager::PtySize;
pub(crate) use manager::RawModeGuard;
```

### 4. tokens/mod.rs

```rust
// Avant
mod estimator;
pub use estimator::TokenEstimator;

// Après
mod estimator;
pub(crate) use estimator::TokenEstimator;
```

---

## Documentation API Publique

Ajouter `#![warn(missing_docs)]` et documenter:

### lib.rs - Types NAPI

```rust
/// Result of a PTY read operation.
/// Contains both raw output (with ANSI codes) and cleaned output for analysis.
#[napi(object)]
#[derive(Clone)]
pub struct ReadResult {
    /// Raw PTY output with ANSI escape codes (for display)
    pub output: String,

    /// Output with ANSI codes stripped (for analysis)
    pub clean_output: String,

    /// Generated optimization suggestions (if enabled)
    pub suggestions: Vec<String>,

    /// Estimated token count for this output
    pub token_estimate: u32,

    /// Detected content types (e.g., "BuildError", "LargeOutput")
    pub detected_types: Vec<String>,

    /// Total accumulated buffer size
    pub total_size: u32,
}
```

### lib.rs - Fonctions NAPI

```rust
/// Returns the native module version.
#[napi]
pub fn version() -> String { /* ... */ }

/// Simple ping function for connectivity testing.
#[napi]
pub fn ping() -> String { /* ... */ }

/// Enters raw mode on stdin (Unix only).
///
/// Disables echo and line buffering for proper PTY passthrough.
/// Returns `true` if successful, `false` if already in raw mode or failed.
#[napi]
pub fn enter_raw_mode() -> bool { /* ... */ }
```

---

## Checklist d'Exécution

- [ ] Changer `pub` → `pub(crate)` dans `stream/mod.rs`
- [ ] Changer `pub` → `pub(crate)` dans `injector/mod.rs`
- [ ] Changer `pub` → `pub(crate)` dans `pty/mod.rs` (sauf `enter_raw_mode`)
- [ ] Changer `pub` → `pub(crate)` dans `tokens/mod.rs`
- [ ] Ajouter `#![warn(missing_docs)]` dans `lib.rs`
- [ ] Documenter `ReadResult` avec `///`
- [ ] Documenter `SessionStats` avec `///`
- [ ] Documenter `CtxOptSession` et ses méthodes
- [ ] Documenter fonctions utilitaires
- [ ] Vérifier que `cargo doc` génère sans warnings
- [ ] Vérifier que le build NAPI fonctionne toujours

---

## Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Casser le build | Moyen | Tester après chaque changement de visibilité |
| Types internes exposés accidentellement | Faible | `pub(crate)` empêche l'exposition externe |

---

## Définition de Done

- [ ] Aucun type interne n'est `pub` (sauf nécessité NAPI)
- [ ] `#![warn(missing_docs)]` activé sans warnings
- [ ] `cargo doc` génère une documentation complète
- [ ] Build NAPI fonctionne (`./build.sh build --platform`)
- [ ] Tests passent
