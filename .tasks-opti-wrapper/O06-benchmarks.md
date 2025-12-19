# O06 - Performance Benchmarks

> **Priorité**: Basse
> **Effort estimé**: 4-6 heures
> **Dépendances**: O00, O02 (Lock Optimization)
> **Impact**: Baseline de performance, validation des optimisations

---

## Objectif

Établir une baseline de performance et mesurer l'impact des optimisations, notamment le passage Mutex → RwLock.

---

## Setup Criterion

### Cargo.toml

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["async_tokio"] }

[[bench]]
name = "ctxopt_benchmarks"
harness = false
```

### benches/ctxopt_benchmarks.rs

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use ctxopt_core::{/* imports */};
use tokio::runtime::Runtime;

fn bench_token_estimation(c: &mut Criterion) {
    let estimator = TokenEstimator::new();

    let samples = vec![
        ("small", "Hello, world!"),
        ("medium", include_str!("../fixtures/medium.txt")),
        ("large", include_str!("../fixtures/large.txt")),
    ];

    let mut group = c.benchmark_group("token_estimation");
    for (name, text) in samples {
        group.bench_with_input(BenchmarkId::new("estimate", name), text, |b, text| {
            b.iter(|| estimator.estimate(black_box(text)))
        });
    }
    group.finish();
}

fn bench_pattern_detection(c: &mut Criterion) {
    let mut group = c.benchmark_group("pattern_detection");

    // TypeScript errors sample
    let ts_errors = include_str!("../fixtures/typescript_errors.txt");
    group.bench_function("typescript_detection", |b| {
        b.iter(|| {
            let analyzer = StreamAnalyzer::new();
            analyzer.detect_content_type(black_box(ts_errors))
        })
    });

    // Large output sample
    let large_output = "x".repeat(50_000);
    group.bench_function("large_output_detection", |b| {
        b.iter(|| {
            let analyzer = StreamAnalyzer::new();
            analyzer.detect_content_type(black_box(&large_output))
        })
    });

    group.finish();
}

fn bench_ansi_stripping(c: &mut Criterion) {
    let ansi_text = include_str!("../fixtures/ansi_output.txt");

    c.bench_function("strip_ansi", |b| {
        b.iter(|| ctxopt_core::utils::strip_ansi(black_box(ansi_text.to_string())))
    });
}

criterion_group!(benches,
    bench_token_estimation,
    bench_pattern_detection,
    bench_ansi_stripping,
);
criterion_main!(benches);
```

---

## Benchmarks Async (Lock Contention)

### benches/lock_benchmarks.rs

```rust
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::{Mutex, RwLock};

async fn mutex_read_heavy(data: Arc<Mutex<Vec<u8>>>, iterations: usize) {
    for _ in 0..iterations {
        let guard = data.lock().await;
        let _ = guard.len();
    }
}

async fn rwlock_read_heavy(data: Arc<RwLock<Vec<u8>>>, iterations: usize) {
    for _ in 0..iterations {
        let guard = data.read().await;
        let _ = guard.len();
    }
}

fn bench_lock_contention(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let data_size = 10_000;

    let mut group = c.benchmark_group("lock_contention");

    for num_readers in [1, 4, 8, 16] {
        // Mutex benchmark
        group.bench_with_input(
            BenchmarkId::new("mutex", num_readers),
            &num_readers,
            |b, &num_readers| {
                let data = Arc::new(Mutex::new(vec![0u8; data_size]));
                b.to_async(&rt).iter(|| async {
                    let mut handles = Vec::new();
                    for _ in 0..num_readers {
                        let d = Arc::clone(&data);
                        handles.push(tokio::spawn(mutex_read_heavy(d, 100)));
                    }
                    for h in handles {
                        h.await.unwrap();
                    }
                });
            },
        );

        // RwLock benchmark
        group.bench_with_input(
            BenchmarkId::new("rwlock", num_readers),
            &num_readers,
            |b, &num_readers| {
                let data = Arc::new(RwLock::new(vec![0u8; data_size]));
                b.to_async(&rt).iter(|| async {
                    let mut handles = Vec::new();
                    for _ in 0..num_readers {
                        let d = Arc::clone(&data);
                        handles.push(tokio::spawn(rwlock_read_heavy(d, 100)));
                    }
                    for h in handles {
                        h.await.unwrap();
                    }
                });
            },
        );
    }

    group.finish();
}

criterion_group!(lock_benches, bench_lock_contention);
criterion_main!(lock_benches);
```

---

## Benchmarks End-to-End

### benches/e2e_benchmarks.rs

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use ctxopt_core::CtxOptSession;
use tokio::runtime::Runtime;

fn bench_session_read_throughput(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    c.bench_function("session_read_empty", |b| {
        b.to_async(&rt).iter(|| async {
            // Note: Nécessite un mock PTY pour être reproductible
            // Ce benchmark est indicatif
            let session = CtxOptSession::new(Some(24), Some(80), Some("echo test".to_string()))
                .unwrap();
            session.read().await
        });
    });
}

fn bench_full_analysis_pipeline(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let sample_output = include_str!("../fixtures/mixed_output.txt");

    c.bench_function("full_pipeline", |b| {
        b.to_async(&rt).iter(|| async {
            let mut analyzer = StreamAnalyzer::new();
            let analysis = analyzer.analyze(sample_output);

            let mut injector = ContextInjector::new();
            for ct in &analysis.content_types {
                let _ = injector.generate_suggestion(ct);
            }

            analysis
        });
    });
}

criterion_group!(e2e_benches,
    bench_session_read_throughput,
    bench_full_analysis_pipeline,
);
criterion_main!(e2e_benches);
```

---

## Fixtures à Créer

### benches/fixtures/

```
fixtures/
├── medium.txt           # ~1KB de texte
├── large.txt            # ~50KB de texte
├── typescript_errors.txt # Output tsc avec 20+ erreurs
├── rust_errors.txt      # Output cargo avec erreurs
├── ansi_output.txt      # Output avec codes ANSI
└── mixed_output.txt     # Mix de différents types
```

### Exemple typescript_errors.txt

```
src/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
src/index.ts:15:10 - error TS2339: Property 'foo' does not exist on type 'Bar'.
src/utils.ts:25:3 - error TS2304: Cannot find name 'something'.
// ... 17 autres erreurs similaires
Found 20 errors.
```

---

## Commandes

```bash
# Exécuter tous les benchmarks
cargo bench

# Exécuter un benchmark spécifique
cargo bench -- token_estimation

# Générer un rapport HTML
cargo bench -- --verbose

# Comparer avec baseline
cargo bench -- --save-baseline before_optimization
# Après modifications
cargo bench -- --baseline before_optimization
```

---

## Métriques à Collecter

| Métrique | Avant O02 | Après O02 | Amélioration |
|----------|-----------|-----------|--------------|
| `lock_contention/mutex/8` | - | - | - |
| `lock_contention/rwlock/8` | - | - | - |
| `token_estimation/medium` | - | - | - |
| `pattern_detection/typescript` | - | - | - |
| `strip_ansi` | - | - | - |
| `full_pipeline` | - | - | - |

---

## Profiling avec Flamegraph

### Installation

```bash
cargo install flamegraph
```

### Utilisation

```bash
# Profiler les benchmarks
cargo flamegraph --bench ctxopt_benchmarks -- --bench

# Profiler le CLI en action
cargo flamegraph --bin ctxopt -- <args>
```

### Analyse

Le flamegraph montre:
- Temps passé dans chaque fonction
- Hot paths à optimiser
- Overhead des locks

---

## Checklist d'Exécution

- [ ] Ajouter `criterion` dans Cargo.toml
- [ ] Créer structure `benches/`
- [ ] Créer fixtures de test
- [ ] Implémenter `bench_token_estimation`
- [ ] Implémenter `bench_pattern_detection`
- [ ] Implémenter `bench_ansi_stripping`
- [ ] Implémenter `bench_lock_contention`
- [ ] Exécuter baseline AVANT O02
- [ ] Exécuter APRÈS O02
- [ ] Documenter les résultats
- [ ] Ajouter benchmarks dans CI (optionnel)

---

## CI Integration (Optionnel)

```yaml
# .github/workflows/bench.yml
name: Benchmarks
on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run benchmarks
        run: |
          cd packages/ctxopt-core
          cargo bench -- --noplot
      - name: Store results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: packages/ctxopt-core/target/criterion/
```

---

## Définition de Done

- [ ] Tous les benchmarks s'exécutent sans erreur
- [ ] Baseline documentée avant optimisations
- [ ] Comparaison avant/après O02 documentée
- [ ] Fixtures de test créées et versionnées
- [ ] Documentation des résultats dans ce fichier
