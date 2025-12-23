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
      expect(privateFunc?.isExported).toBe(false);
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
});
