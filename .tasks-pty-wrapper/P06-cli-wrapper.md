# P06 - CLI Wrapper

## Objectif

Créer l'entry point TypeScript qui charge le module natif et gère l'interaction terminal (stdin/stdout piping, resize, signals).

## Contexte

### Responsabilités du CLI
1. Charger le module natif approprié pour la plateforme
2. Créer une session PTY
3. Pipe stdin utilisateur → PTY
4. Pipe PTY output → stdout avec suggestions
5. Gérer les signaux (SIGINT, SIGWINCH)
6. Afficher les stats à la fin

### Ressources
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Node.js process.stdin](https://nodejs.org/api/process.html#processstdin)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ctxopt CLI                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐                                             │
│  │   Commander    │  ctxopt [options]                           │
│  │   (args)       │  --no-suggestions, --verbose                │
│  └───────┬────────┘                                             │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │ process.stdin  │──────►│  CtxOptSession │                    │
│  │  (raw mode)    │       │  (native)      │                    │
│  └────────────────┘       └───────┬────────┘                    │
│                                   │                              │
│  ┌────────────────┐       ┌───────▼────────┐                    │
│  │ process.stdout │◄──────│   Read Loop    │                    │
│  │  (output)      │       │  + suggestions │                    │
│  └────────────────┘       └────────────────┘                    │
│                                                                  │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │   SIGWINCH     │──────►│    resize()    │                    │
│  │   handler      │       │                │                    │
│  └────────────────┘       └────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code TypeScript Complet

### packages/ctxopt-cli/src/index.ts

```typescript
#!/usr/bin/env node

import { program } from 'commander';
import { CtxOptSession, utils } from '@ctxopt/core';

// Version depuis package.json
const VERSION = '0.1.0';

// Options CLI
interface CliOptions {
  suggestions: boolean;
  verbose: boolean;
  command: string;
}

// Configuration du CLI
program
  .name('ctxopt')
  .description('Terminal wrapper for Claude Code with automatic token optimization')
  .version(VERSION)
  .option('--no-suggestions', 'Disable optimization suggestions')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-c, --command <cmd>', 'Command to run (default: claude)', 'claude')
  .action(async (options: CliOptions) => {
    await runWrapper(options);
  });

// Main function
async function runWrapper(options: CliOptions): Promise<void> {
  const { rows, columns } = getTerminalSize();

  if (options.verbose) {
    console.error(`[ctxopt] Starting with terminal size: ${rows}x${columns}`);
    console.error(`[ctxopt] Command: ${options.command}`);
    console.error(`[ctxopt] Suggestions: ${options.suggestions ? 'enabled' : 'disabled'}`);
  }

  // Créer la session
  let session: CtxOptSession;
  try {
    session = CtxOptSession.withConfig(
      rows,
      columns,
      options.command,
      5000, // injection interval ms
      options.suggestions
    );
  } catch (error) {
    console.error(`[ctxopt] Failed to start: ${error}`);
    process.exit(1);
  }

  // Configurer stdin en raw mode
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  // Pipe stdin vers PTY
  process.stdin.on('data', async (data: Buffer) => {
    try {
      await session.writeBytes(data);
    } catch (error) {
      if (options.verbose) {
        console.error(`[ctxopt] Write error: ${error}`);
      }
    }
  });

  // Handler SIGWINCH (resize terminal)
  process.on('SIGWINCH', async () => {
    const { rows: newRows, columns: newCols } = getTerminalSize();
    try {
      await session.resize(newRows, newCols);
      if (options.verbose) {
        console.error(`[ctxopt] Resized to ${newRows}x${newCols}`);
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`[ctxopt] Resize error: ${error}`);
      }
    }
  });

  // Handler SIGINT (Ctrl+C) - forward to PTY
  process.on('SIGINT', async () => {
    try {
      await session.write('\x03'); // Ctrl+C
    } catch {
      // Ignore errors during shutdown
    }
  });

  // Read loop
  try {
    await readLoop(session, options.verbose);
  } catch (error) {
    if (options.verbose) {
      console.error(`[ctxopt] Error: ${error}`);
    }
  }

  // Cleanup et affichage stats
  await cleanup(session, options.verbose);
}

// Boucle de lecture principale
async function readLoop(session: CtxOptSession, verbose: boolean): Promise<void> {
  while (await session.isRunning()) {
    try {
      const result = await session.read();

      // Afficher l'output original
      if (result.output) {
        process.stdout.write(result.output);
      }

      // Afficher les suggestions (sur stderr pour ne pas polluer stdout)
      for (const suggestion of result.suggestions) {
        process.stderr.write(suggestion);
      }

      // Si pas d'output, attendre un peu
      if (!result.output) {
        await sleep(10);
      }
    } catch (error) {
      if (verbose) {
        console.error(`[ctxopt] Read error: ${error}`);
      }
      break;
    }
  }
}

// Cleanup et affichage stats
async function cleanup(session: CtxOptSession, verbose: boolean): Promise<void> {
  // Restaurer stdin
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();

  // Attendre le process
  let exitCode = 0;
  try {
    exitCode = await session.wait();
  } catch {
    // Ignore
  }

  // Afficher les stats
  try {
    const stats = await session.stats();
    console.error('');
    console.error('\x1b[90m─────────────────────────────────────────\x1b[0m');
    console.error(`\x1b[36m[ctxopt]\x1b[0m Session stats:`);
    console.error(`  • Tokens estimated: ${formatNumber(stats.totalTokens)}`);
    console.error(`  • Suggestions shown: ${stats.totalSuggestions}`);
    console.error(`  • Build errors detected: ${stats.totalBuildErrors}`);
    console.error(`  • Duration: ${formatDuration(stats.elapsedMs)}`);
    console.error('\x1b[90m─────────────────────────────────────────\x1b[0m');
  } catch {
    // Stats non disponibles
  }

  process.exit(exitCode);
}

// Helpers
function getTerminalSize(): { rows: number; columns: number } {
  return {
    rows: process.stdout.rows || 24,
    columns: process.stdout.columns || 80,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

// Run
program.parse();
```

### packages/ctxopt-cli/bin/ctxopt

```bash
#!/usr/bin/env node
require('../dist/index.js');
```

### packages/ctxopt-cli/package.json

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
    "build": "tsup src/index.ts --format cjs --dts --clean",
    "dev": "tsup src/index.ts --format cjs --watch",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ctxopt/core": "workspace:*",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsup": "^8.1.0",
    "typescript": "^5.5.0"
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
  },
  "keywords": [
    "claude",
    "anthropic",
    "terminal",
    "pty",
    "tokens",
    "optimization"
  ],
  "license": "MIT"
}
```

### packages/ctxopt-cli/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Usage

```bash
# Installation globale
npm install -g @ctxopt/cli

# Utilisation
ctxopt                      # Lance Claude Code avec optimisations
ctxopt --no-suggestions     # Désactive les suggestions
ctxopt -v                   # Mode verbose
ctxopt -c "python3"         # Utiliser un autre command

# Aide
ctxopt --help
```

---

## Tâches

- [ ] Créer `packages/ctxopt-cli/src/index.ts`
- [ ] Configurer Commander.js avec options
- [ ] Implémenter la création de session
- [ ] Implémenter le raw mode stdin
- [ ] Implémenter le pipe stdin → PTY
- [ ] Implémenter la read loop
- [ ] Implémenter le handler SIGWINCH
- [ ] Implémenter le handler SIGINT
- [ ] Implémenter l'affichage des stats à la fin
- [ ] Créer `bin/ctxopt` shebang script
- [ ] Créer `package.json` avec bin entry
- [ ] Créer `tsconfig.json`
- [ ] Tester localement avec `bun link`

---

## Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `packages/ctxopt-cli/src/index.ts` | Entry point CLI |
| `packages/ctxopt-cli/bin/ctxopt` | Shebang script |
| `packages/ctxopt-cli/package.json` | Package manifest |
| `packages/ctxopt-cli/tsconfig.json` | TypeScript config |

---

## Dépendances

**Prérequis**: P04 (napi bindings), P05 (npm distribution)

**Bloque**: P07 (hooks integration)

---

## Critères de Succès

1. `ctxopt` lance Claude Code dans un PTY
2. Input utilisateur est passé à Claude
3. Output Claude est affiché
4. Suggestions sont affichées sur stderr
5. Terminal resize fonctionne
6. Ctrl+C est passé au PTY
7. Stats affichées à la fin
8. `--no-suggestions` désactive les suggestions
9. `--verbose` affiche les logs de debug
