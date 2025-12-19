# O00 - Dead Code Cleanup

> **Priorité**: Critique (bloquant pour les autres phases)
> **Effort estimé**: 1-2 heures
> **Impact**: Résoudre 17 warnings, supprimer ~200 lignes de code mort

---

## Objectif

Nettoyer tout le code mort identifié par `cargo check` et `cargo clippy` pour avoir une base propre avant les optimisations.

---

## Commande de Vérification

```bash
cd packages/ctxopt-core
cargo clippy --all-targets -- -D warnings
```

---

## Inventaire du Code Mort

### 1. pty/manager.rs - Méthodes non utilisées

| Ligne | Élément | Action |
|-------|---------|--------|
| 253-270 | `spawn_claude()` | Supprimer (doublon de `new()`) |
| 272-300 | `spawn_claude_with_profile()` | Supprimer (feature non implémentée) |
| 302-320 | `read()` sync | Supprimer (remplacé par `read_async()`) |
| 340-352 | `size()` getter | Supprimer (jamais utilisé) |

**Code à supprimer:**
```rust
// Ces 4 méthodes ne sont jamais appelées
pub fn spawn_claude() -> Result<Self, PtyError>
pub fn spawn_claude_with_profile(profile: &str) -> Result<Self, PtyError>
pub fn read(&self) -> Result<Vec<u8>, PtyError>
pub fn size(&self) -> PtySize
```

### 2. pty/manager.rs - Variants d'erreur morts

| Ligne | Élément | Action |
|-------|---------|--------|
| 30 | `PtyError::ReadError` | Supprimer ou implémenter |
| 36 | `PtyError::ProcessExited` | Supprimer ou implémenter |

**Décision recommandée:** Supprimer car `read_async()` utilise `IoError` directement.

### 3. pty/manager.rs - Champ inutilisé

| Ligne | Élément | Action |
|-------|---------|--------|
| 157 | `size: PtySize` dans `PtyManager` | Supprimer ou ajouter getter public |

**Code actuel:**
```rust
pub struct PtyManager {
    master_fd: RawFd,
    child_pid: Pid,
    size: PtySize,  // ⚠️ Jamais lu après initialisation
}
```

### 4. pty/manager.rs - Import inutilisé

| Ligne | Élément | Action |
|-------|---------|--------|
| 12 | `use tokio::task;` | Supprimer |

### 5. injector/templates.rs - Champs morts

| Ligne | Élément | Action |
|-------|---------|--------|
| 31 | `inject_command: Option<String>` | Supprimer |
| 34 | `priority: u8` | Supprimer |

**Code actuel:**
```rust
pub struct Suggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
    pub inject_command: Option<String>,  // ⚠️ Jamais utilisé
    pub priority: u8,                     // ⚠️ Jamais utilisé
}
```

### 6. injector/templates.rs - Constantes mortes

| Ligne | Élément | Action |
|-------|---------|--------|
| 103-105 | `BUILD_HINT` | Supprimer |
| 107-108 | `LARGE_HINT` | Supprimer |
| 110-111 | `FILE_HINT` | Supprimer |

### 7. injector/triggers.rs - Méthodes pour tests

| Ligne | Élément | Action |
|-------|---------|--------|
| 52-56 | `with_interval()` | Marquer `#[cfg(test)]` ou `#[allow(dead_code)]` |
| 64-66 | `is_enabled()` | Marquer `#[cfg(test)]` ou garder (utile) |
| 165-167 | `prompt_reminders_used()` | Marquer `#[cfg(test)]` |
| 178-184 | `time_until_next_injection()` | Marquer `#[cfg(test)]` |

**Recommandation:** Garder ces méthodes mais les marquer correctement car elles sont utilisées dans les tests.

### 8. stream/buffer.rs - Méthodes inutilisées

| Ligne | Élément | Action |
|-------|---------|--------|
| 38-45 | `content()` | Supprimer |
| 51-53 | `is_empty()` | Supprimer |
| 59-65 | `capacity()` | Supprimer |

### 9. stream/patterns.rs - Variants enum morts

| Ligne | Élément | Action |
|-------|---------|--------|
| 47 | `BuildTool::Webpack` | Implémenter ou supprimer |
| 48 | `BuildTool::Vite` | Implémenter ou supprimer |

**Décision:** Voir O05 pour feature audit. Pour O00, marquer `#[allow(dead_code)]` avec TODO.

### 10. Module exports inutiles

| Fichier | Ligne | Export | Action |
|---------|-------|--------|--------|
| `stream/mod.rs` | 13-15 | `OutputBuffer`, `StreamPatterns` | Supprimer ou `pub(crate)` |
| `injector/mod.rs` | 9 | `Suggestion`, `SuggestionType` | Supprimer |
| `pty/mod.rs` | 8 | `PtyError` | Supprimer |

---

## Checklist d'Exécution

- [ ] Supprimer les 4 méthodes mortes dans `pty/manager.rs`
- [ ] Supprimer variants `ReadError`, `ProcessExited` dans `PtyError`
- [ ] Supprimer le champ `size` de `PtyManager` (ou ajouter usage)
- [ ] Supprimer `use tokio::task;`
- [ ] Supprimer `inject_command` et `priority` de `Suggestion`
- [ ] Supprimer constantes `BUILD_HINT`, `LARGE_HINT`, `FILE_HINT`
- [ ] Marquer méthodes de test avec `#[cfg(test)]` ou `#[allow(dead_code)]`
- [ ] Supprimer méthodes de buffer inutilisées
- [ ] Marquer variants `Webpack`/`Vite` avec `#[allow(dead_code)]` + TODO
- [ ] Nettoyer re-exports dans `mod.rs`
- [ ] Exécuter `cargo clippy --all-targets -- -D warnings` (0 warnings)
- [ ] Exécuter `cargo test` (tous les tests passent)

---

## Script de Vérification Finale

```bash
#!/bin/bash
cd packages/ctxopt-core

echo "=== Checking for warnings ==="
cargo check 2>&1 | grep -E "^warning:" | wc -l

echo "=== Running clippy ==="
cargo clippy --all-targets -- -D warnings

echo "=== Running tests ==="
cargo test

echo "=== Line count before/after ==="
find src -name "*.rs" -exec cat {} \; | wc -l
```

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Casser l'API NAPI | Les éléments supprimés sont internes, pas exposés via `#[napi]` |
| Tests cassés | Exécuter `cargo test` après chaque suppression |
| Régression fonctionnelle | Le code mort n'est par définition jamais exécuté |

---

## Définition de Done

- [ ] `cargo check` produit 0 warnings
- [ ] `cargo clippy --all-targets -- -D warnings` passe sans erreur
- [ ] `cargo test` - tous les tests passent
- [ ] Code review des suppressions
