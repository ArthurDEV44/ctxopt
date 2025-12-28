/**
 * Session Tracker
 *
 * Singleton class that tracks per-session statistics for tool usage,
 * token savings, and optimization metrics.
 */

/**
 * Per-tool statistics
 */
export interface ToolStats {
  invocations: number;
  tokensIn: number;
  tokensOut: number;
  tokensSaved: number;
  totalDurationMs: number;
  errors: number;
}

/**
 * Session-wide statistics
 */
export interface SessionStats {
  startTime: Date;
  lastActivityTime: Date;
  totalInvocations: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalTokensSaved: number;
  totalDurationMs: number;
  totalErrors: number;
  toolStats: Record<string, ToolStats>;
}

/**
 * Session Tracker class
 * Accumulates statistics across all tool invocations in a session.
 */
class SessionTracker {
  private startTime: Date;
  private lastActivityTime: Date;
  private toolStats: Map<string, ToolStats>;

  constructor() {
    this.startTime = new Date();
    this.lastActivityTime = new Date();
    this.toolStats = new Map();
  }

  /**
   * Record a tool invocation
   */
  recordInvocation(
    toolName: string,
    tokensIn: number,
    tokensOut: number,
    tokensSaved: number,
    durationMs: number,
    isError: boolean = false
  ): void {
    this.lastActivityTime = new Date();

    const existing = this.toolStats.get(toolName) || {
      invocations: 0,
      tokensIn: 0,
      tokensOut: 0,
      tokensSaved: 0,
      totalDurationMs: 0,
      errors: 0,
    };

    existing.invocations++;
    existing.tokensIn += tokensIn;
    existing.tokensOut += tokensOut;
    existing.tokensSaved += tokensSaved;
    existing.totalDurationMs += durationMs;
    if (isError) existing.errors++;

    this.toolStats.set(toolName, existing);
  }

  /**
   * Get current session statistics
   */
  getStats(): SessionStats {
    let totalInvocations = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalTokensSaved = 0;
    let totalDurationMs = 0;
    let totalErrors = 0;

    const toolStatsObj: Record<string, ToolStats> = {};

    for (const [name, stats] of this.toolStats.entries()) {
      totalInvocations += stats.invocations;
      totalTokensIn += stats.tokensIn;
      totalTokensOut += stats.tokensOut;
      totalTokensSaved += stats.tokensSaved;
      totalDurationMs += stats.totalDurationMs;
      totalErrors += stats.errors;
      toolStatsObj[name] = { ...stats };
    }

    return {
      startTime: this.startTime,
      lastActivityTime: this.lastActivityTime,
      totalInvocations,
      totalTokensIn,
      totalTokensOut,
      totalTokensSaved,
      totalDurationMs,
      totalErrors,
      toolStats: toolStatsObj,
    };
  }

  /**
   * Reset session statistics
   */
  reset(): void {
    this.startTime = new Date();
    this.lastActivityTime = new Date();
    this.toolStats.clear();
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDurationMs(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get optimization rate (tokens saved / tokens in)
   */
  getOptimizationRate(): number {
    const stats = this.getStats();
    if (stats.totalTokensIn === 0) return 0;
    return stats.totalTokensSaved / stats.totalTokensIn;
  }
}

// Global singleton instance
let globalTracker: SessionTracker | null = null;

/**
 * Get the global session tracker instance
 */
export function getSessionTracker(): SessionTracker {
  if (!globalTracker) {
    globalTracker = new SessionTracker();
  }
  return globalTracker;
}

/**
 * Reset the global session tracker
 */
export function resetSessionTracker(): void {
  if (globalTracker) {
    globalTracker.reset();
  } else {
    globalTracker = new SessionTracker();
  }
}

/**
 * Export session stats for the session tracker
 */
export { SessionTracker };
