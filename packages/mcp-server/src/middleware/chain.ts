/**
 * Middleware Chain
 *
 * Manages the execution of middleware before and after tool calls.
 */

import type { Middleware, ToolContext, ToolResult } from "./types.js";

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
        console.error(`[ctxopt] Middleware ${middleware.name} beforeTool error:`, error);
        // Continue with unmodified context on error
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
        console.error(`[ctxopt] Middleware ${middleware.name} afterTool error:`, error);
        // Continue with unmodified result on error
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
        console.error(`[ctxopt] Middleware ${middleware.name} onError error:`, middlewareError);
      }
    }

    return null;
  }
}

// Singleton instance for the default chain
let defaultChain: MiddlewareChain | null = null;

export function getMiddlewareChain(): MiddlewareChain {
  if (!defaultChain) {
    defaultChain = new MiddlewareChain();
  }
  return defaultChain;
}

export function createMiddlewareChain(): MiddlewareChain {
  return new MiddlewareChain();
}
