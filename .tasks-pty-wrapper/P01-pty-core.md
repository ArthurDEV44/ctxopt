# P01 - PTY Core

## Objectif

Implémenter le `PtyManager` qui encapsule portable-pty pour spawner Claude Code dans un pseudo-terminal contrôlé, avec lecture/écriture asynchrone.

## Contexte

### Qu'est-ce qu'un PTY ?
Un PTY (Pseudo-Terminal) est un mécanisme qui émule un terminal physique. Il crée une paire master/slave:
- **Master**: Côté contrôleur (notre wrapper)
- **Slave**: Côté process (Claude Code)

### portable-pty
- Crate Rust cross-platform (Unix PTY + Windows ConPTY)
- Utilisé par WezTerm (terminal populaire)
- API: `openpty()`, `spawn_command()`, `take_writer()`, `try_clone_reader()`

### Ressources
- [portable-pty docs](https://docs.rs/portable-pty/latest/portable_pty/)
- [portable-pty examples](https://github.com/wezterm/wezterm/tree/main/pty)
- [Linux TTY/PTY Async Rust](https://developerlife.com/2024/08/20/tty-linux-async-rust/)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PtyManager                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │  Master PTY    │◄─────►│   Slave PTY    │                    │
│  │  (notre code)  │       │  (claude CLI)  │                    │
│  └───────┬────────┘       └───────┬────────┘                    │
│          │                        │                              │
│  ┌───────▼────────┐       ┌───────▼────────┐                    │
│  │   PtyReader    │       │   Child Proc   │                    │
│  │  (async read)  │       │    (claude)    │                    │
│  └────────────────┘       └────────────────┘                    │
│          │                                                       │
│  ┌───────▼────────┐                                             │
│  │   PtyWriter    │                                             │
│  │ (sync write)   │                                             │
│  └────────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Rust Complet

### src/pty/mod.rs

```rust
//! PTY management avec portable-pty
//!
//! Ce module gère la création et manipulation des pseudo-terminaux
//! cross-platform (Unix PTY, Windows ConPTY).

pub mod manager;

pub use manager::{PtyManager, PtyError, PtySize};
```

### src/pty/manager.rs

```rust
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize as PortablePtySize, PtySystem, Child};
use std::io::{Read, Write};
use std::sync::Arc;
use tokio::sync::Mutex;
use thiserror::Error;

/// Erreurs du module PTY
#[derive(Error, Debug)]
pub enum PtyError {
    #[error("Failed to create PTY: {0}")]
    CreateError(String),

    #[error("Failed to spawn command: {0}")]
    SpawnError(String),

    #[error("Failed to read from PTY: {0}")]
    ReadError(String),

    #[error("Failed to write to PTY: {0}")]
    WriteError(String),

    #[error("PTY process has exited")]
    ProcessExited,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Taille du PTY en lignes/colonnes
#[derive(Debug, Clone, Copy)]
pub struct PtySize {
    pub rows: u16,
    pub cols: u16,
}

impl Default for PtySize {
    fn default() -> Self {
        Self { rows: 24, cols: 80 }
    }
}

impl From<PtySize> for PortablePtySize {
    fn from(size: PtySize) -> Self {
        PortablePtySize {
            rows: size.rows,
            cols: size.cols,
            pixel_width: 0,
            pixel_height: 0,
        }
    }
}

/// Gestionnaire de PTY pour spawner et contrôler Claude Code
pub struct PtyManager {
    /// Handle vers le master PTY
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,

    /// Writer pour envoyer des données au PTY
    writer: Arc<Mutex<Box<dyn Write + Send>>>,

    /// Reader pour lire les données du PTY
    reader: Arc<Mutex<Box<dyn Read + Send>>>,

    /// Child process (Claude Code)
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,

    /// Taille du PTY
    size: PtySize,
}

impl PtyManager {
    /// Crée un nouveau PTY et spawne la commande spécifiée
    ///
    /// # Arguments
    /// * `command` - Commande à exécuter (ex: "claude")
    /// * `args` - Arguments de la commande
    /// * `size` - Taille du terminal (rows, cols)
    ///
    /// # Example
    /// ```rust
    /// let pty = PtyManager::new("claude", &[], PtySize::default())?;
    /// ```
    pub fn new(command: &str, args: &[&str], size: PtySize) -> Result<Self, PtyError> {
        // Obtenir le système PTY natif (Unix ou Windows ConPTY)
        let pty_system = native_pty_system();

        // Créer la paire master/slave
        let pair = pty_system
            .openpty(size.into())
            .map_err(|e| PtyError::CreateError(e.to_string()))?;

        // Construire la commande
        let mut cmd = CommandBuilder::new(command);
        for arg in args {
            cmd.arg(*arg);
        }

        // Hériter les variables d'environnement
        for (key, value) in std::env::vars() {
            cmd.env(key, value);
        }

        // Définir le répertoire de travail courant
        if let Ok(cwd) = std::env::current_dir() {
            cmd.cwd(cwd);
        }

        // Spawner le process dans le slave PTY
        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| PtyError::SpawnError(e.to_string()))?;

        // Obtenir writer et reader du master
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| PtyError::CreateError(e.to_string()))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| PtyError::CreateError(e.to_string()))?;

        Ok(Self {
            master: Arc::new(Mutex::new(pair.master)),
            writer: Arc::new(Mutex::new(writer)),
            reader: Arc::new(Mutex::new(reader)),
            child: Arc::new(Mutex::new(child)),
            size,
        })
    }

    /// Lit les données disponibles du PTY (non-bloquant si vide)
    ///
    /// Retourne les bytes lus ou un vecteur vide si rien disponible.
    pub async fn read(&self) -> Result<Vec<u8>, PtyError> {
        let mut reader = self.reader.lock().await;
        let mut buffer = vec![0u8; 8192];

        // Note: Cette lecture est bloquante. Pour du vrai async,
        // il faudrait utiliser tokio::task::spawn_blocking ou
        // une abstraction comme tokio-pty-process.
        match reader.read(&mut buffer) {
            Ok(0) => Ok(Vec::new()), // EOF
            Ok(n) => {
                buffer.truncate(n);
                Ok(buffer)
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                Ok(Vec::new())
            }
            Err(e) => Err(PtyError::ReadError(e.to_string())),
        }
    }

    /// Écrit des données dans le PTY (stdin du child)
    pub async fn write(&self, data: &[u8]) -> Result<(), PtyError> {
        let mut writer = self.writer.lock().await;
        writer
            .write_all(data)
            .map_err(|e| PtyError::WriteError(e.to_string()))?;
        writer
            .flush()
            .map_err(|e| PtyError::WriteError(e.to_string()))?;
        Ok(())
    }

    /// Écrit une chaîne de caractères dans le PTY
    pub async fn write_str(&self, data: &str) -> Result<(), PtyError> {
        self.write(data.as_bytes()).await
    }

    /// Vérifie si le child process est toujours en cours d'exécution
    pub async fn is_running(&self) -> bool {
        let mut child = self.child.lock().await;
        // try_wait retourne None si le process tourne encore
        match child.try_wait() {
            Ok(None) => true,
            _ => false,
        }
    }

    /// Attend la fin du child process et retourne le code de sortie
    pub async fn wait(&self) -> Result<u32, PtyError> {
        let mut child = self.child.lock().await;
        let status = child
            .wait()
            .map_err(|e| PtyError::SpawnError(e.to_string()))?;
        Ok(status.exit_code())
    }

    /// Redimensionne le PTY
    pub async fn resize(&self, new_size: PtySize) -> Result<(), PtyError> {
        let master = self.master.lock().await;
        master
            .resize(new_size.into())
            .map_err(|e| PtyError::CreateError(e.to_string()))?;
        Ok(())
    }

    /// Retourne la taille actuelle du PTY
    pub fn size(&self) -> PtySize {
        self.size
    }

    /// Envoie un signal au child process (Unix only)
    #[cfg(unix)]
    pub async fn kill(&self) -> Result<(), PtyError> {
        let child = self.child.lock().await;
        child
            .kill()
            .map_err(|e| PtyError::SpawnError(e.to_string()))?;
        Ok(())
    }

    /// Termine le child process (Windows)
    #[cfg(windows)]
    pub async fn kill(&self) -> Result<(), PtyError> {
        let child = self.child.lock().await;
        child
            .kill()
            .map_err(|e| PtyError::SpawnError(e.to_string()))?;
        Ok(())
    }
}

// Tests unitaires
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pty_spawn_echo() {
        // Spawner un simple echo
        let pty = PtyManager::new("echo", &["hello"], PtySize::default())
            .expect("Failed to create PTY");

        // Attendre un peu pour que le process démarre
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Lire la sortie
        let output = pty.read().await.expect("Failed to read");
        let output_str = String::from_utf8_lossy(&output);

        assert!(output_str.contains("hello"));
    }

    #[tokio::test]
    async fn test_pty_write_read() {
        // Spawner cat qui echo l'input
        let pty = PtyManager::new("cat", &[], PtySize::default())
            .expect("Failed to create PTY");

        // Écrire quelque chose
        pty.write_str("test input\n").await.expect("Failed to write");

        // Attendre et lire
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        let output = pty.read().await.expect("Failed to read");
        let output_str = String::from_utf8_lossy(&output);

        assert!(output_str.contains("test input"));

        // Terminer cat
        pty.kill().await.ok();
    }

    #[tokio::test]
    async fn test_pty_is_running() {
        let pty = PtyManager::new("sleep", &["1"], PtySize::default())
            .expect("Failed to create PTY");

        assert!(pty.is_running().await);

        // Attendre que sleep finisse
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        assert!(!pty.is_running().await);
    }
}
```

---

## Async Read avec Tokio (Alternative)

Pour une lecture vraiment asynchrone sans bloquer le runtime:

```rust
use tokio::task;

impl PtyManager {
    /// Lecture asynchrone non-bloquante
    pub async fn read_async(&self) -> Result<Vec<u8>, PtyError> {
        let reader = Arc::clone(&self.reader);

        // Exécuter la lecture bloquante dans un thread dédié
        let result = task::spawn_blocking(move || {
            let mut reader = reader.blocking_lock();
            let mut buffer = vec![0u8; 8192];

            match reader.read(&mut buffer) {
                Ok(0) => Ok(Vec::new()),
                Ok(n) => {
                    buffer.truncate(n);
                    Ok(buffer)
                }
                Err(e) => Err(PtyError::ReadError(e.to_string())),
            }
        })
        .await
        .map_err(|e| PtyError::ReadError(e.to_string()))??;

        Ok(result)
    }
}
```

---

## Spawner Claude Code

```rust
impl PtyManager {
    /// Crée un PTY pour Claude Code avec les bonnes options
    pub fn spawn_claude(size: PtySize) -> Result<Self, PtyError> {
        Self::new("claude", &[], size)
    }

    /// Crée un PTY pour Claude Code avec un profil spécifique
    pub fn spawn_claude_with_profile(profile: &str, size: PtySize) -> Result<Self, PtyError> {
        Self::new("claude", &["--profile", profile], size)
    }
}
```

---

## Tâches

- [x] Créer `src/pty/mod.rs` avec les exports
- [x] Créer `src/pty/manager.rs` avec `PtyManager`
- [x] Implémenter `new()` avec portable-pty
- [x] Implémenter `read()` (sync pour l'instant)
- [x] Implémenter `write()` et `write_str()`
- [x] Implémenter `is_running()` et `wait()`
- [x] Implémenter `resize()`
- [x] Implémenter `kill()` (platform-specific)
- [x] Ajouter `read_async()` avec spawn_blocking
- [x] Écrire tests unitaires
- [ ] Tester manuellement avec `claude` (si installé)

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/pty/mod.rs` | Module exports |
| `src/pty/manager.rs` | PtyManager complet |

---

## Dépendances

**Prérequis**: P00 (project setup)

**Bloque**: P02 (stream analyzer), P04 (napi bindings)

---

## Critères de Succès

1. `cargo build` compile sans erreur
2. `cargo test` passe tous les tests PTY
3. Peut spawner un process simple (`echo`, `cat`)
4. Peut lire stdout du process
5. Peut écrire dans stdin du process
6. Détecte correctement si le process est terminé
7. Fonctionne sur Linux (Unix PTY)
8. Fonctionne sur macOS (Unix PTY)
9. Fonctionne sur Windows (ConPTY) - à tester en CI
