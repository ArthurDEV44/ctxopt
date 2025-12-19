# O02 - Lock Optimization

> **Priorité**: Haute
> **Effort estimé**: 3-4 heures
> **Dépendances**: O00 (Dead Code Cleanup)
> **Impact**: Réduction de la contention, meilleure concurrence

---

## Objectif

Optimiser l'utilisation des locks dans `CtxOptSession` pour réduire la contention et améliorer les performances en situation de charge.

---

## État Actuel (lib.rs:77-92)

```rust
pub struct CtxOptSession {
    /// Gestionnaire PTY
    pty: Arc<Mutex<PtyManager>>,

    /// Analyseur de flux
    analyzer: Arc<Mutex<StreamAnalyzer>>,

    /// Injecteur de contexte
    injector: Arc<Mutex<ContextInjector>>,

    /// Configuration (pas de lock - immutable)
    config: Config,

    /// Timestamp de démarrage
    started_at: std::time::Instant,
}
```

### Pattern d'Accès (lib.rs:149-200)

```rust
pub async fn read(&self) -> Result<ReadResult> {
    // Lock 1: PTY (read + potential write)
    let pty = self.pty.lock().await;
    let output_bytes = pty.read_async().await?;

    // Lock 2: Analyzer (read + write)
    let mut analyzer = self.analyzer.lock().await;
    let analysis = analyzer.analyze(&raw_output);

    // Lock 3: Injector (read + write)
    let mut injector = self.injector.lock().await;
    for content_type in &analysis.content_types {
        if let Some(suggestion) = injector.generate_suggestion(content_type) {
            suggestions.push(suggestion);
        }
    }
    // ...
}
```

---

## Problèmes Identifiés

### 1. Locks Séquentiels

Les 3 locks sont acquis séquentiellement dans `read()`, ce qui:
- Bloque les autres opérations pendant toute la durée
- Crée un goulot d'étranglement
- Empêche la parallélisation

### 2. Mutex Surutilisé

| Resource | Pattern d'accès | Lock optimal |
|----------|-----------------|--------------|
| `PtyManager` | Write fréquent (read/write PTY) | `Mutex` (correct) |
| `StreamAnalyzer` | Write sur `analyze()`, read sur `stats()` | `RwLock` possible |
| `ContextInjector` | Write sur `generate_suggestion()`, read sur `stats()` | `RwLock` possible |

### 3. Lock Scope Trop Large

Les locks sont maintenus pendant toute l'opération, même quand ce n'est pas nécessaire:

```rust
// Actuel: lock maintenu pendant tout le traitement
let mut analyzer = self.analyzer.lock().await;
let analysis = analyzer.analyze(&raw_output);  // Lock nécessaire ici
// ... traitement suggestions ...  // Lock toujours tenu inutilement
```

---

## Optimisations Proposées

### 1. RwLock pour StreamAnalyzer

```rust
use tokio::sync::RwLock;

pub struct CtxOptSession {
    pty: Arc<Mutex<PtyManager>>,
    analyzer: Arc<RwLock<StreamAnalyzer>>,  // Changed
    injector: Arc<RwLock<ContextInjector>>, // Changed
    config: Config,
    started_at: std::time::Instant,
}
```

### 2. Réduire le Scope des Locks

```rust
pub async fn read(&self) -> Result<ReadResult> {
    // Scope 1: Seulement pour la lecture PTY
    let output_bytes = {
        let pty = self.pty.lock().await;
        pty.read_async().await?
    }; // Lock libéré ici

    if output_bytes.is_empty() {
        return Ok(ReadResult::empty());
    }

    let raw_output = String::from_utf8_lossy(&output_bytes).to_string();

    // Scope 2: Seulement pour l'analyse
    let analysis = {
        let mut analyzer = self.analyzer.write().await;
        analyzer.analyze(&raw_output)
    }; // Lock libéré ici

    // Scope 3: Seulement pour les suggestions
    let suggestions = if self.config.suggestions_enabled {
        let mut injector = self.injector.write().await;
        analysis.content_types.iter()
            .filter_map(|ct| injector.generate_suggestion(ct))
            .map(|s| s.format_for_display())
            .collect()
    } else {
        Vec::new()
    }; // Lock libéré ici

    Ok(ReadResult { /* ... */ })
}
```

### 3. Stats avec Read Lock

```rust
pub async fn stats(&self) -> SessionStats {
    // Read locks - peuvent être acquis en parallèle
    let analyzer = self.analyzer.read().await;
    let injector = self.injector.read().await;

    SessionStats {
        total_tokens: analyzer.total_tokens() as u32,
        total_suggestions: injector.total_suggestions() as u32,
        total_build_errors: analyzer.total_errors() as u32,
        elapsed_ms: self.started_at.elapsed().as_millis() as u32,
    }
}
```

### 4. Parallel Read/Write

Pour des opérations indépendantes, utiliser `tokio::join!`:

```rust
// Si analyzer et injector stats sont indépendantes
pub async fn detailed_stats(&self) -> DetailedStats {
    let (analyzer_stats, injector_stats) = tokio::join!(
        async {
            let analyzer = self.analyzer.read().await;
            (analyzer.total_tokens(), analyzer.total_errors())
        },
        async {
            let injector = self.injector.read().await;
            (injector.total_suggestions(), injector.prompt_reminders_used())
        }
    );
    // ...
}
```

---

## Considérations RwLock vs Mutex

### Quand utiliser RwLock

| Critère | RwLock préférable | Mutex préférable |
|---------|-------------------|------------------|
| Ratio read/write | Beaucoup de reads | Writes fréquents |
| Durée du lock | Longue | Courte |
| Contention | Haute | Basse |
| Overhead | Acceptable | Critique |

### Analyse pour notre cas

| Resource | Reads | Writes | Verdict |
|----------|-------|--------|---------|
| `StreamAnalyzer` | `stats()` | `analyze()`, `reset()` | RwLock (stats fréquents) |
| `ContextInjector` | `stats()`, `is_enabled()` | `generate_suggestion()`, `reset()` | RwLock |
| `PtyManager` | `is_running()` | `read_async()`, `write()` | Mutex (writes très fréquents) |

---

## Migration Step by Step

### Étape 1: Modifier les types

```rust
// lib.rs
use tokio::sync::{Mutex, RwLock};

pub struct CtxOptSession {
    pty: Arc<Mutex<PtyManager>>,
    analyzer: Arc<RwLock<StreamAnalyzer>>,
    injector: Arc<RwLock<ContextInjector>>,
    // ...
}
```

### Étape 2: Mettre à jour le constructeur

```rust
pub fn new(rows: Option<u32>, cols: Option<u32>, command: Option<String>) -> Result<Self> {
    // ...
    Ok(Self {
        pty: Arc::new(Mutex::new(pty)),
        analyzer: Arc::new(RwLock::new(StreamAnalyzer::new())),
        injector: Arc::new(RwLock::new(ContextInjector::new())),
        // ...
    })
}
```

### Étape 3: Mettre à jour les méthodes

```rust
// read() - utilise write() pour analyzer et injector
pub async fn read(&self) -> Result<ReadResult> {
    let mut analyzer = self.analyzer.write().await;
    let mut injector = self.injector.write().await;
    // ...
}

// stats() - utilise read() seulement
pub async fn stats(&self) -> SessionStats {
    let analyzer = self.analyzer.read().await;
    let injector = self.injector.read().await;
    // ...
}
```

### Étape 4: Optimiser les scopes

Réduire la durée des locks comme montré dans la section "Réduire le Scope des Locks".

---

## Benchmarks à Implémenter

Voir O06 pour les détails, mais voici les cas à mesurer:

```rust
// 1. Contention baseline avec Mutex
// 2. Contention avec RwLock
// 3. Impact du scope reduction
// 4. Throughput read/write concurrent
```

---

## Checklist d'Exécution

- [ ] Changer `Mutex` → `RwLock` pour `analyzer`
- [ ] Changer `Mutex` → `RwLock` pour `injector`
- [ ] Mettre à jour constructeur `new()` et `with_config()`
- [ ] Mettre à jour `read()` avec `.write().await`
- [ ] Mettre à jour `stats()` avec `.read().await`
- [ ] Mettre à jour `set_suggestions_enabled()` avec `.write().await`
- [ ] Mettre à jour `reset_stats()` avec `.write().await`
- [ ] Réduire les scopes de lock dans `read()`
- [ ] Ajouter tests de concurrence
- [ ] Mesurer impact performance (avant/après)

---

## Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Deadlock avec RwLock | Critique | Toujours acquérir dans le même ordre |
| Write starvation | Moyen | Tokio RwLock est fair par défaut |
| Overhead RwLock | Faible | Mesurer avec benchmarks |
| Régression fonctionnelle | Moyen | Tests exhaustifs |

---

## Ressources

- [Tokio RwLock Documentation](https://docs.rs/tokio/latest/tokio/sync/struct.RwLock.html)
- [When to use RwLock vs Mutex](https://stackoverflow.com/questions/50704279/when-or-why-should-i-use-a-mutex-over-an-rwlock)
- [Arc<Mutex<T>> Alternatives 2025](https://markaicode.com/rust-memory-management-2025/)
- [Avoiding Deadlocks in Async Rust](https://ryhl.io/blog/async-what-is-blocking/)

---

## Définition de Done

- [ ] RwLock utilisé pour `analyzer` et `injector`
- [ ] Scopes de lock minimisés
- [ ] Tests de concurrence passent
- [ ] Pas de deadlocks détectés
- [ ] Performance mesurée (pas de régression)
