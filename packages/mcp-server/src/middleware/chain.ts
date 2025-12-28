/**
 * Middleware Chain
 *
 * Manages the execution of middleware before and after tool calls.
 * Errors in middleware are tracked but don't stop execution (fail-safe).
 */

import type { Middleware, MiddlewareError, ToolContext, ToolResult } from "./types.js";

export class MiddlewareChain {
  private middlewares: Middleware[] = [];

  /**
   * Add a middleware to the chain
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    // Sort by priority (lower runs first)
    this.middlewares.sort((a, b) => a.priority - b.priority);
    return this;
  }

  /**
   * Remove a middleware by name
   */
  remove(name: string): boolean {
    const index = this.middlewares.findIndex((m) => m.name === name);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered middlewares
   */
  list(): Middleware[] {
    return [...this.middlewares];
  }

  /**
   * Track a middleware error
   */
  private trackError(
    ctx: ToolContext,
    middlewareName: string,
    phase: MiddlewareError["phase"],
    error: unknown
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    ctx.middlewareErrors.push({
      middlewareName,
      phase,
      error: err,
      timestamp: Date.now(),
    });
    // Also log for debugging
    console.error(`[distill] Middleware ${middlewareName} ${phase} error:`, err.message);
  }

  /**
   * Execute beforeTool hooks for all middlewares
   * Returns null if any middleware wants to skip execution
   */
  async executeBefore(ctx: ToolContext): Promise<ToolContext | null> {
    let currentCtx: ToolContext = ctx;

    for (const middleware of this.middlewares) {
      if (!middleware.beforeTool) continue;

      try {
        const result = await middleware.beforeTool(currentCtx);
        if (result === null) {
          // Middleware wants to skip execution
          return null;
        }
        currentCtx = result;
      } catch (error) {
        this.trackError(currentCtx, middleware.name, "beforeTool", error);
        // Continue with unmodified context on error (fail-safe)
      }
    }

    return currentCtx;
  }

  /**
   * Execute afterTool hooks for all middlewares (in reverse order)
   */
  async executeAfter(ctx: ToolContext, result: ToolResult): Promise<ToolResult> {
    let currentResult = result;

    // Execute in reverse order for afterTool
    const reversedMiddlewares = [...this.middlewares].reverse();

    for (const middleware of reversedMiddlewares) {
      if (!middleware.afterTool) continue;

      try {
        currentResult = await middleware.afterTool(ctx, currentResult);
      } catch (error) {
        this.trackError(ctx, middleware.name, "afterTool", error);
        // Continue with unmodified result on error (fail-safe)
      }
    }

    return currentResult;
  }

  /**
   * Execute onError hooks for all middlewares
   * Returns the first non-null result, or null if none handled the error
   */
  async executeOnError(ctx: ToolContext, error: Error): Promise<ToolResult | null> {
    for (const middleware of this.middlewares) {
      if (!middleware.onError) continue;

      try {
        const result = await middleware.onError(ctx, error);
        if (result !== null) {
          return result;
        }
      } catch (middlewareError) {
        this.trackError(ctx, middleware.name, "onError", middlewareError);
        // Continue to next middleware (fail-safe)
      }
    }

    return null;
  }

  /**
   * Get count of errors that occurred during middleware execution
   */
  getErrorCount(ctx: ToolContext): number {
    return ctx.middlewareErrors.length;
  }
}

/**
 * Create a new middleware chain instance
 */
export function createMiddlewareChain(): MiddlewareChain {
  return new MiddlewareChain();
}
