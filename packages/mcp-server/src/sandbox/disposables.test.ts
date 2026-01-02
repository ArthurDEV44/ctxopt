import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTimeout,
  createDisposableSandbox,
  createExecutionResources,
  disposable,
  asyncDisposable,
} from "./disposables.js";

describe("Disposable Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not be expired initially", () => {
    const timer = createTimeout(5000);
    expect(timer.expired).toBe(false);
    timer[Symbol.dispose]();
  });

  it("should expire after timeout", () => {
    const timer = createTimeout(1000);
    expect(timer.expired).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(timer.expired).toBe(true);
    timer[Symbol.dispose]();
  });

  it("should clear timer on dispose", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const timer = createTimeout(5000);
    timer[Symbol.dispose]();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should clear timer via clear() method", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const timer = createTimeout(5000);
    timer.clear();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should auto-dispose with using keyword", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    {
      using _timer = createTimeout(5000);
      expect(_timer.expired).toBe(false);
    } // Auto-disposed here

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should dispose even if block throws", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    try {
      using _timer = createTimeout(5000);
      throw new Error("Test error");
    } catch {
      // Expected
    }

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe("Disposable Sandbox", () => {
  it("should create sandbox with correct options", async () => {
    await using sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    expect(sandbox.disposed).toBe(false);
    expect(typeof sandbox.execute).toBe("function");
  });

  it("should execute code successfully", async () => {
    await using sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    const result = await sandbox.execute("export default 1 + 1", {});

    expect(result.ok).toBe(true);
    expect(result.data).toBe(2);
  });

  it("should capture console logs", async () => {
    await using sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    const result = await sandbox.execute(
      `
      console.log("hello");
      console.warn("warning");
      export default "done";
    `,
      {}
    );

    expect(result.ok).toBe(true);
    expect(result.logs).toContain("hello");
    expect(result.logs.some((l) => l.includes("[WARN]"))).toBe(true);
  });

  it("should mark as disposed after using block", async () => {
    let sandboxRef: { disposed: boolean } | null = null;

    {
      await using sandbox = await createDisposableSandbox({
        timeout: 5000,
        memoryLimit: 128,
        workingDir: process.cwd(),
      });
      sandboxRef = sandbox;
      expect(sandbox.disposed).toBe(false);
    }

    expect(sandboxRef?.disposed).toBe(true);
  });

  it("should return error if executed after disposal", async () => {
    const sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    await sandbox[Symbol.asyncDispose]();

    const result = await sandbox.execute("export default 1", {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain("disposed");
  });

  it("should dispose on error in using block", async () => {
    let sandboxRef: { disposed: boolean } | null = null;

    try {
      await using sandbox = await createDisposableSandbox({
        timeout: 5000,
        memoryLimit: 128,
        workingDir: process.cwd(),
      });
      sandboxRef = sandbox;
      throw new Error("Simulated error");
    } catch {
      // Expected
    }

    expect(sandboxRef?.disposed).toBe(true);
  });

  it("should handle execution errors gracefully", async () => {
    await using sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    const result = await sandbox.execute("throw new Error('test error')", {});

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("Execution Resources (DisposableStack)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create both sandbox and timer", async () => {
    vi.useRealTimers(); // Need real timers for async sandbox creation

    await using resources = await createExecutionResources({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    expect(resources.sandbox).toBeDefined();
    expect(resources.timer).toBeDefined();
    expect(resources.sandbox.disposed).toBe(false);
    expect(resources.timer.expired).toBe(false);
  });

  it("should dispose all resources together", async () => {
    vi.useRealTimers();

    let sandboxRef: { disposed: boolean } | null = null;
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    {
      await using resources = await createExecutionResources({
        timeout: 5000,
        memoryLimit: 128,
        workingDir: process.cwd(),
      });
      sandboxRef = resources.sandbox;
    }

    expect(sandboxRef?.disposed).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe("Utility Disposables", () => {
  it("disposable() should call cleanup on dispose", () => {
    const cleanup = vi.fn();

    {
      using _ = disposable(cleanup);
    }

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("asyncDisposable() should call async cleanup", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);

    {
      await using _ = asyncDisposable(cleanup);
    }

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("disposable should work with using in try block", () => {
    const cleanup = vi.fn();

    try {
      using _ = disposable(cleanup);
      throw new Error("test");
    } catch {
      // Expected
    }

    expect(cleanup).toHaveBeenCalledOnce();
  });
});

describe("Memory Leak Detection", () => {
  it("should not accumulate timers on repeated executions", async () => {
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    const activeTimers = new Set<ReturnType<typeof setTimeout>>();

    // Track timer creation/cleanup
    global.setTimeout = ((fn: () => void, ms: number) => {
      const id = originalSetTimeout(fn, ms);
      activeTimers.add(id);
      return id;
    }) as typeof setTimeout;

    global.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
      activeTimers.delete(id);
      return originalClearTimeout(id);
    }) as typeof clearTimeout;

    // Run multiple iterations
    for (let i = 0; i < 10; i++) {
      using _timer = createTimeout(5000);
      // Simulate some work
      await new Promise((r) => originalSetTimeout(r, 1));
    }

    // Restore
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;

    // All timers should be cleaned up
    expect(activeTimers.size).toBe(0);
  });

  it("should handle disposal idempotently", async () => {
    const sandbox = await createDisposableSandbox({
      timeout: 5000,
      memoryLimit: 128,
      workingDir: process.cwd(),
    });

    // Multiple dispose calls should not throw
    await sandbox[Symbol.asyncDispose]();
    await sandbox[Symbol.asyncDispose]();
    await sandbox[Symbol.asyncDispose]();

    expect(sandbox.disposed).toBe(true);
  });

  it("should cleanup resources on timeout", async () => {
    let sandboxRef: { disposed: boolean } | null = null;

    {
      await using sandbox = await createDisposableSandbox({
        timeout: 100, // Very short timeout
        memoryLimit: 128,
        workingDir: process.cwd(),
      });
      sandboxRef = sandbox;

      // This should timeout
      const result = await sandbox.execute(
        `
        let i = 0;
        while(i < 1000000000) { i++; }
        export default i;
      `,
        {}
      );

      // Result should indicate failure (timeout or error)
      expect(result.ok).toBe(false);
    }

    // Sandbox should still be disposed
    expect(sandboxRef?.disposed).toBe(true);
  });
});
