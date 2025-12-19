# O04 - Clippy Strict Mode

> **Priorité**: Basse
> **Effort estimé**: 2-3 heures
> **Dépendances**: O00, O01, O02, O03
> **Impact**: Code plus idiomatique, moins de bugs potentiels

---

## Objectif

Activer les lints Clippy stricts pour garantir un code Rust idiomatique et prévenir les bugs courants.

---

## État Actuel

```rust
// lib.rs ligne 1
#![deny(clippy::all)]  // Seulement le lint de base
```

Résultat actuel:
```bash
$ cargo clippy
# 17 warnings (dead code, unused imports)
# Aucune erreur clippy::all
```

---

## Configuration Proposée

### Étape 1: Fichier clippy.toml

Créer `packages/ctxopt-core/clippy.toml`:

```toml
# Clippy configuration for ctxopt-core

# Don't break the NAPI exported API
avoid-breaking-exported-api = true

# Cognitive complexity threshold (default: 25)
cognitive-complexity-threshold = 25

# Maximum number of arguments for a function (default: 7)
too-many-arguments-threshold = 7

# Maximum number of lines in a function (default: 100)
too-many-lines-threshold = 100

# Maximum number of struct fields (default: 8)
max-struct-bools = 3

# Disallow certain methods that have safer alternatives
disallowed-methods = [
    # Prefer explicit error handling
    { path = "std::result::Result::unwrap", reason = "Use expect() or ? operator" },
    { path = "std::option::Option::unwrap", reason = "Use expect() or ? operator" },
]
```

### Étape 2: Lints dans lib.rs

```rust
// Activation progressive des lints
#![deny(clippy::all)]
#![warn(clippy::pedantic)]
#![warn(clippy::nursery)]

// Exceptions justifiées
#![allow(clippy::module_name_repetitions)]  // PtyManager dans mod pty est OK
#![allow(clippy::must_use_candidate)]       // Pas toujours pertinent pour NAPI
#![allow(clippy::missing_errors_doc)]       // Documenter dans O03
#![allow(clippy::missing_panics_doc)]       // Documenter si panic possible
```

---

## Lints Importants à Activer

### clippy::pedantic (Recommandations)

| Lint | Description | Action |
|------|-------------|--------|
| `needless_pass_by_value` | Passer par référence quand possible | Fix |
| `similar_names` | Noms de variables trop similaires | Review |
| `too_many_lines` | Fonctions trop longues | Refactor |
| `cognitive_complexity` | Fonctions trop complexes | Refactor |
| `cast_possible_truncation` | Cast qui peut tronquer | Fix ou allow |
| `cast_sign_loss` | Cast qui perd le signe | Fix ou allow |
| `cast_precision_loss` | Cast qui perd en précision | Fix ou allow |
| `doc_markdown` | Markdown dans les docs | Fix |

### clippy::nursery (Expérimental mais utile)

| Lint | Description | Action |
|------|-------------|--------|
| `use_self` | Utiliser `Self` au lieu du nom du type | Fix |
| `redundant_pub_crate` | `pub(crate)` redondant | Fix |
| `option_if_let_else` | Utiliser `map_or` au lieu de `if let` | Review |
| `missing_const_for_fn` | Fonctions qui peuvent être `const` | Review |

---

## Fichiers à Modifier

### lib.rs

```rust
// Problèmes clippy::pedantic potentiels

// L197: cast_possible_truncation
token_estimate: analysis.token_estimate as u32,
// Fix: .try_into().unwrap_or(u32::MAX) ou confirmer que c'est safe

// L199: cast_possible_truncation
total_size: analysis.total_size as u32,
```

### pty/manager.rs

```rust
// Problèmes potentiels

// L105: cast_possible_truncation
rows: rows.unwrap_or(24) as u16,
// Review: 24 fits in u16, mais le paramètre u32 pourrait dépasser

// Fonctions longues potentielles
// read_async() ~50 lignes - OK
// new() ~80 lignes - Review pour découpage
```

### stream/analyzer.rs

```rust
// cognitive_complexity potentielle
// analyze() - plusieurs branches de détection
```

---

## Processus d'Activation

### Phase 1: Baseline

```bash
# Voir tous les warnings actuels
cargo clippy --all-targets -- -W clippy::pedantic 2>&1 | head -100
```

### Phase 2: Triage

Pour chaque warning:
1. **Fix** si c'est une vraie amélioration
2. **Allow locally** avec `#[allow(...)]` + commentaire si faux positif
3. **Allow globally** dans lib.rs si pattern délibéré

### Phase 3: Activation Graduelle

```rust
// Semaine 1: Activer pedantic avec beaucoup d'allows
#![warn(clippy::pedantic)]
#![allow(/* liste longue */)]

// Semaine 2: Réduire les allows un par un
// Semaine 3: Activer nursery
```

---

## Exemple de Fix

### Avant (needless_pass_by_value)

```rust
pub fn analyze(&mut self, text: String) -> Analysis {
    // text est cloné inutilement
}
```

### Après

```rust
pub fn analyze(&mut self, text: &str) -> Analysis {
    // text emprunté, pas de clone
}
```

---

## Exceptions Documentées

```rust
// Quand un allow est nécessaire, documenter pourquoi:

#[allow(clippy::cast_possible_truncation)]
// SAFETY: token_estimate est toujours < u32::MAX car limité par la taille
// maximale d'un buffer (64KB) et le ratio moyen est ~4 chars/token
fn get_token_estimate(&self) -> u32 {
    self.token_estimate as u32
}
```

---

## Checklist d'Exécution

- [ ] Créer `clippy.toml` avec configuration de base
- [ ] Exécuter `cargo clippy -- -W clippy::pedantic` et lister les warnings
- [ ] Trier les warnings: fix / allow local / allow global
- [ ] Ajouter `#![warn(clippy::pedantic)]` avec allows nécessaires
- [ ] Fixer les warnings un par un (commencer par les plus simples)
- [ ] Documenter chaque `#[allow(...)]` avec la raison
- [ ] Activer `clippy::nursery` (optionnel)
- [ ] CI: ajouter `cargo clippy -- -D warnings` dans le pipeline
- [ ] Vérifier que le build et les tests passent

---

## CI Integration

Ajouter dans `.github/workflows/rust.yml` (ou équivalent):

```yaml
- name: Clippy
  run: |
    cd packages/ctxopt-core
    cargo clippy --all-targets -- -D warnings
```

---

## Ressources

- [Clippy Lint Index](https://rust-lang.github.io/rust-clippy/master/)
- [clippy::pedantic Lints](https://rust-lang.github.io/rust-clippy/master/index.html#?groups=pedantic)
- [clippy::nursery Lints](https://rust-lang.github.io/rust-clippy/master/index.html#?groups=nursery)
- [Clippy Configuration](https://doc.rust-lang.org/clippy/configuration.html)

---

## Définition de Done

- [ ] `cargo clippy -- -D warnings` passe sans erreur
- [ ] `clippy::pedantic` activé avec exceptions documentées
- [ ] Chaque `#[allow(...)]` a un commentaire explicatif
- [ ] CI vérifie clippy sur chaque PR
- [ ] Documentation des lints désactivés globalement
