/**
 * Python Tree-sitter Parser Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  pythonTreeSitterParser,
  parsePythonAsync,
  initPythonParser,
} from "./parser.js";
import {
  getDecorators,
  getTypeParameters,
  getReturnType,
  getParameterInfoList,
} from "./utils.js";

// Sample Python code for testing
const SAMPLE_PYTHON = `
"""Module docstring."""

import os
from typing import List, Optional
from dataclasses import dataclass

# Constants
MAX_SIZE = 100
DEBUG = True

@dataclass
class User:
    """A user class with name and age."""
    name: str
    age: int

    def greet(self) -> str:
        """Return a greeting message."""
        return f"Hello, {self.name}!"

    async def fetch_data(self) -> dict:
        """Fetch user data asynchronously."""
        return {"name": self.name, "age": self.age}


class AdminUser(User):
    """Admin user with extra permissions."""
    permissions: List[str]

    def has_permission(self, perm: str) -> bool:
        return perm in self.permissions


def calculate_sum(numbers: List[int]) -> int:
    """Calculate the sum of a list of numbers."""
    return sum(numbers)


async def fetch_users() -> List[User]:
    """Fetch all users from the database."""
    return []


def nested_function():
    def inner():
        pass
    return inner
`;

describe("Python Tree-sitter Parser", () => {
  beforeAll(async () => {
    await initPythonParser();
  });

  describe("parsePythonAsync", () => {
    it("should parse imports correctly", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      expect(structure.language).toBe("python");
      expect(structure.imports.length).toBeGreaterThanOrEqual(3);

      const importNames = structure.imports.map((i) => i.name);
      expect(importNames).toContain("os");
    });

    it("should parse functions correctly", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const funcNames = structure.functions.map((f) => f.name);
      expect(funcNames).toContain("calculate_sum");
      expect(funcNames).toContain("fetch_users");
      expect(funcNames).toContain("nested_function");
    });

    it("should detect async functions", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const fetchUsers = structure.functions.find((f) => f.name === "fetch_users");
      expect(fetchUsers).toBeDefined();
      expect(fetchUsers?.isAsync).toBe(true);

      const calculateSum = structure.functions.find((f) => f.name === "calculate_sum");
      expect(calculateSum?.isAsync).toBeFalsy();
    });

    it("should parse classes correctly", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      expect(structure.classes.length).toBeGreaterThanOrEqual(2);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("User");
      expect(classNames).toContain("AdminUser");
    });

    it("should extract docstrings", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON, { detailed: true });

      const userClass = structure.classes.find((c) => c.name === "User");
      expect(userClass?.documentation).toContain("user class");

      const calcSum = structure.functions.find((f) => f.name === "calculate_sum");
      expect(calcSum?.documentation).toContain("sum");
    });

    it("should parse methods inside classes", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const methods = structure.functions.filter((f) => f.type === "method");
      expect(methods.length).toBeGreaterThanOrEqual(3);

      const methodNames = methods.map((m) => m.name);
      expect(methodNames).toContain("greet");
      expect(methodNames).toContain("fetch_data");
      expect(methodNames).toContain("has_permission");
    });

    it("should track parent class for methods", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const greet = structure.functions.find((f) => f.name === "greet");
      expect(greet?.parent).toBe("User");

      const hasPermission = structure.functions.find((f) => f.name === "has_permission");
      expect(hasPermission?.parent).toBe("AdminUser");
    });

    it("should parse module-level variables", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("MAX_SIZE");
      expect(varNames).toContain("DEBUG");
    });

    it("should return correct line numbers", async () => {
      const structure = await parsePythonAsync(SAMPLE_PYTHON);

      const userClass = structure.classes.find((c) => c.name === "User");
      expect(userClass?.startLine).toBeGreaterThan(0);
      expect(userClass?.endLine).toBeGreaterThan(userClass?.startLine ?? 0);
    });
  });

  describe("LanguageParser interface", () => {
    it("should implement parse() method", () => {
      // Note: This will return empty structure on first call if parser not initialized
      const structure = pythonTreeSitterParser.parse(SAMPLE_PYTHON);
      expect(structure).toBeDefined();
      expect(structure.language).toBe("python");
    });

    it("should implement extractElement() method", async () => {
      await initPythonParser();

      const result = pythonTreeSitterParser.extractElement(
        SAMPLE_PYTHON,
        { type: "function", name: "calculate_sum" },
        { includeImports: true, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("def calculate_sum");
      expect(result?.elements[0]?.name).toBe("calculate_sum");
    });

    it("should implement searchElements() method", async () => {
      await initPythonParser();

      const results = pythonTreeSitterParser.searchElements(SAMPLE_PYTHON, "user");

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes("user"))).toBe(true);
    });

    it("should return null for non-existent elements", async () => {
      await initPythonParser();

      const result = pythonTreeSitterParser.extractElement(
        SAMPLE_PYTHON,
        { type: "function", name: "non_existent_function" },
        { includeImports: false, includeComments: false }
      );

      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty content", async () => {
      const structure = await parsePythonAsync("");
      expect(structure.language).toBe("python");
      expect(structure.totalLines).toBe(1);
      expect(structure.functions).toHaveLength(0);
    });

    it("should handle syntax errors gracefully", async () => {
      const invalidCode = `
def broken_function(
    # Missing closing parenthesis and body
`;
      const structure = await parsePythonAsync(invalidCode);
      expect(structure).toBeDefined();
      expect(structure.language).toBe("python");
    });

    it("should handle decorated functions", async () => {
      const code = `
@decorator
def decorated_func():
    pass

@decorator1
@decorator2
async def multi_decorated():
    pass
`;
      const structure = await parsePythonAsync(code);
      const funcNames = structure.functions.map((f) => f.name);
      expect(funcNames).toContain("decorated_func");
      expect(funcNames).toContain("multi_decorated");
    });
  });

  // Python 3.10+ Feature Tests
  describe("Python 3.10+ Features", () => {
    describe("Type Aliases (Python 3.12+)", () => {
      it("should parse type alias statements", async () => {
        const code = `
type Vector = list[float]
type Matrix = list[list[float]]
type Callback[T] = Callable[[T], None]
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        expect(structure.types.length).toBeGreaterThanOrEqual(2);
        const typeNames = structure.types.map((t) => t.name);
        expect(typeNames).toContain("Vector");
        expect(typeNames).toContain("Matrix");
      });

      it("should extract type alias value", async () => {
        const code = `type IntList = list[int]`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const intList = structure.types.find((t) => t.name === "IntList");
        expect(intList).toBeDefined();
        expect(intList?.typeAnnotation).toBe("list[int]");
      });
    });

    describe("Enhanced Decorator Extraction", () => {
      it("should extract decorators with arguments", async () => {
        const code = `
@dataclass(frozen=True)
class ImmutableData:
    value: int

@app.route("/api/users")
def get_users():
    pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        const immutableData = structure.classes.find((c) => c.name === "ImmutableData");
        expect(immutableData?.decorators).toBeDefined();
        expect(immutableData?.decorators?.some((d) => d.includes("dataclass"))).toBe(true);
      });

      it("should extract multiple decorators", async () => {
        const code = `
@staticmethod
@lru_cache(maxsize=128)
def cached_static():
    pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const func = structure.functions.find((f) => f.name === "cached_static");
        expect(func?.decorators?.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("Parameter Extraction", () => {
      it("should extract typed parameters", async () => {
        const code = `
def process(name: str, count: int, items: list[str]) -> None:
    pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const func = structure.functions.find((f) => f.name === "process");

        expect(func?.parameters).toBeDefined();
        expect(func?.parameters?.length).toBe(3);

        const nameParam = func?.parameters?.find((p) => p.name === "name");
        expect(nameParam?.type).toBe("str");

        const countParam = func?.parameters?.find((p) => p.name === "count");
        expect(countParam?.type).toBe("int");
      });

      it("should extract default parameters", async () => {
        const code = `
def greet(name: str = "World", verbose: bool = False) -> str:
    return f"Hello, {name}!"
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const func = structure.functions.find((f) => f.name === "greet");

        const nameParam = func?.parameters?.find((p) => p.name === "name");
        expect(nameParam?.type).toBe("str");
        expect(nameParam?.defaultValue).toBe('"World"');
        expect(nameParam?.isOptional).toBe(true);
      });

      it("should extract *args and **kwargs", async () => {
        const code = `
def flexible(*args, **kwargs) -> None:
    pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const func = structure.functions.find((f) => f.name === "flexible");

        expect(func?.parameters).toBeDefined();
        const argsParam = func?.parameters?.find((p) => p.name === "args");
        expect(argsParam?.isRest).toBe(true);

        const kwargsParam = func?.parameters?.find((p) => p.name === "kwargs");
        expect(kwargsParam?.isRest).toBe(true);
      });
    });

    describe("Return Type Extraction", () => {
      it("should extract simple return types", async () => {
        const code = `
def get_count() -> int:
    return 42
`;
        const structure = await parsePythonAsync(code, { detailed: true });
        const func = structure.functions.find((f) => f.name === "get_count");
        expect(func?.returnType).toBe("int");
      });

      it("should extract complex return types", async () => {
        const code = `
def get_mapping() -> dict[str, list[int]]:
    return {}

async def fetch_data() -> tuple[str, int, bool]:
    return ("", 0, False)
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        const getMapping = structure.functions.find((f) => f.name === "get_mapping");
        expect(getMapping?.returnType).toBe("dict[str, list[int]]");

        const fetchData = structure.functions.find((f) => f.name === "fetch_data");
        expect(fetchData?.returnType).toBe("tuple[str, int, bool]");
        expect(fetchData?.isAsync).toBe(true);
      });
    });

    describe("Async Features", () => {
      it("should correctly identify async methods", async () => {
        const code = `
class AsyncService:
    async def fetch(self) -> dict:
        pass

    def sync_method(self) -> None:
        pass

    async def process(self, data: str) -> bool:
        pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        const fetchMethod = structure.functions.find((f) => f.name === "fetch");
        expect(fetchMethod?.isAsync).toBe(true);

        const syncMethod = structure.functions.find((f) => f.name === "sync_method");
        expect(syncMethod?.isAsync).toBeFalsy();

        const processMethod = structure.functions.find((f) => f.name === "process");
        expect(processMethod?.isAsync).toBe(true);
        expect(processMethod?.parent).toBe("AsyncService");
      });
    });

    describe("Variable Type Annotations", () => {
      it("should extract variable type annotations", async () => {
        const code = `
count: int = 0
name: str = "test"
items: list[str] = []
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        expect(structure.variables.length).toBeGreaterThanOrEqual(3);
        const varNames = structure.variables.map((v) => v.name);
        expect(varNames).toContain("count");
        expect(varNames).toContain("name");
        expect(varNames).toContain("items");
      });
    });

    describe("Generic Functions and Classes (Python 3.12+)", () => {
      it("should parse generic function type parameters", async () => {
        const code = `
def first[T](items: list[T]) -> T:
    return items[0]

def pair[K, V](key: K, value: V) -> tuple[K, V]:
    return (key, value)
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        const firstFunc = structure.functions.find((f) => f.name === "first");
        expect(firstFunc?.generics).toBeDefined();
        expect(firstFunc?.generics).toContain("T");

        const pairFunc = structure.functions.find((f) => f.name === "pair");
        expect(pairFunc?.generics).toBeDefined();
        expect(pairFunc?.generics?.length).toBe(2);
      });

      it("should parse generic class type parameters", async () => {
        const code = `
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

class Mapping[K, V]:
    pass
`;
        const structure = await parsePythonAsync(code, { detailed: true });

        const stackClass = structure.classes.find((c) => c.name === "Stack");
        expect(stackClass?.generics).toBeDefined();
        expect(stackClass?.generics).toContain("T");

        const mappingClass = structure.classes.find((c) => c.name === "Mapping");
        expect(mappingClass?.generics).toBeDefined();
        expect(mappingClass?.generics?.length).toBe(2);
      });
    });
  });
});
