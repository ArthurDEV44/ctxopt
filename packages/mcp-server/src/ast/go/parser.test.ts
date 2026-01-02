/**
 * Go Tree-sitter Parser Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  goTreeSitterParser,
  parseGoAsync,
  initGoParser,
} from "./parser.js";

// Sample Go code for testing
const SAMPLE_GO = `
package main

import (
	"fmt"
	"net/http"
	"encoding/json"
)

// MaxSize is the maximum allowed size
const MaxSize = 100

// Debug enables debug mode
var Debug = false

// User represents a user in the system
type User struct {
	Name string
	Age  int
}

// Greet returns a greeting message
func (u *User) Greet() string {
	return fmt.Sprintf("Hello, %s!", u.Name)
}

// FetchData fetches user data
func (u User) FetchData() map[string]interface{} {
	return map[string]interface{}{
		"name": u.Name,
		"age":  u.Age,
	}
}

// AdminUser is a user with admin privileges
type AdminUser struct {
	User
	Permissions []string
}

// HasPermission checks if admin has a permission
func (a *AdminUser) HasPermission(perm string) bool {
	for _, p := range a.Permissions {
		if p == perm {
			return true
		}
	}
	return false
}

// Handler defines HTTP handler interface
type Handler interface {
	ServeHTTP(w http.ResponseWriter, r *http.Request)
}

// CalculateSum calculates the sum of numbers
func CalculateSum(numbers []int) int {
	sum := 0
	for _, n := range numbers {
		sum += n
	}
	return sum
}

// privateFunc is unexported
func privateFunc() {
	// internal function
}

// main is the entry point
func main() {
	fmt.Println("Hello, World!")
}
`;

describe("Go Tree-sitter Parser", () => {
  beforeAll(async () => {
    await initGoParser();
  });

  describe("parseGoAsync", () => {
    it("should parse imports correctly", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      expect(structure.language).toBe("go");
      expect(structure.imports.length).toBeGreaterThanOrEqual(3);

      const importNames = structure.imports.map((i) => i.name);
      expect(importNames).toContain("fmt");
      expect(importNames).toContain("http");
      expect(importNames).toContain("json");
    });

    it("should parse functions correctly", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const funcNames = structure.functions.map((f) => f.name);
      expect(funcNames).toContain("CalculateSum");
      expect(funcNames).toContain("privateFunc");
      expect(funcNames).toContain("main");
    });

    it("should detect exported functions", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const calcSum = structure.functions.find((f) => f.name === "CalculateSum");
      expect(calcSum?.isExported).toBe(true);

      const privateFunc = structure.functions.find((f) => f.name === "privateFunc");
      expect(privateFunc?.isExported).toBe(false);
    });

    it("should parse methods correctly", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const methods = structure.functions.filter((f) => f.type === "method");
      expect(methods.length).toBeGreaterThanOrEqual(3);

      const methodNames = methods.map((m) => m.name);
      expect(methodNames).toContain("Greet");
      expect(methodNames).toContain("FetchData");
      expect(methodNames).toContain("HasPermission");
    });

    it("should track receiver type for methods", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const greet = structure.functions.find((f) => f.name === "Greet");
      expect(greet?.parent).toBe("User");

      const hasPermission = structure.functions.find((f) => f.name === "HasPermission");
      expect(hasPermission?.parent).toBe("AdminUser");
    });

    it("should parse structs as classes", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      expect(structure.classes.length).toBeGreaterThanOrEqual(2);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("User");
      expect(classNames).toContain("AdminUser");
    });

    it("should detect exported structs", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const user = structure.classes.find((c) => c.name === "User");
      expect(user?.isExported).toBe(true);
    });

    it("should parse interfaces", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      expect(structure.interfaces.length).toBeGreaterThanOrEqual(1);

      const interfaceNames = structure.interfaces.map((i) => i.name);
      expect(interfaceNames).toContain("Handler");
    });

    it("should extract doc comments", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const userStruct = structure.classes.find((c) => c.name === "User");
      expect(userStruct?.documentation).toContain("represents a user");

      const calcSum = structure.functions.find((f) => f.name === "CalculateSum");
      expect(calcSum?.documentation).toContain("calculates the sum");
    });

    it("should parse package-level variables", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("Debug");
    });

    it("should parse constants", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("MaxSize");
    });

    it("should return correct line numbers", async () => {
      const structure = await parseGoAsync(SAMPLE_GO);

      const userStruct = structure.classes.find((c) => c.name === "User");
      expect(userStruct?.startLine).toBeGreaterThan(0);
      expect(userStruct?.endLine).toBeGreaterThan(userStruct?.startLine ?? 0);
    });
  });

  describe("LanguageParser interface", () => {
    it("should implement parse() method", () => {
      const structure = goTreeSitterParser.parse(SAMPLE_GO);
      expect(structure).toBeDefined();
      expect(structure.language).toBe("go");
    });

    it("should implement extractElement() method", async () => {
      await initGoParser();

      const result = goTreeSitterParser.extractElement(
        SAMPLE_GO,
        { type: "function", name: "CalculateSum" },
        { includeImports: true, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("func CalculateSum");
      expect(result?.elements[0]?.name).toBe("CalculateSum");
    });

    it("should extract methods by name", async () => {
      await initGoParser();

      const result = goTreeSitterParser.extractElement(
        SAMPLE_GO,
        { type: "method", name: "Greet" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("func (u *User) Greet");
    });

    it("should implement searchElements() method", async () => {
      await initGoParser();

      const results = goTreeSitterParser.searchElements(SAMPLE_GO, "user");

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes("user"))).toBe(true);
    });

    it("should return null for non-existent elements", async () => {
      await initGoParser();

      const result = goTreeSitterParser.extractElement(
        SAMPLE_GO,
        { type: "function", name: "NonExistentFunc" },
        { includeImports: false, includeComments: false }
      );

      expect(result).toBeNull();
    });
  });

  describe("Go 1.18+ Generics", () => {
    it("should parse generic functions", async () => {
      const code = `
package main

// Map applies a function to each element
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}
`;
      const structure = await parseGoAsync(code);

      const mapFunc = structure.functions.find((f) => f.name === "Map");
      expect(mapFunc).toBeDefined();
      expect(mapFunc?.signature).toContain("Map");
      // Should include type parameters if tree-sitter supports them
      if (mapFunc?.signature?.includes("[")) {
        expect(mapFunc.signature).toContain("[T");
      }
    });

    it("should parse generic structs", async () => {
      const code = `
package main

// Container holds any value
type Container[T any] struct {
    Value T
}

// Pair holds two values
type Pair[K comparable, V any] struct {
    Key   K
    Value V
}
`;
      const structure = await parseGoAsync(code);

      const containerClass = structure.classes.find((c) => c.name === "Container");
      expect(containerClass).toBeDefined();

      const pairClass = structure.classes.find((c) => c.name === "Pair");
      expect(pairClass).toBeDefined();
    });

    it("should parse generic interfaces", async () => {
      const code = `
package main

// Iterator is a generic iterator
type Iterator[T any] interface {
    Next() (T, bool)
    Reset()
}

// Comparable for ordered types
type Ordered interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64 | ~string
}
`;
      const structure = await parseGoAsync(code);

      const iteratorInterface = structure.interfaces.find((i) => i.name === "Iterator");
      expect(iteratorInterface).toBeDefined();

      // Ordered might be treated as a type constraint
      const orderedType = structure.types.find((t) => t.name === "Ordered") ||
                          structure.interfaces.find((i) => i.name === "Ordered");
      expect(orderedType).toBeDefined();
    });

    it("should parse type constraints", async () => {
      const code = `
package main

// Number is a constraint for numeric types
type Number interface {
    ~int | ~float64
}

// Min returns the minimum of two ordered values
func Min[T Number](a, b T) T {
    if a < b {
        return a
    }
    return b
}
`;
      const structure = await parseGoAsync(code);

      const minFunc = structure.functions.find((f) => f.name === "Min");
      expect(minFunc).toBeDefined();
      expect(minFunc?.isExported).toBe(true);
    });

    it("should parse methods on generic types", async () => {
      const code = `
package main

type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}
`;
      const structure = await parseGoAsync(code);

      const pushMethod = structure.functions.find((f) => f.name === "Push");
      expect(pushMethod).toBeDefined();
      expect(pushMethod?.type).toBe("method");

      const popMethod = structure.functions.find((f) => f.name === "Pop");
      expect(popMethod).toBeDefined();
    });
  });

  describe("Enhanced Struct Parsing", () => {
    it("should parse struct with multiple fields", async () => {
      const code = `
package main

type Person struct {
    Name    string
    Age     int
    Email   string
    Address string
    Phone   string
}
`;
      const structure = await parseGoAsync(code);

      const personClass = structure.classes.find((c) => c.name === "Person");
      expect(personClass).toBeDefined();
      expect(personClass?.signature).toContain("struct");
      // Should show field summary
      if (personClass?.signature?.includes("{")) {
        expect(personClass.signature).toContain("Name");
      }
    });

    it("should parse struct with embedded types", async () => {
      const code = `
package main

type Base struct {
    ID int
}

type Extended struct {
    Base
    Name string
}
`;
      const structure = await parseGoAsync(code);

      const extendedClass = structure.classes.find((c) => c.name === "Extended");
      expect(extendedClass).toBeDefined();
    });

    it("should parse struct with tags", async () => {
      const code = `
package main

type User struct {
    ID        int    ` + "`json:\"id\" db:\"id\"`" + `
    Username  string ` + "`json:\"username\" validate:\"required\"`" + `
    CreatedAt string ` + "`json:\"created_at\"`" + `
}
`;
      const structure = await parseGoAsync(code);

      const userClass = structure.classes.find((c) => c.name === "User");
      expect(userClass).toBeDefined();
    });
  });

  describe("Enhanced Interface Parsing", () => {
    it("should parse interface with multiple methods", async () => {
      const code = `
package main

type Repository interface {
    Find(id int) (Entity, error)
    FindAll() ([]Entity, error)
    Save(entity Entity) error
    Delete(id int) error
    Update(entity Entity) error
}
`;
      const structure = await parseGoAsync(code);

      const repoInterface = structure.interfaces.find((i) => i.name === "Repository");
      expect(repoInterface).toBeDefined();
      expect(repoInterface?.signature).toContain("interface");
    });

    it("should parse interface with embedded interfaces", async () => {
      const code = `
package main

import "io"

type ReadWriteCloser interface {
    io.Reader
    io.Writer
    io.Closer
}
`;
      const structure = await parseGoAsync(code);

      // Interface might be parsed as interface or type depending on content
      const rwcInterface = structure.interfaces.find((i) => i.name === "ReadWriteCloser") ||
                           structure.types.find((t) => t.name === "ReadWriteCloser");
      expect(rwcInterface).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty content", async () => {
      const structure = await parseGoAsync("");
      expect(structure.language).toBe("go");
      expect(structure.totalLines).toBe(1);
      expect(structure.functions).toHaveLength(0);
    });

    it("should handle single import", async () => {
      const code = `
package main

import "fmt"

func main() {}
`;
      const structure = await parseGoAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle import with alias", async () => {
      const code = `
package main

import (
	f "fmt"
	. "strings"
	_ "database/sql"
)
`;
      const structure = await parseGoAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle type aliases", async () => {
      const code = `
package main

type MyInt int
type MyString = string
`;
      const structure = await parseGoAsync(code);
      expect(structure.types.length).toBeGreaterThanOrEqual(1);
    });
  });
});
