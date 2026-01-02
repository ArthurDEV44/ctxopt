/**
 * Pipeline Builder Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFluentPipelineAPI, Pipeline } from "./pipeline-builder.js";
import type { HostCallbacks } from "../types.js";
import type { PipelineContext, FileContent } from "./pipeline-builder.types.js";

function createMockCallbacks(): HostCallbacks {
  return {
    readFile: vi.fn((path: string) => `// Content of ${path}\nexport function test() {}\n`),
    fileExists: vi.fn(() => true),
    glob: vi.fn(() => ["file1.ts", "file2.ts", "file3.ts"]),
  };
}

function createMockContext(callbacks: HostCallbacks): PipelineContext {
  return {
    workingDir: "/test",
    callbacks,
  };
}

describe("Pipeline", () => {
  let callbacks: HostCallbacks;

  beforeEach(() => {
    callbacks = createMockCallbacks();
  });

  describe("create", () => {
    it("should create an empty pipeline", () => {
      const ctx = createMockContext(callbacks);
      const pipe = Pipeline.create(ctx);
      expect(pipe.getSteps()).toEqual([]);
    });

    it("should return error for empty pipeline build", () => {
      const ctx = createMockContext(callbacks);
      const result = Pipeline.create(ctx).build();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("EMPTY_PIPELINE");
      }
    });
  });

  describe("glob", () => {
    it("should return file list from glob pattern", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
        expect(result.value.stats.stepsExecuted).toBe(1);
      }
    });

    it("should call glob callback with pattern", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      api.from("src/**/*.tsx").build();

      expect(callbacks.glob).toHaveBeenCalledWith("src/**/*.tsx");
    });
  });

  describe("read", () => {
    it("should read file contents", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").read().build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toHaveLength(3);
        expect(result.value.data[0]).toHaveProperty("path", "file1.ts");
        expect(result.value.data[0]).toHaveProperty("content");
      }
    });

    it("should return error when file read fails", () => {
      (callbacks.readFile as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("File not found");
      });
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").read().build();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("READ_ERROR");
      }
    });
  });

  describe("filter", () => {
    it("should filter items by predicate", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
        "a.ts",
        "b.js",
        "c.ts",
        "d.tsx",
      ]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*")
        .filter((f: string) => f.endsWith(".ts"))
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["a.ts", "c.ts"]);
      }
    });

    it("should return error when predicate throws", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .filter(() => {
          throw new Error("Predicate error");
        })
        .build();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("FILTER_ERROR");
      }
    });
  });

  describe("map", () => {
    it("should transform items", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .map((f: string) => f.toUpperCase())
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["FILE1.TS", "FILE2.TS", "FILE3.TS"]);
      }
    });

    it("should return error when map function throws", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .map(() => {
          throw new Error("Map error");
        })
        .build();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("MAP_ERROR");
      }
    });
  });

  describe("flatMap", () => {
    it("should transform and flatten items", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue(["a", "b"]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*")
        .flatMap((f: string) => [f, f + "2"])
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["a", "a2", "b", "b2"]);
      }
    });
  });

  describe("take", () => {
    it("should take first N items", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").take(2).build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file1.ts", "file2.ts"]);
      }
    });
  });

  describe("skip", () => {
    it("should skip first N items", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").skip(1).build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file2.ts", "file3.ts"]);
      }
    });
  });

  describe("exclude", () => {
    it("should exclude files matching string pattern", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
        "src/file.ts",
        "node_modules/pkg/file.ts",
        "src/test.ts",
      ]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").exclude("node_modules").build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["src/file.ts", "src/test.ts"]);
      }
    });

    it("should exclude files matching regex pattern", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
        "file.ts",
        "file.test.ts",
        "file.spec.ts",
        "other.ts",
      ]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .exclude(/\.(test|spec)\.ts$/)
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file.ts", "other.ts"]);
      }
    });
  });

  describe("sort", () => {
    it("should sort items with default comparator", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue(["c.ts", "a.ts", "b.ts"]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").sort().build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["a.ts", "b.ts", "c.ts"]);
      }
    });

    it("should sort items with custom comparator", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue(["a.ts", "bb.ts", "ccc.ts"]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .sort((a: string, b: string) => b.length - a.length)
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["ccc.ts", "bb.ts", "a.ts"]);
      }
    });
  });

  describe("unique", () => {
    it("should remove duplicates", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
        "a.ts",
        "b.ts",
        "a.ts",
        "c.ts",
        "b.ts",
      ]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").unique().build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["a.ts", "b.ts", "c.ts"]);
      }
    });

    it("should remove duplicates with key function", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .read()
        .unique((f: FileContent) => f.path)
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toHaveLength(3);
      }
    });
  });

  describe("tap", () => {
    it("should execute side effect without modifying data", () => {
      const sideEffect = vi.fn();
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api.from("**/*.ts").tap(sideEffect).build();

      expect(result.isOk()).toBe(true);
      expect(sideEffect).toHaveBeenCalledWith(["file1.ts", "file2.ts", "file3.ts"]);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
      }
    });
  });

  describe("recover", () => {
    it("should recover from errors with fallback data", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("Glob failed");
      });
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .recover(() => ["fallback.ts"])
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["fallback.ts"]);
      }
    });
  });

  describe("chaining", () => {
    it("should support complex chains", () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
        "src/a.ts",
        "src/b.ts",
        "test/c.ts",
        "src/d.ts",
      ]);
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .filter((f: string) => f.startsWith("src/"))
        .take(2)
        .map((f: string) => ({ path: f, upper: f.toUpperCase() }))
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual([
          { path: "src/a.ts", upper: "SRC/A.TS" },
          { path: "src/b.ts", upper: "SRC/B.TS" },
        ]);
      }
    });
  });

  describe("immutability", () => {
    it("should not modify original pipeline", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const p1 = api.from("**/*.ts");
      const p2 = p1.filter((f: string) => f.includes("1"));
      const p3 = p1.filter((f: string) => f.includes("2"));

      expect(p1.getSteps()).toHaveLength(1);
      expect(p2.getSteps()).toHaveLength(2);
      expect(p3.getSteps()).toHaveLength(2);

      const r2 = p2.build();
      const r3 = p3.build();

      if (r2.isOk() && r3.isOk()) {
        expect(r2.value.data).toEqual(["file1.ts"]);
        expect(r3.value.data).toEqual(["file2.ts"]);
      }
    });
  });

  describe("stats", () => {
    it("should track execution statistics", () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = api
        .from("**/*.ts")
        .filter((f: string) => f.endsWith(".ts"))
        .take(2)
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stats.stepsExecuted).toBe(3);
        expect(result.value.stats.itemsProcessed).toBe(2);
        expect(result.value.stats.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.value.stats.errors).toEqual([]);
      }
    });
  });

  describe("fromData", () => {
    it("should create pipeline from existing data", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const data = [1, 2, 3, 4, 5];

      const result = api
        .fromData(data)
        .filter((n: number) => n > 2)
        .map((n: number) => n * 2)
        .build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual([6, 8, 10]);
      }
    });

    it("should allow empty pipeline with initial data", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const data = ["a", "b", "c"];

      const result = api.fromData(data).build();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["a", "b", "c"]);
      }
    });
  });

  describe("buildAsync", () => {
    it("should execute pipeline asynchronously", async () => {
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = await api
        .from("**/*.ts")
        .filter((f: string) => f.includes("1"))
        .buildAsync();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(["file1.ts"]);
      }
    });

    it("should return error for failed async execution", async () => {
      (callbacks.glob as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("Async glob failed");
      });
      const api = createFluentPipelineAPI("/test", callbacks);

      const result = await api.from("**/*.ts").buildAsync();

      expect(result.isErr()).toBe(true);
    });
  });
});

describe("PipelineFactory", () => {
  let callbacks: HostCallbacks;

  beforeEach(() => {
    callbacks = createMockCallbacks();
  });

  describe("create", () => {
    it("should create empty pipeline builder", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const pipe = api.create();

      expect(pipe.getSteps()).toEqual([]);
    });
  });

  describe("from", () => {
    it("should create pipeline with glob step", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const pipe = api.from("**/*.ts");

      expect(pipe.getSteps()).toHaveLength(1);
      expect(pipe.getSteps()[0]).toEqual({ type: "glob", pattern: "**/*.ts" });
    });
  });

  describe("presets", () => {
    it("should have codebaseOverview preset", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      expect(api.presets.codebaseOverview).toBeDefined();
    });

    it("should have findUsages preset", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      expect(api.presets.findUsages).toBeDefined();
    });

    it("should have analyzeDeps preset", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      expect(api.presets.analyzeDeps).toBeDefined();
    });

    it("should have findDeadCode preset", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      expect(api.presets.findDeadCode).toBeDefined();
    });

    it("should have getAllSignatures preset", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      expect(api.presets.getAllSignatures).toBeDefined();
    });
  });
});

describe("PipelinePresets", () => {
  let callbacks: HostCallbacks;

  beforeEach(() => {
    callbacks = createMockCallbacks();
    (callbacks.glob as ReturnType<typeof vi.fn>).mockReturnValue([
      "src/index.ts",
      "src/utils.ts",
    ]);
    (callbacks.readFile as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (path === "src/index.ts") {
        return `
import { helper } from './utils';
export function main() {
  return helper();
}
`;
      }
      return `
export function helper() {
  return 42;
}
`;
    });
  });

  describe("codebaseOverview", () => {
    it("should return codebase statistics", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const result = api.presets.codebaseOverview();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.totalFiles).toBe(2);
        expect(result.value.totalLines).toBeGreaterThan(0);
        expect(result.value.languages).toBeDefined();
      }
    });
  });

  describe("findUsages", () => {
    it("should find symbol usages", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const result = api.presets.findUsages("helper");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.symbol).toBe("helper");
        expect(result.value.totalReferences).toBeGreaterThan(0);
      }
    });
  });

  describe("getAllSignatures", () => {
    it("should return function signatures", () => {
      const api = createFluentPipelineAPI("/test", callbacks);
      const result = api.presets.getAllSignatures();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.functions.length).toBeGreaterThan(0);
        expect(result.value.totalCount).toBeGreaterThan(0);
      }
    });
  });
});
