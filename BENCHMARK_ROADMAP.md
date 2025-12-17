# ROADMAP: Benchmarks des Outils CtxOpt MCP

## Objectif

Créer des benchmarks comparatifs pour chaque outil MCP de CtxOpt en mesurant :
- **Tokens consommés** (avec vs sans ctxopt)
- **Temps d'exécution**
- **Qualité du résultat**

## Méthodologie

Pour chaque outil :
1. Exécuter la tâche SANS ctxopt (méthode native)
2. Exécuter la même tâche AVEC ctxopt
3. Mesurer les métriques via `/cost` et `/context`
4. Documenter les résultats dans `BENCHMARK_RESULTS.md`

---

## Benchmark 1: `smart_file_read`

**Status:** ✅ Complété - voir BENCHMARK_RESULTS.md

**Résultat:** 90% d'économie de tokens

---

## Benchmark 2: `auto_optimize`

**Status:** ✅ Complété - voir BENCHMARK_RESULTS.md

**Résultat:** 33% d'économie tokens messages, 82% compression output

**Description:** Optimisation automatique de contenu verbose (build output, logs, erreurs)

### Scénario de test
Exécuter un build TypeScript avec des erreurs intentionnelles

### Prompt SANS ctxopt
```
Exécute `bun run lint` dans le projet et analyse les erreurs.
```

### Prompt AVEC ctxopt
```
Exécute `bun run lint` dans le projet. Ensuite, utilise l'outil
mcp__ctxopt__auto_optimize sur le résultat pour obtenir un résumé optimisé
des erreurs.
```

### Métriques à mesurer
- Tokens du output brut vs output optimisé
- Lisibilité du résumé
- Temps total

---

## Benchmark 3: `analyze_build_output`

**Status:** ✅ Complété - voir BENCHMARK_RESULTS.md

**Résultat:** 62% compression output, mais +35% tokens messages (overhead pour 1 erreur)

**Description:** Analyse spécialisée pour les erreurs de build (tsc, eslint, webpack, etc.)

### Scénario de test
Créer temporairement des erreurs TypeScript dans plusieurs fichiers

### Prompt SANS ctxopt
```
Exécute `bun run build` dans le projet et propose une correction manuel ne corrige pas tout seul.
```

### Prompt AVEC ctxopt
```
Exécute `bun run build`. Utilise mcp__ctxopt__analyze_build_output sur
le résultat pour grouper les erreurs par type, puis proposer une correction manuel ne corrige pas tout seul.
```

### Métriques à mesurer
- Tokens consommés pour l'analyse
- Nombre d'itérations pour corriger
- Groupement efficace des erreurs similaires

---

## Benchmark 4: `compress_context`

**Status:** ✅ Complété - voir BENCHMARK_RESULTS.md

**Résultat:** 0% compression (JSON déjà compact - cas d'usage non optimal)

**Description:** Compression générique de contenu volumineux

### Scénario de test
Lire un fichier de configuration volumineux ou un dump JSON

### Prompt SANS ctxopt
```
Lis le fichier package-lock.json (ou bun.lockb) et dis-moi quelles
sont les dépendances principales du projet.
```

### Prompt AVEC ctxopt
```
Utilise mcp__ctxopt__compress_context sur le contenu de package.json
et ses dépendances pour obtenir un résumé des dépendances principales.
```

### Métriques à mesurer
- Ratio de compression
- Préservation de l'information utile
- Tokens économisés

---

## Benchmark 5: `summarize_logs`

**Status:** ⏸️ Bloqué - Nécessite des logs de test/serveur volumineux

**Description:** Résumé intelligent de logs (serveur, tests, build)

### Scénario de test
Générer des logs de test avec `bun test` ou lire des logs serveur

### Prompt SANS ctxopt
```
Exécute `bun test --reporter=verbose` et analyse les résultats
pour identifier les tests qui échouent.
```

### Prompt AVEC ctxopt
```
Exécute `bun test --reporter=verbose`. Utilise mcp__ctxopt__summarize_logs
sur le résultat pour obtenir un résumé des tests échoués avec statistiques.
```

### Métriques à mesurer
- Compression des logs verbeux
- Extraction des informations clés (erreurs, warnings)
- Statistiques générées (pass rate, durée)

---

## Benchmark 6: `deduplicate_errors`

**Status:** ⏸️ Bloqué - Nécessite des erreurs répétitives (>50 occurrences)

**Description:** Déduplication des erreurs répétitives

### Scénario de test
Créer un fichier avec une erreur qui se propage (ex: type manquant utilisé partout)

### Prompt SANS ctxopt
```
J'ai 50 erreurs "Cannot find name 'UserType'" dans mon projet.
Corrige-les toutes.
```

### Prompt AVEC ctxopt
```
J'ai des erreurs TypeScript répétitives. Utilise mcp__ctxopt__deduplicate_errors
sur le output de `bun run check-types` pour grouper les erreurs identiques,
puis corrige la cause racine.
```

### Métriques à mesurer
- Nombre d'erreurs avant/après déduplication
- Identification de la cause racine
- Tokens économisés (80%+ attendu)

---

## Benchmark 7: `detect_retry_loop`

**Status:** ⏸️ Bloqué - Nécessite simulation de bug difficile à résoudre

**Description:** Détection des boucles de retry (même commande échouant plusieurs fois)

### Scénario de test
Simuler un bug difficile à résoudre nécessitant plusieurs tentatives

### Prompt SANS ctxopt
```
Corrige le bug dans le fichier X. (avec un bug intentionnel qui
nécessite plusieurs essais)
```

### Prompt AVEC ctxopt
```
Corrige le bug dans le fichier X. Si tu rencontres des échecs répétés,
utilise mcp__ctxopt__detect_retry_loop pour analyser si tu es dans
une boucle et obtenir des suggestions alternatives.
```

### Métriques à mesurer
- Nombre d'itérations avant détection
- Qualité des suggestions alternatives
- Temps total de résolution

---

## Benchmark 8: `session_stats`

**Description:** Statistiques de session en temps réel

### Scénario de test
Après une session de travail, vérifier les métriques

### Prompt
```
Utilise mcp__ctxopt__session_stats pour voir les statistiques
de cette session : tokens économisés, outils utilisés, patterns détectés.
```

### Métriques à mesurer
- Précision des statistiques reportées
- Recommandations générées
- Utilité pour l'optimisation future

---

## Plan d'exécution

### Phase 1: Préparation
1. Créer une branche `benchmark-tools`
2. Préparer des fichiers de test avec erreurs intentionnelles
3. Configurer l'environnement de mesure

### Phase 2: Exécution des benchmarks
Pour chaque outil (7 benchmarks restants):
1. Session 1: Exécuter SANS ctxopt, noter les métriques
2. Session 2: Exécuter AVEC ctxopt, noter les métriques
3. Documenter les résultats

### Phase 3: Documentation
1. Mettre à jour `BENCHMARK_RESULTS.md` avec tous les résultats
2. Créer des tableaux comparatifs
3. Rédiger les conclusions et recommandations

---

## Structure du fichier de résultats

```markdown
# Benchmark Results

## Résumé Global
| Outil | Tokens Sans | Tokens Avec | Économie |
|-------|-------------|-------------|----------|
| smart_file_read | 56.9k | 5.4k | 90% |
| auto_optimize | ? | ? | ? |
| ... | ... | ... | ... |

## Détails par outil
### [Nom de l'outil]
- Scénario: ...
- Résultat sans ctxopt: ...
- Résultat avec ctxopt: ...
- Conclusion: ...
```

---

## Fichiers à créer/modifier

1. **Modifier:** `BENCHMARK_RESULTS.md` - Ajouter les nouveaux benchmarks
2. **Créer (optionnel):** `test-fixtures/` - Fichiers de test avec erreurs intentionnelles
3. **Créer (optionnel):** `scripts/benchmark.sh` - Script d'automatisation des benchmarks
