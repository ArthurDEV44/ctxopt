/**
 * Rust Tree-sitter Parser Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  rustTreeSitterParser,
  parseRustAsync,
  initRustParser,
} from "./parser.js";

// Sample Rust code for testing
const SAMPLE_RUST = `
use std::collections::HashMap;
use std::io::{self, Read, Write};
use serde::{Deserialize, Serialize};

/// Maximum allowed size for the buffer
pub const MAX_SIZE: usize = 1024;

/// Debug mode flag
static DEBUG: bool = false;

/// Represents a user in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub name: String,
    pub age: u32,
}

impl User {
    /// Creates a new user with the given name and age
    pub fn new(name: String, age: u32) -> Self {
        Self { name, age }
    }

    /// Returns a greeting message
    pub fn greet(&self) -> String {
        format!("Hello, {}!", self.name)
    }

    /// Fetches user data as a map
    async fn fetch_data(&self) -> HashMap<String, String> {
        let mut data = HashMap::new();
        data.insert("name".to_string(), self.name.clone());
        data
    }
}

/// Admin user with additional permissions
pub struct AdminUser {
    user: User,
    permissions: Vec<String>,
}

impl AdminUser {
    /// Checks if the admin has a specific permission
    pub fn has_permission(&self, perm: &str) -> bool {
        self.permissions.iter().any(|p| p == perm)
    }
}

/// Represents different error types
pub enum AppError {
    NotFound,
    Unauthorized,
    InternalError(String),
}

/// Handler trait for processing requests
pub trait Handler {
    /// Handles the incoming request
    fn handle(&self, request: &str) -> Result<String, AppError>;

    /// Gets the handler name
    fn name(&self) -> &str;
}

/// Calculates the sum of numbers
pub fn calculate_sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

/// Private function for internal use
fn private_func() {
    // internal function
}

/// Async function that processes data
pub async fn process_data(data: &str) -> Result<String, io::Error> {
    Ok(data.to_uppercase())
}

/// Type alias for a result type
pub type AppResult<T> = Result<T, AppError>;

/// Module for utilities
mod utils {
    pub fn helper() {}
}
`;

describe("Rust Tree-sitter Parser", () => {
  beforeAll(async () => {
    await initRustParser();
  });

  describe("parseRustAsync", () => {
    it("should parse use statements correctly", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      expect(structure.language).toBe("rust");
      expect(structure.imports.length).toBeGreaterThanOrEqual(3);

      const importNames = structure.imports.map((i) => i.name);
      expect(importNames).toContain("HashMap");
      expect(importNames.some((n) => n.includes("Read") || n.includes("Write"))).toBe(true);
    });

    it("should parse functions correctly", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const funcNames = structure.functions.map((f) => f.name);
      expect(funcNames).toContain("calculate_sum");
      expect(funcNames).toContain("private_func");
      expect(funcNames).toContain("process_data");
    });

    it("should detect exported functions (pub)", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const calcSum = structure.functions.find((f) => f.name === "calculate_sum");
      expect(calcSum?.isExported).toBe(true);

      const privateFunc = structure.functions.find((f) => f.name === "private_func");
      expect(privateFunc?.isExported).toBeFalsy();
    });

    it("should detect async functions", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const processData = structure.functions.find((f) => f.name === "process_data");
      expect(processData?.isAsync).toBe(true);

      const calcSum = structure.functions.find((f) => f.name === "calculate_sum");
      expect(calcSum?.isAsync).toBeFalsy();
    });

    it("should parse methods from impl blocks", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const methods = structure.functions.filter((f) => f.type === "method");
      expect(methods.length).toBeGreaterThanOrEqual(4);

      const methodNames = methods.map((m) => m.name);
      expect(methodNames).toContain("new");
      expect(methodNames).toContain("greet");
      expect(methodNames).toContain("fetch_data");
      expect(methodNames).toContain("has_permission");
    });

    it("should track parent type for methods", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const greet = structure.functions.find((f) => f.name === "greet");
      expect(greet?.parent).toBe("User");

      const hasPermission = structure.functions.find((f) => f.name === "has_permission");
      expect(hasPermission?.parent).toBe("AdminUser");
    });

    it("should parse structs as classes", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      expect(structure.classes.length).toBeGreaterThanOrEqual(2);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("User");
      expect(classNames).toContain("AdminUser");
    });

    it("should parse enums as classes", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("AppError");
    });

    it("should detect exported structs (pub)", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const user = structure.classes.find((c) => c.name === "User");
      expect(user?.isExported).toBe(true);
    });

    it("should parse traits as interfaces", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      expect(structure.interfaces.length).toBeGreaterThanOrEqual(1);

      const interfaceNames = structure.interfaces.map((i) => i.name);
      expect(interfaceNames).toContain("Handler");
    });

    it("should extract doc comments", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const userStruct = structure.classes.find((c) => c.name === "User");
      expect(userStruct?.documentation).toContain("Represents a user");

      const calcSum = structure.functions.find((f) => f.name === "calculate_sum");
      expect(calcSum?.documentation).toContain("Calculates the sum");
    });

    it("should parse constants", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("MAX_SIZE");
    });

    it("should parse static variables", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("DEBUG");
    });

    it("should parse type aliases", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const typeNames = structure.types.map((t) => t.name);
      expect(typeNames).toContain("AppResult");
    });

    it("should return correct line numbers", async () => {
      const structure = await parseRustAsync(SAMPLE_RUST);

      const userStruct = structure.classes.find((c) => c.name === "User");
      expect(userStruct?.startLine).toBeGreaterThan(0);
      expect(userStruct?.endLine).toBeGreaterThan(userStruct?.startLine ?? 0);
    });
  });

  describe("LanguageParser interface", () => {
    it("should implement parse() method", () => {
      const structure = rustTreeSitterParser.parse(SAMPLE_RUST);
      expect(structure).toBeDefined();
      expect(structure.language).toBe("rust");
    });

    it("should implement extractElement() method for functions", async () => {
      await initRustParser();

      const result = rustTreeSitterParser.extractElement(
        SAMPLE_RUST,
        { type: "function", name: "calculate_sum" },
        { includeImports: true, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("fn calculate_sum");
      expect(result?.elements[0]?.name).toBe("calculate_sum");
    });

    it("should extract methods by name", async () => {
      await initRustParser();

      const result = rustTreeSitterParser.extractElement(
        SAMPLE_RUST,
        { type: "method", name: "greet" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("fn greet");
    });

    it("should extract structs by name", async () => {
      await initRustParser();

      const result = rustTreeSitterParser.extractElement(
        SAMPLE_RUST,
        { type: "class", name: "User" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("pub struct User");
    });

    it("should implement searchElements() method", async () => {
      await initRustParser();

      const results = rustTreeSitterParser.searchElements(SAMPLE_RUST, "user");

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes("user"))).toBe(true);
    });

    it("should return null for non-existent elements", async () => {
      await initRustParser();

      const result = rustTreeSitterParser.extractElement(
        SAMPLE_RUST,
        { type: "function", name: "non_existent_func" },
        { includeImports: false, includeComments: false }
      );

      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty content", async () => {
      const structure = await parseRustAsync("");
      expect(structure.language).toBe("rust");
      expect(structure.totalLines).toBe(1);
      expect(structure.functions).toHaveLength(0);
    });

    it("should handle simple use statement", async () => {
      const code = `
use std::io;

fn main() {}
`;
      const structure = await parseRustAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle use with as alias", async () => {
      const code = `
use std::collections::HashMap as Map;
use std::io::Result as IoResult;
`;
      const structure = await parseRustAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle glob imports", async () => {
      const code = `
use std::collections::*;
`;
      const structure = await parseRustAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle nested modules in use", async () => {
      const code = `
use std::{
    collections::{HashMap, HashSet},
    io::{self, Read, Write},
};
`;
      const structure = await parseRustAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle impl for trait", async () => {
      const code = `
pub trait Greet {
    fn greet(&self) -> String;
}

pub struct Person {
    name: String,
}

impl Greet for Person {
    fn greet(&self) -> String {
        format!("Hello, {}!", self.name)
    }
}
`;
      const structure = await parseRustAsync(code);
      expect(structure.interfaces.length).toBeGreaterThanOrEqual(1);
      expect(structure.classes.length).toBeGreaterThanOrEqual(1);
      expect(structure.functions.filter((f) => f.type === "method").length).toBeGreaterThanOrEqual(1);
    });

    it("should handle generic types", async () => {
      const code = `
pub struct Container<T> {
    value: T,
}

impl<T> Container<T> {
    pub fn new(value: T) -> Self {
        Self { value }
    }
}
`;
      const structure = await parseRustAsync(code);
      expect(structure.classes.some((c) => c.name === "Container")).toBe(true);
    });

    it("should handle async methods", async () => {
      const code = `
pub struct Client {}

impl Client {
    pub async fn fetch(&self) -> Result<String, Error> {
        Ok("data".to_string())
    }
}
`;
      const structure = await parseRustAsync(code);
      const fetchMethod = structure.functions.find((f) => f.name === "fetch");
      expect(fetchMethod?.isAsync).toBe(true);
    });
  });

  // Modern Rust Features Tests (2024-2025)
  describe("Modern Rust Features", () => {
    describe("Parameter Extraction", () => {
      it("should extract typed parameters", async () => {
        const code = `
pub fn process(name: String, count: usize, data: &[u8]) -> Result<(), Error> {
    Ok(())
}
`;
        const structure = await parseRustAsync(code);
        const func = structure.functions.find((f) => f.name === "process");

        expect(func?.parameters).toBeDefined();
        expect(func?.parameters?.length).toBe(3);

        const nameParam = func?.parameters?.find((p) => p.name === "name");
        expect(nameParam?.type).toBe("String");

        const countParam = func?.parameters?.find((p) => p.name === "count");
        expect(countParam?.type).toBe("usize");
      });

      it("should extract self parameters", async () => {
        const code = `
impl MyStruct {
    pub fn method(&self, value: i32) -> i32 {
        value
    }

    pub fn method_mut(&mut self, value: i32) {
        self.value = value;
    }
}
`;
        const structure = await parseRustAsync(code);

        const method = structure.functions.find((f) => f.name === "method");
        expect(method?.parameters).toBeDefined();
        const selfParam = method?.parameters?.find((p) => p.name === "self");
        expect(selfParam?.type).toBe("&Self");

        const methodMut = structure.functions.find((f) => f.name === "method_mut");
        const selfMutParam = methodMut?.parameters?.find((p) => p.name === "self");
        expect(selfMutParam?.type).toBe("&mut Self");
      });
    });

    describe("Return Type Extraction", () => {
      it("should extract simple return types", async () => {
        const code = `
pub fn get_count() -> usize {
    42
}
`;
        const structure = await parseRustAsync(code);
        const func = structure.functions.find((f) => f.name === "get_count");
        expect(func?.returnType).toBe("usize");
      });

      it("should extract complex return types", async () => {
        const code = `
pub fn get_mapping() -> HashMap<String, Vec<i32>> {
    HashMap::new()
}

pub async fn fetch_data() -> Result<(String, i32), io::Error> {
    Ok(("".to_string(), 0))
}
`;
        const structure = await parseRustAsync(code);

        const getMapping = structure.functions.find((f) => f.name === "get_mapping");
        expect(getMapping?.returnType).toBe("HashMap<String, Vec<i32>>");

        const fetchData = structure.functions.find((f) => f.name === "fetch_data");
        expect(fetchData?.returnType).toBe("Result<(String, i32), io::Error>");
        expect(fetchData?.isAsync).toBe(true);
      });
    });

    describe("Generics and Lifetimes", () => {
      it("should extract generic type parameters", async () => {
        const code = `
pub fn first<T>(items: &[T]) -> Option<&T> {
    items.first()
}

pub fn pair<K, V>(key: K, value: V) -> (K, V) {
    (key, value)
}
`;
        const structure = await parseRustAsync(code);

        const firstFunc = structure.functions.find((f) => f.name === "first");
        expect(firstFunc?.generics).toBeDefined();
        expect(firstFunc?.generics).toContain("T");

        const pairFunc = structure.functions.find((f) => f.name === "pair");
        expect(pairFunc?.generics).toBeDefined();
        expect(pairFunc?.generics?.length).toBe(2);
      });

      it("should extract lifetimes from functions", async () => {
        const code = `
pub fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
`;
        const structure = await parseRustAsync(code);
        const func = structure.functions.find((f) => f.name === "longest");
        expect(func?.generics).toBeDefined();
        expect(func?.generics?.some((g) => g.includes("'a"))).toBe(true);
      });

      it("should extract generics from structs", async () => {
        const code = `
pub struct Container<T> {
    value: T,
}

pub struct Pair<K, V> {
    key: K,
    value: V,
}
`;
        const structure = await parseRustAsync(code);

        const container = structure.classes.find((c) => c.name === "Container");
        expect(container?.generics).toBeDefined();
        expect(container?.generics).toContain("T");

        const pair = structure.classes.find((c) => c.name === "Pair");
        expect(pair?.generics?.length).toBe(2);
      });
    });

    describe("Derives and Decorators", () => {
      it("should parse structs with derive macros", async () => {
        const code = `
#[derive(Debug, Clone, PartialEq)]
pub struct Data {
    value: i32,
}
`;
        const structure = await parseRustAsync(code);
        const data = structure.classes.find((c) => c.name === "Data");
        expect(data).toBeDefined();
        expect(data?.isExported).toBe(true);
        // The signature should contain the struct definition
        expect(data?.signature).toContain("struct Data");
      });

      it("should parse structs with multiple attributes", async () => {
        const code = `
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    status_code: u16,
}
`;
        const structure = await parseRustAsync(code);
        const apiResponse = structure.classes.find((c) => c.name === "ApiResponse");
        expect(apiResponse).toBeDefined();
        expect(apiResponse?.isExported).toBe(true);
      });
    });

    describe("Unsafe Code", () => {
      it("should detect unsafe functions", async () => {
        const code = `
pub unsafe fn dangerous_operation(ptr: *mut i32) {
    *ptr = 42;
}
`;
        const structure = await parseRustAsync(code);
        const func = structure.functions.find((f) => f.name === "dangerous_operation");
        expect(func).toBeDefined();
        expect(func?.signature).toContain("unsafe");
      });

      it("should detect unsafe traits", async () => {
        const code = `
pub unsafe trait UnsafeMarker {
    fn check(&self) -> bool;
}
`;
        const structure = await parseRustAsync(code);
        const trait = structure.interfaces.find((i) => i.name === "UnsafeMarker");
        expect(trait).toBeDefined();
        expect(trait?.signature).toContain("unsafe");
      });
    });

    describe("Const Generics", () => {
      it("should parse const generic structs", async () => {
        const code = `
pub struct Array<T, const N: usize> {
    data: [T; N],
}
`;
        const structure = await parseRustAsync(code);
        const arrayStruct = structure.classes.find((c) => c.name === "Array");
        expect(arrayStruct).toBeDefined();
        expect(arrayStruct?.signature).toContain("const N");
      });
    });

    describe("Async Features", () => {
      it("should parse async functions with impl Trait return", async () => {
        const code = `
pub async fn fetch_all() -> impl Stream<Item = Result<Data, Error>> {
    stream::empty()
}
`;
        const structure = await parseRustAsync(code);
        const func = structure.functions.find((f) => f.name === "fetch_all");
        expect(func?.isAsync).toBe(true);
        expect(func?.returnType).toContain("impl Stream");
      });
    });
  });
});
