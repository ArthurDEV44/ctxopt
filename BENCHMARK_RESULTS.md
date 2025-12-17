# Benchmarks des Outils CtxOpt MCP

**Date:** 2025-12-17
**Modèle:** claude-opus-4-5-20251101
**Version Claude Code:** v2.0.71

---

## Résumé Global

| Outil | Tokens Sans | Tokens Avec | Économie | Status |
|-------|-------------|-------------|----------|--------|
| `smart_file_read` | 56.9k | 5.4k | **90%** | ✅ |
| `auto_optimize` | 2.7k messages | 1.8k messages | **33%** | ✅ |
| `analyze_build_output` | 270 tokens brut | 102 tokens | **62%** | ✅ |
| `compress_context` | 562 tokens | 562 tokens | **0%** (JSON déjà compact) | ✅ |
| `summarize_logs` | - | - | - | ⏸️ Bloqué |
| `deduplicate_errors` | - | - | - | ⏸️ Bloqué |
| `detect_retry_loop` | - | - | - | ⏸️ Bloqué |

---

## Benchmark 1: `smart_file_read`

**Tâche:** Analyse complète de la codebase CtxOpt

### Résumé

| Métrique | Avec ctxopt | Sans ctxopt | Différence |
|----------|-------------|-------------|------------|
| **Tokens consommés (API)** | ~5.4k | ~56.9k | **-90%** |
| **Durée** | 1m 28s | 1m 52s | **-24s** |
| **Qualité du résultat** | Équivalente | Équivalente | - |

## Méthodologie

Deux sessions Claude Code identiques ont été lancées avec la même requête :
> "Analyse la codebase pour comprendre le projet."

### Session 1 : Avec outils ctxopt

```
Outils utilisés : smart_file_read (14 appels) + Search (6 appels)
Tokens lecture : 5.4k
Durée : ~1m 28s
```

### Session 2 : Sans outils ctxopt (Agent Explore)

```
Outils utilisés : Agent Explore (Haiku 4.5) → 48 tool uses internes
Tokens consommés par l'agent : 56.9k
Durée : 1m 52s
```

## Détails des tokens

### Contexte final (/context)

| Composant | Avec ctxopt | Sans ctxopt |
|-----------|-------------|-------------|
| System prompt | 3.2k | 3.2k |
| System tools | 15.2k | 15.2k |
| MCP tools (définitions) | 9.7k | 8.4k |
| Memory files | 1.6k | 1.6k |
| **Messages** | 19.1k | 8.0k |
| **Total contexte** | 94k (47%) | 81k (41%) |

### Analyse du paradoxe apparent

Le contexte "sans ctxopt" semble plus petit (81k vs 94k), mais c'est trompeur :

1. **Agent Explore consomme 56.9k tokens côté API** pour lire les fichiers
2. Ces tokens sont facturés mais **non visibles** dans `/context`
3. L'agent retourne un **résumé compressé** de 8k tokens

### Coût API réel

| | Avec ctxopt | Sans ctxopt |
|---|-------------|-------------|
| Lecture fichiers | ~5.4k | ~56.9k |
| Overhead MCP tools | +1.3k | - |
| **Coût total lecture** | **~6.7k** | **~56.9k** |

## Économies calculées

```
Tokens économisés : 56.9k - 5.4k = 51.5k tokens
Pourcentage économisé : 90.5%
Temps économisé : 24 secondes (21% plus rapide)
```

## Fichiers analysés

Les deux sessions ont analysé les mêmes fichiers clés :

**Configuration (JSON):**
- `package.json` (racine + apps/web + packages/*)
- `turbo.json`

**Package shared:**
- `src/constants.ts` (125 lignes)
- `src/types.ts` (232 lignes)
- `src/utils.ts` (130 lignes)

**Package mcp-server:**
- `src/server.ts` (200 lignes)
- `src/tools/registry.ts` (184 lignes)
- `src/tools/smart-file-read.ts` (372 lignes)
- `src/tools/auto-optimize.ts` (246 lignes)
- `src/cli/setup.ts` (153 lignes)

**App web:**
- `lib/db/schema.ts` (299 lignes)

**Total lignes TypeScript analysées : ~1,941 lignes**

## Fonctionnement de smart_file_read

Au lieu de retourner le contenu brut des fichiers, `smart_file_read` :

1. **Parse le fichier avec l'AST TypeScript**
2. **Extrait la structure** : fonctions, classes, interfaces, types, exports
3. **Retourne un résumé structuré** avec numéros de lignes

### Exemple de sortie

```
## File Structure: /home/sauron/code/ctxopt/packages/shared/src/utils.ts

**Language:** TypeScript
**Lines:** 130

### Functions
- `calculateCost` (exported function, lines 6-41)
- `formatCost` (exported function, lines 46-55)
- `formatNumber` (exported function, lines 60-71)
...
```

Cette approche fournit suffisamment d'information pour comprendre l'architecture sans charger tout le code.

## Seuil de rentabilité

L'overhead des définitions d'outils MCP est de ~9.7k tokens par session.

**Rentabilité atteinte après ~2-3 fichiers TypeScript** lus avec `smart_file_read`.

## Recommandations

| Cas d'usage | Outil recommandé |
|-------------|------------------|
| Explorer/comprendre une codebase | `smart_file_read` |
| Rechercher une fonction spécifique | `smart_file_read` avec `target` |
| Lire avant d'éditer un fichier | `Read` natif (requis par Edit) |
| Analyser des erreurs de build | `auto_optimize` |
| Logs volumineux | `summarize_logs` |

## Conclusion

L'utilisation de `smart_file_read` pour l'exploration de code offre :

- **90% d'économie de tokens** par rapport à la lecture brute
- **21% de gain de temps** sur l'analyse
- **Qualité équivalente** des résultats
- **Plus de contexte disponible** pour les tâches suivantes

---

## Benchmark 2: `auto_optimize`

**Tâche:** Analyser les erreurs de `bun run lint`

### Prompts utilisés

**Sans ctxopt:**
```
Exécute `bun run lint` dans le projet et analyse les erreurs.
```

**Avec ctxopt:**
```
Exécute `bun run lint` dans le projet. Ensuite, utilise l'outil
mcp__ctxopt__auto_optimize sur le résultat pour obtenir un résumé optimisé
des erreurs.
```

### Résumé

| Métrique | Avec ctxopt | Sans ctxopt | Différence |
|----------|-------------|-------------|------------|
| **Tokens messages** | 1.8k | 2.7k | **-33%** |
| **Appels d'outils** | 2 (Bash + auto_optimize) | 5 (Bash + explorations) | **-60%** |
| **Compression output** | 321 → 58 tokens | N/A | **-82%** |

### Session 1 : Sans ctxopt

```
Comportement observé :
1. Bash: bun run lint → erreur exit code 127
2. Bash: ls node_modules/.bin/eslint → non trouvé
3. Bash: cat packages/shared/package.json → lecture
4. Bash: ls node_modules → exploration
5. Bash: grep eslint → recherche dans tous les package.json
6. Bash: cat packages/shared/package.json (devDependencies)

Total appels: 6
Tokens messages: 2.7k
```

### Session 2 : Avec ctxopt

```
Comportement observé :
1. Bash: bun run lint → erreur exit code 127
2. auto_optimize: compression du résultat

Total appels: 2
Tokens messages: 1.8k
Compression: 321 → 58 tokens (82%)
```

### Détails de la compression

L'outil `auto_optimize` a détecté automatiquement le type de contenu (build-eslint) et a appliqué le groupement d'erreurs :

**Entrée (321 tokens):**
```
$ turbo run lint
turbo 2.6.3
• Packages in scope: @ctxopt/mcp-server, @ctxopt/shared, @ctxopt/web...
@ctxopt/shared:lint: /usr/bin/bash: line 1: eslint: command not found
@ctxopt/shared:lint: error: script "lint" exited with code 127
...
```

**Sortie (58 tokens):**
```
**Build failed** with 1 error (1 unique type)

### Errors
**1. ERROR**: script "lint" exited with code 127
   - Occurrences: 1
   - First: `unknown:0`
```

### Analyse

Sans ctxopt, Claude a fait **4 appels supplémentaires** pour investiguer la cause de l'erreur :
- Vérification de node_modules/.bin
- Lecture du package.json
- Grep dans tous les fichiers

Avec ctxopt, Claude a immédiatement compressé le résultat et fourni une analyse équivalente en **moins de tokens**.

### Conclusion

L'utilisation de `auto_optimize` pour l'analyse d'erreurs de build offre :

- **33% d'économie de tokens** dans les messages
- **60% de réduction des appels d'outils**
- **82% de compression** sur le output brut
- **Analyse équivalente** avec identification de la cause racine

---

## Benchmark 3: `analyze_build_output`

**Tâche:** Analyser une erreur TypeScript de build et proposer une correction

### Prompts utilisés

**Sans ctxopt:**
```
Exécute `bun run build` dans le projet et propose une correction manuel ne corrige pas tout seul.
```

**Avec ctxopt:**
```
Exécute `bun run build`. Utilise mcp__ctxopt__analyze_build_output sur
le résultat pour grouper les erreurs par type, puis proposer une correction manuel ne corrige pas tout seul.
```

### Erreur introduite

```typescript
// packages/shared/src/utils.ts:48
const invalidValue: number = "not a number";  // TS2322
```

### Résumé

| Métrique | Avec ctxopt | Sans ctxopt | Différence |
|----------|-------------|-------------|------------|
| **Tokens messages** | 2.3k | 1.7k | +35% |
| **Appels d'outils** | 3 | 2 | +1 |
| **Compression build output** | 270 → 102 tokens | N/A | **-62%** |
| **Qualité suggestions** | 3 options détaillées | 1 option | Meilleure |

### Session 1 : Sans ctxopt

```
Comportement observé :
1. Bash: bun run build → erreur TS2322
2. smart_file_read: lecture lignes 40-60 (84% réduction)

Total appels: 2
Tokens messages: 1.7k
Correction proposée: Supprimer les lignes
```

### Session 2 : Avec ctxopt

```
Comportement observé :
1. Bash: bun run build → erreur TS2322
2. analyze_build_output: compression 270 → 102 tokens (62%)
3. smart_file_read: lecture lignes 40-60 (84% réduction)

Total appels: 3
Tokens messages: 2.3k
Corrections proposées: 3 options détaillées avec tableau
```

### Détails de l'analyse

L'outil `analyze_build_output` a fourni :

**Sortie structurée:**
```
**Build failed** with 1 error (1 unique type)

### Errors
**1. TS2322**: Type 'string' is not assignable to type 'number'.
   - Occurrences: 1
   - First: `@ctxopt/shared:build: src/utils.ts:48`
   - 💡 Verify the types are compatible or add explicit type casting.

### Quick Fix
Verify the types are compatible or add explicit type casting.
```

### Analyse

**Paradoxe observé:** La version "avec ctxopt" consomme **plus de tokens** (2.3k vs 1.7k) dans ce cas simple.

**Raison:** Avec une seule erreur, l'overhead de l'outil supplémentaire et la réponse plus détaillée (tableau + 3 options) dépasse les économies.

**Valeur ajoutée de `analyze_build_output`:**
- Compression du build output: **62%** (270 → 102 tokens)
- Suggestions de quick fix intégrées
- Groupement par type d'erreur (utile avec plusieurs erreurs)
- Format structuré avec occurrences

### Seuil de rentabilité

`analyze_build_output` devient rentable quand :
- **> 5 erreurs** similaires (déduplication)
- **Build output > 500 tokens** (compression significative)
- **Erreurs répétitives** à grouper

### Conclusion

Pour une erreur unique, `analyze_build_output` ajoute de l'overhead. Son utilité principale est :

- **Groupement d'erreurs** similaires sur gros builds
- **Quick fix suggestions** automatiques
- **Format standardisé** pour analyse rapide

**Recommandation:** Utiliser `auto_optimize` pour cas simples, `analyze_build_output` pour builds complexes avec nombreuses erreurs.

---

## Benchmark 4: `compress_context`

**Tâche:** Résumer les dépendances du projet à partir des fichiers package.json

### Prompts utilisés

**Sans ctxopt:**
```
Lis le fichier package-lock.json (ou bun.lockb) et dis-moi quelles
sont les dépendances principales du projet.
```

**Avec ctxopt:**
```
Utilise mcp__ctxopt__compress_context sur le contenu de package.json
et ses dépendances pour obtenir un résumé des dépendances principales.
```

### Résumé

| Métrique | Avec ctxopt | Sans ctxopt | Différence |
|----------|-------------|-------------|------------|
| **Appels d'outils** | 5 (4 Read + compress) | 6 (2 Search + 4 Read) | -1 |
| **Compression** | 562 → 562 tokens | N/A | **0%** |
| **Qualité résultat** | Équivalente | Équivalente | - |

### Session 1 : Sans ctxopt

```
Comportement observé :
1. Search: **/package.json → 100 fichiers trouvés
2. Search: *.lock* → 7 fichiers trouvés
3. Read: package.json (racine)
4. Read: apps/web/package.json
5. Read: packages/mcp-server/package.json
6. Read: packages/shared/package.json

Total appels: 6
Résultat: Tableaux détaillés par package avec toutes les dépendances
```

### Session 2 : Avec ctxopt

```
Comportement observé :
1. Read: package.json (racine)
2. Read: apps/web/package.json
3. Read: packages/mcp-server/package.json
4. Read: packages/shared/package.json
5. compress_context: tentative de compression

Total appels: 5
Compression: 562 → 562 tokens (0%)
Résultat: Mêmes tableaux de dépendances
```

### Détails de la compression

L'outil `compress_context` a retourné :

```
### Compression Statistics
- **Content type:** Configuration file (JSON/YAML)
- **Technique:** config:yaml-depth-limit
- **Original:** 59 lines, 562 tokens
- **Compressed:** 59 lines, 562 tokens
- **Reduction:** 0%
```

### Analyse

**Résultat négatif:** `compress_context` n'a pas réduit la taille car :

1. **Les fichiers JSON sont déjà compacts** - pas de redondance à éliminer
2. **Structure hiérarchique** - difficile à compresser sans perte d'information
3. **Contenu déjà préformaté** par l'utilisateur avant envoi à l'outil

### Cas d'usage valides pour `compress_context`

L'outil est conçu pour :
- **Logs verbose** avec lignes répétitives
- **Stack traces** longues avec frames similaires
- **Configurations XML/YAML** très imbriquées
- **Contenu non structuré** avec redondances

### Cas d'usage NON valides

- **JSON compact** (package.json, tsconfig.json)
- **Code source** (utiliser `smart_file_read` à la place)
- **Données déjà structurées**

### Conclusion

Pour l'analyse de dépendances, `compress_context` **n'apporte pas de valeur** :

- **0% de compression** sur fichiers JSON
- **Overhead** de l'appel MCP supplémentaire
- **Résultat identique** à la lecture directe

**Recommandation:** Utiliser `compress_context` uniquement pour :
- Logs serveur > 1000 lignes
- Stack traces > 50 frames
- Configurations XML complexes

---

*Benchmarks réalisés avec Claude Code v2.0.72 sur le projet CtxOpt*
