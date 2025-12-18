# P05 - NPM Distribution

## Objectif

Configurer le CI/CD GitHub Actions pour builder et publier les binaires natifs sur NPM avec support cross-platform (6 plateformes).

## Contexte

### Stratégie de Distribution
napi-rs recommande une approche avec packages optionnels par plateforme:
- `@ctxopt/cli` - Package principal (JS + loader)
- `@ctxopt/cli-darwin-x64` - macOS Intel
- `@ctxopt/cli-darwin-arm64` - macOS Apple Silicon
- `@ctxopt/cli-linux-x64-gnu` - Linux x64
- `@ctxopt/cli-linux-arm64-gnu` - Linux ARM64
- `@ctxopt/cli-win32-x64-msvc` - Windows x64
- `@ctxopt/cli-win32-arm64-msvc` - Windows ARM64

### Ressources
- [napi-rs Cross-build](https://napi.rs/docs/cross-build)
- [napi-rs GitHub Actions](https://github.com/napi-rs/cross-build)
- [Sentry CLI NPM publishing](https://sentry.engineering/blog/publishing-binaries-on-npm)

---

## Architecture CI/CD

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Build Job    │   │ Build Job    │   │ Build Job    │        │
│  │ darwin-x64   │   │ darwin-arm64 │   │ linux-x64    │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Build Job    │   │ Build Job    │   │ Build Job    │        │
│  │ linux-arm64  │   │ win32-x64    │   │ win32-arm64  │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
│         └────────────┬─────┴─────┬────────────┘                 │
│                      ▼           ▼                              │
│              ┌──────────────────────┐                           │
│              │   Publish Job        │                           │
│              │ (après tous builds)  │                           │
│              └──────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflow Complet

### .github/workflows/build.yml

```yaml
name: Build and Publish

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  DEBUG: napi:*
  MACOSX_DEPLOYMENT_TARGET: '10.13'

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        settings:
          # macOS Intel
          - host: macos-latest
            target: x86_64-apple-darwin
            build: |
              bun run build --target x86_64-apple-darwin
              strip -x *.node

          # macOS Apple Silicon
          - host: macos-latest
            target: aarch64-apple-darwin
            build: |
              bun run build --target aarch64-apple-darwin
              strip -x *.node

          # Linux x64 GNU
          - host: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            docker: ghcr.io/napi-rs/napi-rs/nodejs-rust:lts-debian
            build: |
              set -e
              bun run build --target x86_64-unknown-linux-gnu
              strip *.node

          # Linux ARM64 GNU
          - host: ubuntu-latest
            target: aarch64-unknown-linux-gnu
            docker: ghcr.io/napi-rs/napi-rs/nodejs-rust:lts-debian-aarch64
            build: |
              set -e
              bun run build --target aarch64-unknown-linux-gnu
              aarch64-linux-gnu-strip *.node

          # Windows x64
          - host: windows-latest
            target: x86_64-pc-windows-msvc
            build: bun run build --target x86_64-pc-windows-msvc

          # Windows ARM64
          - host: windows-latest
            target: aarch64-pc-windows-msvc
            build: bun run build --target aarch64-pc-windows-msvc

    name: Build - ${{ matrix.settings.target }}
    runs-on: ${{ matrix.settings.host }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        if: ${{ !matrix.settings.docker }}
        with:
          targets: ${{ matrix.settings.target }}

      - name: Cache Cargo
        uses: Swatinem/rust-cache@v2
        with:
          shared-key: ${{ matrix.settings.target }}

      - name: Install dependencies
        run: bun install
        working-directory: packages/ctxopt-core

      # Build natif (sans Docker)
      - name: Build (native)
        if: ${{ !matrix.settings.docker }}
        run: ${{ matrix.settings.build }}
        shell: bash
        working-directory: packages/ctxopt-core

      # Build avec Docker (Linux cross-compile)
      - name: Build (Docker)
        if: ${{ matrix.settings.docker }}
        uses: addnab/docker-run-action@v3
        with:
          image: ${{ matrix.settings.docker }}
          options: >-
            --user 0:0
            -v ${{ github.workspace }}:/build
            -w /build/packages/ctxopt-core
          run: |
            corepack enable
            bun install
            ${{ matrix.settings.build }}

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: bindings-${{ matrix.settings.target }}
          path: packages/ctxopt-core/*.node
          if-no-files-found: error

  # Job de test sur chaque plateforme
  test:
    name: Test - ${{ matrix.settings.target }}
    needs: build
    strategy:
      fail-fast: false
      matrix:
        settings:
          - host: macos-latest
            target: x86_64-apple-darwin
          - host: macos-latest
            target: aarch64-apple-darwin
          - host: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - host: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.settings.host }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install
        working-directory: packages/ctxopt-core

      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: bindings-${{ matrix.settings.target }}
          path: packages/ctxopt-core

      - name: Test bindings
        run: bun test
        working-directory: packages/ctxopt-core

  # Publication sur NPM
  publish:
    name: Publish to NPM
    runs-on: ubuntu-latest
    needs: [build, test]
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install
        working-directory: packages/ctxopt-core

      # Télécharger tous les artifacts
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Move artifacts
        run: bun run artifacts
        working-directory: packages/ctxopt-core

      - name: List packages
        run: ls -la npm/
        working-directory: packages/ctxopt-core

      # Publier les packages platform-specific
      - name: Publish platform packages
        run: |
          for pkg in npm/*; do
            if [ -d "$pkg" ]; then
              echo "Publishing $pkg..."
              cd "$pkg"
              npm publish --access public
              cd -
            fi
          done
        working-directory: packages/ctxopt-core
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # Publier le package principal
      - name: Publish main package
        run: npm publish --access public
        working-directory: packages/ctxopt-core
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # Publier le CLI wrapper
      - name: Install CLI dependencies
        run: bun install
        working-directory: packages/ctxopt-cli

      - name: Build CLI
        run: bun run build
        working-directory: packages/ctxopt-cli

      - name: Publish CLI
        run: npm publish --access public
        working-directory: packages/ctxopt-cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Scripts package.json (ctxopt-core)

```json
{
  "scripts": {
    "artifacts": "napi artifacts",
    "build": "napi build --platform --release",
    "build:debug": "napi build --platform",
    "prepublishOnly": "napi prepublish -t npm",
    "test": "node test/index.mjs",
    "universal": "napi universal -t @ctxopt/core",
    "version": "napi version"
  }
}
```

---

## Structure des Packages Platform-Specific

Après `napi artifacts`, la structure sera:

```
packages/ctxopt-core/
├── npm/
│   ├── darwin-x64/
│   │   ├── package.json
│   │   └── ctxopt-core.darwin-x64.node
│   ├── darwin-arm64/
│   │   ├── package.json
│   │   └── ctxopt-core.darwin-arm64.node
│   ├── linux-x64-gnu/
│   │   ├── package.json
│   │   └── ctxopt-core.linux-x64-gnu.node
│   ├── linux-arm64-gnu/
│   │   ├── package.json
│   │   └── ctxopt-core.linux-arm64-gnu.node
│   ├── win32-x64-msvc/
│   │   ├── package.json
│   │   └── ctxopt-core.win32-x64-msvc.node
│   └── win32-arm64-msvc/
│       ├── package.json
│       └── ctxopt-core.win32-arm64-msvc.node
├── index.js          # Loader qui détecte la plateforme
├── index.d.ts        # Types TypeScript
└── package.json
```

---

## Package.json Platform-Specific (exemple darwin-x64)

```json
{
  "name": "@ctxopt/cli-darwin-x64",
  "version": "0.1.0",
  "os": ["darwin"],
  "cpu": ["x64"],
  "main": "ctxopt-core.darwin-x64.node",
  "files": ["ctxopt-core.darwin-x64.node"],
  "license": "MIT",
  "engines": {
    "node": ">= 18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

---

## Index.js (Loader)

napi-rs génère automatiquement:

```javascript
// Auto-generated loader
const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let loadError = null

function isMusl() {
  // Détection musl vs glibc sur Linux
  if (!process.report || typeof process.report.getReport !== 'function') {
    try {
      return readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
    } catch (e) {
      return true
    }
  }
  const { glibcVersionRuntime } = process.report.getReport().header
  return !glibcVersionRuntime
}

switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'ctxopt-core.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./ctxopt-core.darwin-x64.node')
          } else {
            nativeBinding = require('@ctxopt/cli-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        // Similar pour arm64...
        break
    }
    break
  case 'linux':
    // Similar pour linux...
    break
  case 'win32':
    // Similar pour windows...
    break
}

if (!nativeBinding) {
  throw new Error(`Failed to load native binding: ${loadError?.message}`)
}

module.exports = nativeBinding
```

---

## Configuration NPM Token

1. Créer un token NPM: https://www.npmjs.com/settings/tokens
2. Ajouter le secret dans GitHub:
   - Settings → Secrets and variables → Actions
   - Nouveau secret: `NPM_TOKEN`

---

## Release Process

```bash
# 1. Bump version
bun version patch  # ou minor, major

# 2. Commit et tag
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0

# 3. Push (déclenche le CI)
git push origin main --tags
```

---

## Tâches

- [ ] Créer `.github/workflows/build.yml`
- [ ] Configurer la matrice de build (6 plateformes)
- [ ] Configurer les builds Docker pour Linux ARM64
- [ ] Configurer les tests post-build
- [ ] Configurer la publication conditionnelle sur tags
- [ ] Créer les scripts `artifacts` dans package.json
- [ ] Configurer NPM_TOKEN dans GitHub Secrets
- [ ] Tester le workflow en dry-run
- [ ] Publier une version de test (v0.0.1-alpha)
- [ ] Vérifier l'installation sur chaque plateforme

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `.github/workflows/build.yml` | Workflow CI/CD complet |
| `packages/ctxopt-core/npm/*/package.json` | Auto-généré par napi |

---

## Dépendances

**Prérequis**: P04 (napi bindings)

**Bloque**: P06 (CLI wrapper)

---

## Critères de Succès

1. Build réussit sur les 6 plateformes
2. Tests passent sur darwin-x64, linux-x64, win32-x64
3. Artifacts uploadés correctement
4. Publication NPM réussit pour tous les packages
5. `npm install @ctxopt/cli` fonctionne sur chaque plateforme
6. Le loader détecte correctement la plateforme
7. Pas d'erreur "native binding not found"
