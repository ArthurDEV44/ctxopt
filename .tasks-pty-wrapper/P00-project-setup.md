# P00 - Project Setup

## Objectif

Initialiser la structure du projet Rust avec napi-rs pour créer un module natif Node.js cross-platform, intégré dans le monorepo existant.

## Contexte

Le PTY wrapper nécessite:
- Un crate Rust compilé en module natif Node.js
- Une distribution via NPM avec packages platform-specific
- Une intégration dans le monorepo Turbo existant

### Ressources
- [napi-rs Getting Started](https://napi.rs/docs/introduction/getting-started)
- [napi-rs Simple Package](https://napi.rs/docs/introduction/simple-package)
- [portable-pty](https://crates.io/crates/portable-pty)

---

## Structure à Créer

```
packages/
├── ctxopt-core/                   # Crate Rust
│   ├── Cargo.toml
│   ├── build.rs
│   ├── src/
│   │   ├── lib.rs
│   │   ├── pty/
│   │   │   └── mod.rs
│   │   ├── stream/
│   │   │   └── mod.rs
│   │   ├── injector/
│   │   │   └── mod.rs
│   │   ├── tokens/
│   │   │   └── mod.rs
│   │   └── config/
│   │       └── mod.rs
│   ├── package.json               # Pour napi build
│   └── .cargo/
│       └── config.toml            # Cross-compilation
│
├── ctxopt-cli/                    # Entry point TypeScript
│   ├── src/
│   │   └── index.ts
│   ├── bin/
│   │   └── ctxopt
│   ├── package.json
│   └── tsconfig.json
│
└── ctxopt-cli-darwin-x64/         # (et autres platforms)
    └── package.json
```

---

## Cargo.toml Complet

```toml
[package]
name = "ctxopt-core"
version = "0.1.0"
edition = "2021"
license = "MIT"
description = "Native PTY wrapper for Claude Code token optimization"
repository = "https://github.com/ctxopt/ctxopt"
keywords = ["pty", "terminal", "claude", "tokens", "optimization"]

[lib]
crate-type = ["cdylib"]

[dependencies]
# NAPI bindings
napi = { version = "2", default-features = false, features = [
    "napi8",
    "async",
    "serde-json",
    "tokio_rt"
] }
napi-derive = "2"

# PTY cross-platform
portable-pty = "0.9"

# Async runtime
tokio = { version = "1", features = [
    "rt-multi-thread",
    "sync",
    "io-util",
    "time",
    "macros"
] }

# Pattern matching
regex = "1"
once_cell = "1"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Error handling
anyhow = "1"
thiserror = "1"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Token estimation
claude-tokenizer = "0.3"

[build-dependencies]
napi-build = "2"

[profile.release]
lto = true
opt-level = "z"
strip = true
codegen-units = 1
panic = "abort"

[profile.dev]
opt-level = 0
debug = true
```

---

## build.rs

```rust
extern crate napi_build;

fn main() {
    napi_build::setup();
}
```

---

## src/lib.rs Initial

```rust
#![deny(clippy::all)]
#![allow(dead_code)]

use napi::bindgen_prelude::*;
use napi_derive::napi;

mod pty;
mod stream;
mod injector;
mod tokens;
mod config;

/// Version du module natif
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Point d'entrée pour tests
#[napi]
pub fn ping() -> String {
    "pong".to_string()
}
```

---

## Modules Stubs (src/*/mod.rs)

### src/pty/mod.rs
```rust
//! PTY management avec portable-pty
//!
//! Ce module gère la création et manipulation des pseudo-terminaux
//! cross-platform (Unix PTY, Windows ConPTY).

pub mod manager;

pub use manager::PtyManager;
```

### src/stream/mod.rs
```rust
//! Stream analysis pour détecter les patterns
//!
//! Analyse le stdout du PTY pour identifier:
//! - Erreurs de build
//! - Lectures de fichiers
//! - Outputs volumineux
//! - Prompts ready

pub mod analyzer;
pub mod buffer;

pub use analyzer::{StreamAnalyzer, ContentType};
pub use buffer::RingBuffer;
```

### src/injector/mod.rs
```rust
//! Context injection via stdin
//!
//! Injecte des suggestions dans le stdin du PTY
//! quand des patterns optimisables sont détectés.

pub mod triggers;
pub mod templates;

pub use triggers::ContextInjector;
```

### src/tokens/mod.rs
```rust
//! Token estimation avec claude-tokenizer
//!
//! Fournit des estimations de tokens pour
//! afficher les statistiques en temps réel.

pub mod estimator;

pub use estimator::TokenEstimator;
```

### src/config/mod.rs
```rust
//! Configuration du wrapper
//!
//! Gère ~/.ctxopt/config.toml et les settings
//! de session.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    /// Intervalle minimum entre injections (ms)
    pub injection_interval_ms: u64,

    /// Activer les suggestions
    pub suggestions_enabled: bool,

    /// Verbose logging
    pub verbose: bool,
}

impl Config {
    pub fn new() -> Self {
        Self {
            injection_interval_ms: 5000,
            suggestions_enabled: true,
            verbose: false,
        }
    }
}
```

---

## package.json (ctxopt-core)

```json
{
  "name": "@ctxopt/core",
  "version": "0.1.0",
  "description": "Native PTY wrapper for Claude Code",
  "main": "index.js",
  "types": "index.d.ts",
  "napi": {
    "name": "ctxopt-core",
    "triples": {
      "defaults": true,
      "additional": [
        "aarch64-apple-darwin",
        "aarch64-unknown-linux-gnu",
        "aarch64-pc-windows-msvc"
      ]
    }
  },
  "scripts": {
    "artifacts": "napi artifacts",
    "build": "napi build --platform --release",
    "build:debug": "napi build --platform",
    "prepublishOnly": "napi prepublish -t npm",
    "test": "cargo test",
    "universal": "napi universal -t @ctxopt/core"
  },
  "devDependencies": {
    "@napi-rs/cli": "^2.18.0"
  },
  "engines": {
    "node": ">= 18"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "index.js",
    "index.d.ts",
    "*.node"
  ]
}
```

---

## package.json (ctxopt-cli)

```json
{
  "name": "@ctxopt/cli",
  "version": "0.1.0",
  "description": "Terminal wrapper for Claude Code with automatic token optimization",
  "bin": {
    "ctxopt": "./bin/ctxopt"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@ctxopt/core": "workspace:*",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  },
  "optionalDependencies": {
    "@ctxopt/cli-darwin-x64": "0.1.0",
    "@ctxopt/cli-darwin-arm64": "0.1.0",
    "@ctxopt/cli-linux-x64-gnu": "0.1.0",
    "@ctxopt/cli-linux-arm64-gnu": "0.1.0",
    "@ctxopt/cli-win32-x64-msvc": "0.1.0",
    "@ctxopt/cli-win32-arm64-msvc": "0.1.0"
  },
  "engines": {
    "node": ">= 18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

---

## .cargo/config.toml

```toml
[target.x86_64-apple-darwin]
rustflags = ["-C", "link-arg=-undefined", "-C", "link-arg=dynamic_lookup"]

[target.aarch64-apple-darwin]
rustflags = ["-C", "link-arg=-undefined", "-C", "link-arg=dynamic_lookup"]

[target.x86_64-unknown-linux-gnu]
linker = "x86_64-linux-gnu-gcc"

[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"

[target.x86_64-pc-windows-msvc]
rustflags = []

[target.aarch64-pc-windows-msvc]
rustflags = []
```

---

## Tâches

- [ ] Créer le dossier `packages/ctxopt-core/`
- [ ] Initialiser Cargo.toml avec toutes les dépendances
- [ ] Créer build.rs pour napi-build
- [ ] Créer src/lib.rs avec exports initiaux
- [ ] Créer les modules stubs (pty, stream, injector, tokens, config)
- [ ] Créer package.json pour napi build
- [ ] Créer le dossier `packages/ctxopt-cli/`
- [ ] Initialiser package.json avec bin entry
- [ ] Créer tsconfig.json
- [ ] Créer .cargo/config.toml pour cross-compilation
- [ ] Vérifier `cargo build` compile sans erreur
- [ ] Vérifier `bun run build` génère le .node file

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `packages/ctxopt-core/Cargo.toml` | Manifest Rust avec dépendances |
| `packages/ctxopt-core/build.rs` | Build script napi |
| `packages/ctxopt-core/src/lib.rs` | Entry point Rust |
| `packages/ctxopt-core/src/pty/mod.rs` | Module PTY stub |
| `packages/ctxopt-core/src/stream/mod.rs` | Module stream stub |
| `packages/ctxopt-core/src/injector/mod.rs` | Module injector stub |
| `packages/ctxopt-core/src/tokens/mod.rs` | Module tokens stub |
| `packages/ctxopt-core/src/config/mod.rs` | Module config |
| `packages/ctxopt-core/package.json` | Config napi-rs |
| `packages/ctxopt-core/.cargo/config.toml` | Cross-compilation |
| `packages/ctxopt-cli/package.json` | Package NPM principal |
| `packages/ctxopt-cli/tsconfig.json` | Config TypeScript |
| `packages/ctxopt-cli/bin/ctxopt` | Shebang script |

---

## Dépendances

**Prérequis**: Aucun (première tâche)

**Bloque**: P01, P02, P03, P04

---

## Critères de Succès

1. `cargo build` compile sans erreur dans `packages/ctxopt-core/`
2. `cargo test` passe (même si vide)
3. `bun install` dans `packages/ctxopt-core/` installe @napi-rs/cli
4. `bun run build` génère `ctxopt-core.[platform].node`
5. Le fichier .node peut être importé dans Node.js
6. `ping()` retourne "pong" quand appelé depuis JS
