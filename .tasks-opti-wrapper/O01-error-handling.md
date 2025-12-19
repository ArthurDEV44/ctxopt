# O01 - Error Handling Modernization

> **Priorité**: Moyenne
> **Effort estimé**: 2-3 heures
> **Dépendances**: O00 (Dead Code Cleanup)
> **Impact**: Meilleure debuggabilité, messages d'erreur plus clairs

---

## Objectif

Moderniser la gestion d'erreurs en utilisant les best practices Rust 2025:
- Contexte riche dans les erreurs
- Chaîne de causalité préservée
- Messages exploitables

---

## État Actuel

### PtyError (pty/manager.rs)

```rust
#[derive(Debug, thiserror::Error)]
pub enum PtyError {
    #[error("Fork failed: {0}")]
    ForkFailed(nix::Error),

    #[error("PTY creation failed: {0}")]
    PtyCreationFailed(nix::Error),

    #[error("Command execution failed: {0}")]
    ExecFailed(std::io::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Read error: {0}")]
    ReadError(String),  // ⚠️ Jamais construit

    #[error("Process exited with code: {0}")]
    ProcessExited(i32),  // ⚠️ Jamais construit
}
```

### Problèmes Identifiés

1. **Variants morts** - `ReadError`, `ProcessExited` jamais utilisés
2. **Pas de contexte** - Impossible de savoir quelle opération a échoué
3. **Mapping incohérent** - Certaines erreurs perdent leur contexte original
4. **Pas de source chain** - `#[source]` manquant sur certains variants

---

## Améliorations Proposées

### 1. Nouveau PtyError avec Contexte

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PtyError {
    #[error("Failed to fork process")]
    ForkFailed {
        #[source]
        source: nix::Error,
    },

    #[error("Failed to create PTY")]
    PtyCreationFailed {
        #[source]
        source: nix::Error,
    },

    #[error("Failed to execute command '{command}'")]
    ExecFailed {
        command: String,
        #[source]
        source: std::io::Error,
    },

    #[error("IO operation failed during {operation}")]
    IoError {
        operation: &'static str,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to resize PTY to {rows}x{cols}")]
    ResizeFailed {
        rows: u16,
        cols: u16,
        #[source]
        source: nix::Error,
    },

    #[error("Process terminated unexpectedly with code {code}")]
    ProcessTerminated {
        code: i32,
    },

    #[error("Failed to send signal {signal} to process")]
    SignalFailed {
        signal: &'static str,
        #[source]
        source: nix::Error,
    },
}
```

### 2. Helper Constructors

```rust
impl PtyError {
    pub fn io_read(source: std::io::Error) -> Self {
        Self::IoError {
            operation: "read",
            source,
        }
    }

    pub fn io_write(source: std::io::Error) -> Self {
        Self::IoError {
            operation: "write",
            source,
        }
    }
}
```

### 3. Utilisation avec Context

```rust
// Avant
pty.write(&data).map_err(PtyError::IoError)?;

// Après (avec anyhow::Context pour les fonctions haut niveau)
use anyhow::Context;

pty.write(&data)
    .map_err(PtyError::io_write)
    .context("Failed to write user input to PTY")?;
```

---

## Fichiers à Modifier

### pty/manager.rs

| Section | Changement |
|---------|------------|
| L24-40 | Refactorer `PtyError` avec contexte |
| L111-112 | Ajouter contexte à `new()` |
| L150-154 | Ajouter contexte à `read_async()` |
| L200-210 | Ajouter contexte à `write()` |
| L240-247 | Ajouter contexte à `resize()` |

### lib.rs

| Section | Changement |
|---------|------------|
| L112 | Améliorer message d'erreur `new()` |
| L154 | Améliorer message d'erreur `read()` |
| L209 | Améliorer message d'erreur `write()` |

---

## Migration Pattern

### Étape 1: Ajouter anyhow (optionnel)

```toml
# Cargo.toml
[dependencies]
anyhow = "1.0"
```

### Étape 2: Refactorer PtyError

```rust
// 1. Garder thiserror pour les types d'erreur
// 2. Utiliser anyhow::Context dans les fonctions publiques NAPI
// 3. Préserver la compatibilité avec napi::Error
```

### Étape 3: Mapping vers napi::Error

```rust
impl From<PtyError> for napi::Error {
    fn from(err: PtyError) -> Self {
        // Préserver la chaîne de causalité dans le message
        let mut message = err.to_string();
        let mut source = err.source();
        while let Some(cause) = source {
            message.push_str(&format!("\nCaused by: {}", cause));
            source = cause.source();
        }
        napi::Error::from_reason(message)
    }
}
```

---

## Checklist d'Exécution

- [ ] Refactorer `PtyError` avec contexte structuré
- [ ] Ajouter helper constructors pour cas communs
- [ ] Supprimer variants morts (`ReadError`, `ProcessExited`)
- [ ] Ajouter `#[source]` sur tous les variants avec erreur source
- [ ] Implémenter `From<PtyError> for napi::Error` avec chaîne
- [ ] Mettre à jour tous les call sites dans `manager.rs`
- [ ] Mettre à jour les mappings dans `lib.rs`
- [ ] Ajouter tests pour les messages d'erreur
- [ ] Documenter chaque variant avec `///`

---

## Tests à Ajouter

```rust
#[cfg(test)]
mod error_tests {
    use super::*;

    #[test]
    fn test_error_chain_preserved() {
        let io_err = std::io::Error::new(
            std::io::ErrorKind::Other,
            "underlying error"
        );
        let pty_err = PtyError::io_read(io_err);

        let msg = pty_err.to_string();
        assert!(msg.contains("read"));

        // Vérifier que la source est préservée
        assert!(pty_err.source().is_some());
    }

    #[test]
    fn test_napi_error_conversion() {
        let io_err = std::io::Error::new(
            std::io::ErrorKind::Other,
            "root cause"
        );
        let pty_err = PtyError::io_write(io_err);
        let napi_err: napi::Error = pty_err.into();

        let reason = napi_err.reason;
        assert!(reason.contains("write"));
        assert!(reason.contains("root cause"));
    }
}
```

---

## Ressources

- [thiserror Best Practices](https://docs.rs/thiserror/latest/thiserror/)
- [anyhow for Application Code](https://docs.rs/anyhow/latest/anyhow/)
- [Rust Error Handling 2025](https://markaicode.com/rust-error-handling-2025-guide/)
- [Error Handling in Async Rust](https://rust-lang.github.io/async-book/07_workarounds/02_err_in_async_blocks.html)

---

## Définition de Done

- [ ] Tous les variants de `PtyError` ont un contexte utile
- [ ] Les messages d'erreur sont exploitables (qui, quoi, où)
- [ ] La chaîne de causalité est préservée jusqu'à NAPI
- [ ] Tests couvrent les cas d'erreur principaux
- [ ] Documentation `///` sur chaque variant
