# O05 - Feature Audit

> **Priorité**: Basse
> **Effort estimé**: 2-3 heures
> **Dépendances**: O00, O03, O04
> **Impact**: Réduction de la dette technique, code plus cohérent

---

## Objectif

Auditer les features incomplètes ou non utilisées et décider de leur sort: compléter ou supprimer.

---

## Inventaire des Features Incomplètes

### 1. Injection stdin (templates.rs)

**Localisation**: `injector/templates.rs:31`

```rust
pub struct Suggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
    pub inject_command: Option<String>,  // ⚠️ Jamais utilisé
    pub priority: u8,                     // ⚠️ Jamais utilisé
}
```

**Intention originale**: Injecter automatiquement des commandes dans le stdin du PTY.

**État actuel**:
- Le champ existe mais n'est jamais rempli (`None` partout)
- Aucune logique d'injection implémentée
- Le wrapper actuel utilise des hooks Claude Code à la place

**Décision recommandée**: **SUPPRIMER**
- Les hooks Claude Code sont plus puissants et non-intrusifs
- L'injection stdin pourrait interférer avec l'input utilisateur
- La feature n'a jamais été testée

**Action**:
```rust
// Avant
pub struct Suggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
    pub inject_command: Option<String>,
    pub priority: u8,
}

// Après
pub struct Suggestion {
    pub suggestion_type: SuggestionType,
    pub message: String,
}
```

---

### 2. Priorité des Suggestions (templates.rs)

**Localisation**: `injector/templates.rs:34`

**Intention originale**: Trier les suggestions par priorité avant affichage.

**État actuel**:
- Le champ `priority: u8` est défini mais toujours à `0`
- Aucune logique de tri implémentée

**Décision recommandée**: **SUPPRIMER**
- En pratique, on affiche rarement plus d'une suggestion à la fois
- Le throttling dans `ContextInjector` limite déjà le nombre de suggestions
- Ajouter du tri ajouterait de la complexité inutile

---

### 3. Support Webpack/Vite (patterns.rs)

**Localisation**: `stream/patterns.rs:47-48`

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BuildTool {
    TypeScript,
    Rust,
    Go,
    Eslint,
    Webpack,  // ⚠️ Jamais matché
    Vite,     // ⚠️ Jamais matché
    Generic,
}
```

**Intention originale**: Détecter les erreurs de build Webpack et Vite.

**État actuel**:
- Les variants enum existent
- Aucune regex de détection dans `detect_build_tool()`
- Les erreurs Webpack/Vite tombent dans `Generic`

**Options**:

| Option | Effort | Bénéfice |
|--------|--------|----------|
| Supprimer les variants | 5 min | Code propre |
| Implémenter la détection | 2h | Meilleur support bundlers |

**Décision recommandée**: **IMPLÉMENTER** (si temps disponible) ou **SUPPRIMER**

**Si implémentation**:

```rust
// Patterns Webpack
lazy_static! {
    static ref WEBPACK_ERROR: Regex = Regex::new(
        r"(?i)(ERROR in|Module build failed|ModuleNotFoundError)"
    ).unwrap();
}

// Patterns Vite
lazy_static! {
    static ref VITE_ERROR: Regex = Regex::new(
        r"(?i)(\[vite\]|error during build|Pre-transform error)"
    ).unwrap();
}

fn detect_build_tool(text: &str) -> BuildTool {
    // Existant: TypeScript, Rust, Go, Eslint
    // Ajouter:
    if WEBPACK_ERROR.is_match(text) {
        BuildTool::Webpack
    } else if VITE_ERROR.is_match(text) {
        BuildTool::Vite
    } else {
        BuildTool::Generic
    }
}
```

---

### 4. PromptInjector (SUPPRIMÉ)

**Note**: Cette feature a été supprimée dans la session précédente. Elle injectait des rappels MCP sur chaque appui Enter.

**Raison de suppression**: Remplacée par les hooks Claude Code PreToolUse qui sont plus efficaces.

**État**: ✅ Terminé

---

### 5. Méthodes spawn_claude* (pty/manager.rs)

**Localisation**: `pty/manager.rs:253-300`

```rust
pub fn spawn_claude() -> Result<Self, PtyError>
pub fn spawn_claude_with_profile(profile: &str) -> Result<Self, PtyError>
```

**Intention originale**: Helpers pour lancer spécifiquement Claude Code.

**État actuel**:
- Jamais utilisées
- Fonctionnalité couverte par `new()` avec paramètre command

**Décision recommandée**: **SUPPRIMER** (couvert dans O00)

---

### 6. OutputBuffer (stream/buffer.rs)

**Localisation**: `stream/buffer.rs`

**Intention originale**: Ring buffer pour garder un historique des outputs.

**État actuel**:
- Partiellement implémenté
- Méthodes `content()`, `is_empty()`, `capacity()` jamais utilisées
- Utilisé uniquement pour `push()` et `len()`

**Options**:

| Option | Effort | Bénéfice |
|--------|--------|----------|
| Supprimer méthodes inutiles | 5 min | Code propre |
| Compléter avec historique | 4h | Feature "replay" |

**Décision recommandée**: **SUPPRIMER** les méthodes inutiles (couvert dans O00)

---

## Matrice de Décision

| Feature | État | Utilisée | Décision | Phase |
|---------|------|----------|----------|-------|
| `inject_command` | Implémenté | Non | Supprimer | O00 |
| `priority` | Implémenté | Non | Supprimer | O00 |
| Webpack/Vite detection | Stub | Non | Supprimer ou Implémenter | O05 |
| `spawn_claude*` | Implémenté | Non | Supprimer | O00 |
| Buffer methods | Implémenté | Non | Supprimer | O00 |

---

## Checklist d'Exécution

- [ ] Confirmer suppression `inject_command` et `priority` (si pas fait dans O00)
- [ ] Décider pour Webpack/Vite: implémenter ou supprimer
- [ ] Si implémentation Webpack/Vite:
  - [ ] Ajouter regex de détection
  - [ ] Mettre à jour `detect_build_tool()`
  - [ ] Ajouter tests
- [ ] Si suppression Webpack/Vite:
  - [ ] Supprimer les variants
  - [ ] Mettre à jour les exhaustive matches
- [ ] Vérifier qu'aucune autre feature fantôme n'existe
- [ ] Documenter les décisions dans CHANGELOG

---

## Questions pour Décision

Avant d'implémenter cette phase, répondre à:

1. **Webpack/Vite**: Est-ce que les utilisateurs cibles utilisent ces bundlers?
   - Si oui → Implémenter
   - Si non → Supprimer

2. **Futures features**: Y a-t-il un roadmap qui nécessite ces stubs?
   - Si oui → Garder avec `#[allow(dead_code)]` + TODO
   - Si non → Supprimer

---

## Définition de Done

- [ ] Aucune feature stub sans justification
- [ ] Chaque feature incomplète est soit complétée soit supprimée
- [ ] Code mort identifié dans O00 est effectivement supprimé
- [ ] CHANGELOG documente les features supprimées
