# P07 - Hooks Integration

## Objectif

Configurer automatiquement les hooks Claude Code pour maximiser l'utilisation des outils MCP de ctxopt quand l'utilisateur utilise le wrapper.

## Contexte

### Hooks Claude Code
Claude Code supporte des hooks qui s'exécutent à différents moments:
- `PreToolUse` - Avant l'exécution d'un outil
- `PostToolUse` - Après l'exécution d'un outil
- `UserPromptSubmit` - Quand l'utilisateur envoie un prompt

### Intégration avec ctxopt
Le wrapper peut:
1. Détecter si les hooks sont déjà configurés
2. Proposer de les configurer automatiquement
3. Créer un profil dédié "ctxopt"

### Ressources
- [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)

---

## Configuration des Hooks

### Structure ~/.claude/settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "echo '[ctxopt] TIP: Consider smart_file_read for code files'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"if(process.env.TOOL_OUTPUT?.length > 5000) console.log('[ctxopt] TIP: Use auto_optimize for large output')\""
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'CTXOPT REMINDER: MCP tools available: smart_file_read, auto_optimize'"
          }
        ]
      }
    ]
  }
}
```

---

## Code TypeScript

### packages/ctxopt-cli/src/hooks.ts

```typescript
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Chemin vers les settings Claude Code
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');

// Hooks ctxopt à ajouter
const CTXOPT_HOOKS = {
  PreToolUse: [
    {
      matcher: 'Read',
      hooks: [
        {
          type: 'command',
          command: `node -e "
            const ext = process.env.TOOL_INPUT?.match(/\\.(ts|tsx|js|jsx|py|rs|go)$/);
            if (ext) console.log('[ctxopt] TIP: Consider mcp__ctxopt__smart_file_read for', ext[0], 'files (50-70% savings)');
          "`.replace(/\n\s+/g, ' ').trim(),
        },
      ],
    },
  ],
  PostToolUse: [
    {
      matcher: 'Bash',
      hooks: [
        {
          type: 'command',
          command: `node -e "
            const output = process.env.TOOL_OUTPUT || '';
            if (output.length > 5000) {
              console.log('[ctxopt] TIP: Large output (' + Math.round(output.length/1024) + 'KB). Use mcp__ctxopt__auto_optimize');
            }
          "`.replace(/\n\s+/g, ' ').trim(),
        },
      ],
    },
  ],
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: 'command',
          command: 'echo "CTXOPT REMINDER: Use MCP tools for token optimization: smart_file_read, auto_optimize, compress_context"',
        },
      ],
    },
  ],
};

/**
 * Lit les settings Claude Code actuels
 */
export function readSettings(): Record<string, unknown> {
  if (!existsSync(SETTINGS_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Écrit les settings Claude Code
 */
export function writeSettings(settings: Record<string, unknown>): void {
  // Créer le dossier si nécessaire
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Vérifie si les hooks ctxopt sont déjà configurés
 */
export function hasCtxoptHooks(): boolean {
  const settings = readSettings();
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;

  if (!hooks) return false;

  // Vérifier si au moins un hook ctxopt est présent
  const userPromptHooks = hooks.UserPromptSubmit as Array<{ hooks?: Array<{ command?: string }> }> | undefined;
  if (userPromptHooks) {
    return userPromptHooks.some((h) =>
      h.hooks?.some((hh) => hh.command?.includes('CTXOPT'))
    );
  }

  return false;
}

/**
 * Configure les hooks ctxopt dans Claude Code
 */
export function setupHooks(): { success: boolean; message: string } {
  try {
    const settings = readSettings();

    // Initialiser hooks si nécessaire
    if (!settings.hooks) {
      settings.hooks = {};
    }

    const hooks = settings.hooks as Record<string, unknown[]>;

    // Merger les hooks (sans écraser les existants)
    for (const [event, newHooks] of Object.entries(CTXOPT_HOOKS)) {
      if (!hooks[event]) {
        hooks[event] = [];
      }

      // Filtrer les hooks ctxopt existants
      const existingHooks = (hooks[event] as Array<{ hooks?: Array<{ command?: string }> }>)
        .filter((h) => !h.hooks?.some((hh) => hh.command?.includes('ctxopt')));

      // Ajouter les nouveaux hooks
      hooks[event] = [...existingHooks, ...newHooks];
    }

    writeSettings(settings);

    return {
      success: true,
      message: `Hooks configured in ${SETTINGS_FILE}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to configure hooks: ${error}`,
    };
  }
}

/**
 * Supprime les hooks ctxopt de Claude Code
 */
export function removeHooks(): { success: boolean; message: string } {
  try {
    const settings = readSettings();

    if (!settings.hooks) {
      return { success: true, message: 'No hooks to remove' };
    }

    const hooks = settings.hooks as Record<string, unknown[]>;

    // Filtrer les hooks ctxopt
    for (const event of Object.keys(hooks)) {
      hooks[event] = (hooks[event] as Array<{ hooks?: Array<{ command?: string }> }>)
        .filter((h) => !h.hooks?.some((hh) =>
          hh.command?.includes('ctxopt') || hh.command?.includes('CTXOPT')
        ));

      // Supprimer l'événement s'il est vide
      if (hooks[event].length === 0) {
        delete hooks[event];
      }
    }

    // Supprimer hooks s'il est vide
    if (Object.keys(hooks).length === 0) {
      delete settings.hooks;
    }

    writeSettings(settings);

    return {
      success: true,
      message: 'Hooks removed successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove hooks: ${error}`,
    };
  }
}

/**
 * Affiche le status des hooks
 */
export function getHooksStatus(): {
  configured: boolean;
  settingsPath: string;
  hookCount: number;
} {
  const settings = readSettings();
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;

  let hookCount = 0;
  if (hooks) {
    for (const event of Object.keys(hooks)) {
      hookCount += (hooks[event] as unknown[]).length;
    }
  }

  return {
    configured: hasCtxoptHooks(),
    settingsPath: SETTINGS_FILE,
    hookCount,
  };
}
```

### CLI Commands Addition (src/index.ts)

```typescript
// Ajouter ces commandes au CLI

import { setupHooks, removeHooks, getHooksStatus, hasCtxoptHooks } from './hooks';

program
  .command('setup')
  .description('Configure Claude Code hooks for ctxopt')
  .option('-f, --force', 'Force setup even if already configured')
  .action((options) => {
    if (hasCtxoptHooks() && !options.force) {
      console.log('Hooks already configured. Use --force to reconfigure.');
      return;
    }

    const result = setupHooks();
    if (result.success) {
      console.log('✓ ' + result.message);
      console.log('');
      console.log('Hooks configured:');
      console.log('  • PreToolUse: Suggests smart_file_read for code files');
      console.log('  • PostToolUse: Suggests auto_optimize for large outputs');
      console.log('  • UserPromptSubmit: Reminder of available tools');
    } else {
      console.error('✗ ' + result.message);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove ctxopt hooks from Claude Code')
  .action(() => {
    const result = removeHooks();
    if (result.success) {
      console.log('✓ ' + result.message);
    } else {
      console.error('✗ ' + result.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show ctxopt hooks status')
  .action(() => {
    const status = getHooksStatus();
    console.log('Hooks Status:');
    console.log(`  • Configured: ${status.configured ? 'Yes' : 'No'}`);
    console.log(`  • Settings file: ${status.settingsPath}`);
    console.log(`  • Total hooks: ${status.hookCount}`);
  });
```

---

## Auto-Setup au Premier Lancement

```typescript
// Dans runWrapper(), au début:

async function runWrapper(options: CliOptions): Promise<void> {
  // Auto-setup hooks si pas configurés
  if (!hasCtxoptHooks()) {
    console.error('[ctxopt] First run detected. Setting up Claude Code hooks...');
    const result = setupHooks();
    if (result.success) {
      console.error('[ctxopt] ✓ Hooks configured');
    } else {
      console.error('[ctxopt] ⚠ Could not configure hooks: ' + result.message);
    }
    console.error('');
  }

  // ... reste du code
}
```

---

## Tâches

- [ ] Créer `src/hooks.ts` avec les fonctions de gestion
- [ ] Implémenter `readSettings()` et `writeSettings()`
- [ ] Implémenter `hasCtxoptHooks()` pour détecter la config
- [ ] Implémenter `setupHooks()` pour configurer
- [ ] Implémenter `removeHooks()` pour nettoyer
- [ ] Ajouter la commande `ctxopt setup`
- [ ] Ajouter la commande `ctxopt uninstall`
- [ ] Ajouter la commande `ctxopt status`
- [ ] Implémenter l'auto-setup au premier lancement
- [ ] Tester avec une vraie installation Claude Code

---

## Fichiers à Créer/Modifier

| Fichier | Description |
|---------|-------------|
| `src/hooks.ts` | Gestion des hooks Claude Code |
| `src/index.ts` | Ajouter commandes setup/uninstall/status |

---

## Dépendances

**Prérequis**: P06 (CLI wrapper)

**Bloque**: P08 (testing)

---

## Critères de Succès

1. `ctxopt setup` configure les hooks
2. `ctxopt uninstall` supprime les hooks
3. `ctxopt status` affiche l'état
4. Auto-setup au premier lancement
5. Ne casse pas les hooks existants
6. Hooks fonctionnent dans Claude Code
7. Messages de suggestion s'affichent au bon moment
