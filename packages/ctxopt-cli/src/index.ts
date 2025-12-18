#!/usr/bin/env node

import { program } from 'commander';
import { CtxOptSession } from '@ctxopt/core';

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

  // Creer la session
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
