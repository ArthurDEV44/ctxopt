# P08 - Testing & Polish

## Objectif

Implémenter les tests automatisés, vérifier le fonctionnement cross-platform, et finaliser la documentation et les métriques.

## Contexte

### Types de Tests
1. **Tests unitaires Rust** - `cargo test`
2. **Tests d'intégration Node.js** - Vérifier les bindings
3. **Tests cross-platform** - CI sur 6 plateformes
4. **Tests manuels** - Avec Claude Code réel

### Métriques à Valider
- Overhead latence < 5ms
- Memory footprint < 50MB
- Token estimation ±10% précision

---

## Tests Unitaires Rust

### packages/ctxopt-core/src/tests/mod.rs

```rust
//! Module de tests

#[cfg(test)]
mod pty_tests;

#[cfg(test)]
mod stream_tests;

#[cfg(test)]
mod injector_tests;

#[cfg(test)]
mod tokens_tests;
```

### packages/ctxopt-core/src/tests/pty_tests.rs

```rust
use crate::pty::{PtyManager, PtySize, PtyError};

#[tokio::test]
async fn test_pty_spawn_and_read() {
    let pty = PtyManager::new("echo", &["hello world"], PtySize::default())
        .expect("Failed to create PTY");

    // Attendre que le process démarre
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let output = pty.read().await.expect("Failed to read");
    let text = String::from_utf8_lossy(&output);

    assert!(text.contains("hello world"), "Expected 'hello world', got: {}", text);
}

#[tokio::test]
async fn test_pty_write_and_read() {
    let pty = PtyManager::new("cat", &[], PtySize::default())
        .expect("Failed to create PTY");

    // Écrire dans stdin
    pty.write_str("test input\n").await.expect("Failed to write");

    // Attendre et lire
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    let output = pty.read().await.expect("Failed to read");
    let text = String::from_utf8_lossy(&output);

    assert!(text.contains("test input"), "Expected 'test input', got: {}", text);

    // Cleanup
    pty.kill().await.ok();
}

#[tokio::test]
async fn test_pty_is_running() {
    let pty = PtyManager::new("sleep", &["0.5"], PtySize::default())
        .expect("Failed to create PTY");

    assert!(pty.is_running().await, "Process should be running");

    // Attendre la fin
    tokio::time::sleep(tokio::time::Duration::from_millis(600)).await;

    assert!(!pty.is_running().await, "Process should have exited");
}

#[tokio::test]
async fn test_pty_resize() {
    let pty = PtyManager::new("cat", &[], PtySize::default())
        .expect("Failed to create PTY");

    let result = pty.resize(PtySize { rows: 40, cols: 120 }).await;
    assert!(result.is_ok(), "Resize should succeed");

    pty.kill().await.ok();
}

#[tokio::test]
async fn test_pty_wait_exit_code() {
    // Process qui retourne 0
    let pty_success = PtyManager::new("true", &[], PtySize::default())
        .expect("Failed to create PTY");
    let code = pty_success.wait().await.expect("Wait failed");
    assert_eq!(code, 0, "Exit code should be 0");

    // Process qui retourne 1
    let pty_fail = PtyManager::new("false", &[], PtySize::default())
        .expect("Failed to create PTY");
    let code = pty_fail.wait().await.expect("Wait failed");
    assert_eq!(code, 1, "Exit code should be 1");
}
```

### packages/ctxopt-core/src/tests/stream_tests.rs

```rust
use crate::stream::{StreamAnalyzer, ContentType};
use crate::stream::patterns::BuildTool;

#[test]
fn test_detect_typescript_errors() {
    let mut analyzer = StreamAnalyzer::new();

    let typescript_output = r#"
src/index.ts:10:5 - error TS2304: Cannot find name 'foo'.
src/index.ts:15:10 - error TS2339: Property 'bar' does not exist on type 'string'.
    "#;

    let result = analyzer.analyze(typescript_output);

    let has_build_error = result.content_types.iter().any(|ct| {
        matches!(ct, ContentType::BuildError { tool: BuildTool::TypeScript, .. })
    });

    assert!(has_build_error, "Should detect TypeScript errors");
}

#[test]
fn test_detect_rust_errors() {
    let mut analyzer = StreamAnalyzer::new();

    let rust_output = r#"
error[E0425]: cannot find value `foo` in this scope
  --> src/main.rs:10:5
   |
10 |     foo;
   |     ^^^ not found in this scope
    "#;

    let result = analyzer.analyze(rust_output);

    let has_build_error = result.content_types.iter().any(|ct| {
        matches!(ct, ContentType::BuildError { tool: BuildTool::Rust, .. })
    });

    assert!(has_build_error, "Should detect Rust errors");
}

#[test]
fn test_detect_large_output() {
    let mut analyzer = StreamAnalyzer::new();

    // Générer un output volumineux
    let large = "x".repeat(10000);
    let result = analyzer.analyze(&large);

    let has_large_output = result.content_types.iter().any(|ct| {
        matches!(ct, ContentType::LargeOutput { .. })
    });

    assert!(has_large_output, "Should detect large output");
}

#[test]
fn test_strip_ansi_codes() {
    let analyzer = StreamAnalyzer::new();

    let with_ansi = "\x1b[31mError:\x1b[0m Something failed";
    let clean = analyzer.strip_ansi(with_ansi);

    assert_eq!(clean, "Error: Something failed");
    assert!(!clean.contains("\x1b"), "Should not contain ANSI codes");
}

#[test]
fn test_token_estimation() {
    let mut analyzer = StreamAnalyzer::new();

    let text = "Hello, this is a test message with some content.";
    let result = analyzer.analyze(text);

    // ~4 chars per token, text is ~50 chars
    assert!(result.token_estimate > 5 && result.token_estimate < 30,
        "Token estimate should be reasonable: {}", result.token_estimate);
}
```

### packages/ctxopt-core/src/tests/injector_tests.rs

```rust
use crate::injector::{ContextInjector, Suggestion, SuggestionType};
use crate::stream::patterns::{ContentType, BuildTool};
use std::time::Duration;

#[test]
fn test_should_inject_build_errors() {
    let injector = ContextInjector::new();

    // Moins de 3 erreurs: pas d'injection
    let few_errors = ContentType::BuildError {
        error_count: 2,
        tool: BuildTool::TypeScript,
    };
    assert!(!injector.should_inject(&few_errors));

    // 3+ erreurs: injection
    let many_errors = ContentType::BuildError {
        error_count: 10,
        tool: BuildTool::TypeScript,
    };
    assert!(injector.should_inject(&many_errors));
}

#[test]
fn test_throttling() {
    let mut injector = ContextInjector::with_interval(50); // 50ms

    let content = ContentType::BuildError {
        error_count: 10,
        tool: BuildTool::Rust,
    };

    // Première injection OK
    assert!(injector.generate_suggestion(&content).is_some());

    // Deuxième immédiate: bloquée
    assert!(injector.generate_suggestion(&content).is_none());

    // Après délai: toujours bloquée par recent_types
    std::thread::sleep(Duration::from_millis(60));
    assert!(injector.generate_suggestion(&content).is_none());

    // Différent type: OK
    let other = ContentType::LargeOutput { size: 50000 };
    assert!(injector.generate_suggestion(&other).is_some());
}

#[test]
fn test_prompt_reminder_limit() {
    let mut injector = ContextInjector::with_interval(1); // 1ms pour test rapide

    for i in 0..5 {
        std::thread::sleep(Duration::from_millis(2));
        let result = injector.generate_suggestion(&ContentType::PromptReady);

        if i < 3 {
            assert!(result.is_some(), "Should allow first 3 reminders");
        } else {
            assert!(result.is_none(), "Should block after 3 reminders");
        }
    }
}

#[test]
fn test_suggestion_format() {
    let suggestion = Suggestion::build_errors(42, BuildTool::TypeScript);

    assert_eq!(suggestion.suggestion_type, SuggestionType::BuildErrors);
    assert!(suggestion.display_message.contains("42"));
    assert!(suggestion.display_message.contains("tsc"));

    let formatted = suggestion.format_for_display();
    assert!(formatted.starts_with("\n"));
    assert!(formatted.ends_with("\n"));
}
```

---

## Tests Node.js

### packages/ctxopt-core/test/index.mjs

```javascript
import assert from 'node:assert';
import test from 'node:test';
import { CtxOptSession, utils, version } from '../index.js';

test('version() returns a string', () => {
  const v = version();
  assert.ok(typeof v === 'string');
  assert.match(v, /^\d+\.\d+\.\d+/);
});

test('utils.estimateTokens() works', () => {
  const tokens = utils.estimateTokens('Hello, world!');
  assert.ok(typeof tokens === 'number');
  assert.ok(tokens > 0 && tokens < 100);
});

test('utils.isCodeFile() detects code files', () => {
  assert.ok(utils.isCodeFile('src/main.ts'));
  assert.ok(utils.isCodeFile('app.py'));
  assert.ok(utils.isCodeFile('lib.rs'));
  assert.ok(!utils.isCodeFile('README.md'));
  assert.ok(!utils.isCodeFile('config.json'));
});

test('utils.stripAnsi() removes ANSI codes', () => {
  const clean = utils.stripAnsi('\x1b[31mError\x1b[0m');
  assert.strictEqual(clean, 'Error');
});

test('CtxOptSession can be created', () => {
  // Note: Ce test nécessite que 'echo' soit disponible
  const session = new CtxOptSession(24, 80, 'echo');
  assert.ok(session);
});

test('CtxOptSession.read() returns ReadResult', async () => {
  const session = new CtxOptSession(24, 80, 'echo');

  // Attendre un peu
  await new Promise(resolve => setTimeout(resolve, 100));

  const result = await session.read();
  assert.ok('output' in result);
  assert.ok('suggestions' in result);
  assert.ok('tokenEstimate' in result);
  assert.ok(Array.isArray(result.suggestions));
});

test('CtxOptSession.stats() returns SessionStats', async () => {
  const session = new CtxOptSession(24, 80, 'echo');

  const stats = await session.stats();
  assert.ok('totalTokens' in stats);
  assert.ok('totalSuggestions' in stats);
  assert.ok('elapsedMs' in stats);
  assert.ok(typeof stats.totalTokens === 'number');
});

test('CtxOptSession.isRunning() works', async () => {
  const session = new CtxOptSession(24, 80, 'sleep');

  // sleep sans args termine immédiatement (erreur)
  await new Promise(resolve => setTimeout(resolve, 100));

  const running = await session.isRunning();
  assert.ok(typeof running === 'boolean');
});
```

---

## Benchmarks

### packages/ctxopt-core/benches/latency.rs

```rust
//! Benchmarks de latence

use criterion::{criterion_group, criterion_main, Criterion};
use ctxopt_core::stream::StreamAnalyzer;

fn bench_analyze(c: &mut Criterion) {
    let mut analyzer = StreamAnalyzer::new();
    let sample_output = include_str!("./fixtures/build_output.txt");

    c.bench_function("analyze_build_output", |b| {
        b.iter(|| {
            analyzer.reset();
            analyzer.analyze(sample_output)
        })
    });
}

fn bench_strip_ansi(c: &mut Criterion) {
    let analyzer = StreamAnalyzer::new();
    let with_ansi = "\x1b[31mError\x1b[0m: ".repeat(1000);

    c.bench_function("strip_ansi_1000", |b| {
        b.iter(|| analyzer.strip_ansi(&with_ansi))
    });
}

criterion_group!(benches, bench_analyze, bench_strip_ansi);
criterion_main!(benches);
```

---

## Métriques à Collecter

### Script de mesure

```bash
#!/bin/bash
# scripts/measure-metrics.sh

echo "=== CtxOpt Metrics ==="

# 1. Latence
echo ""
echo "1. Latency Test (echo round-trip)"
time (echo "test" | timeout 1s ctxopt -c cat 2>/dev/null)

# 2. Memory footprint
echo ""
echo "2. Memory Footprint"
ctxopt -c "sleep 5" &
PID=$!
sleep 1
ps -o rss= -p $PID | awk '{print "RSS: " $1/1024 " MB"}'
kill $PID 2>/dev/null

# 3. Binary size
echo ""
echo "3. Binary Sizes"
ls -lh packages/ctxopt-core/*.node 2>/dev/null || echo "No .node files found"

# 4. Token estimation accuracy (manual)
echo ""
echo "4. Token Estimation"
echo "   Run: node -e \"console.log(require('@ctxopt/core').utils.estimateTokens('test'))\""
```

---

## Checklist Finale

### Documentation
- [ ] README.md avec installation et usage
- [ ] CHANGELOG.md
- [ ] LICENSE (MIT)
- [ ] Exemples dans docs/

### Code Quality
- [ ] `cargo clippy` sans warnings
- [ ] `cargo fmt` appliqué
- [ ] `bun run lint` passe
- [ ] Types TypeScript exportés

### Tests
- [ ] Tests unitaires Rust > 80% coverage
- [ ] Tests Node.js passent
- [ ] CI passe sur 6 plateformes

### Performance
- [ ] Latence < 5ms mesurée
- [ ] Memory < 50MB mesurée
- [ ] Benchmarks documentés

---

## Tâches

- [ ] Créer les tests unitaires Rust complets
- [ ] Créer les tests Node.js
- [ ] Configurer criterion pour benchmarks
- [ ] Créer script de mesure métriques
- [ ] Exécuter tests sur toutes plateformes (CI)
- [ ] Mesurer latence réelle
- [ ] Mesurer memory footprint
- [ ] Vérifier token estimation vs API
- [ ] Créer README.md complet
- [ ] Créer CHANGELOG.md
- [ ] Ajouter LICENSE
- [ ] Exécuter cargo clippy
- [ ] Exécuter cargo fmt
- [ ] Tag release v0.1.0

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/tests/mod.rs` | Module tests |
| `src/tests/pty_tests.rs` | Tests PTY |
| `src/tests/stream_tests.rs` | Tests Stream |
| `src/tests/injector_tests.rs` | Tests Injector |
| `test/index.mjs` | Tests Node.js |
| `benches/latency.rs` | Benchmarks |
| `scripts/measure-metrics.sh` | Mesure métriques |
| `README.md` | Documentation |
| `CHANGELOG.md` | Historique |
| `LICENSE` | MIT |

---

## Dépendances

**Prérequis**: P00-P07 (tout le reste)

**Bloque**: Release v0.1.0

---

## Critères de Succès

1. `cargo test` passe à 100%
2. `node test/index.mjs` passe à 100%
3. CI passe sur les 6 plateformes
4. Latence mesurée < 5ms
5. Memory footprint < 50MB
6. Token estimation ±10% vs comptage manuel
7. Documentation complète
8. Release v0.1.0 publiée
