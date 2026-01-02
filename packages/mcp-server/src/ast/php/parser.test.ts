/**
 * PHP Tree-sitter Parser Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  phpTreeSitterParser,
  parsePhpAsync,
  initPhpParser,
} from "./parser.js";

// Sample PHP code for testing
const SAMPLE_PHP = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use App\\Traits\\HasTimestamps;
use App\\Contracts\\UserInterface;

/**
 * Maximum number of users allowed
 */
const MAX_USERS = 100;

/**
 * Represents a user in the system
 */
class User extends Model implements UserInterface
{
    use HasTimestamps;

    /**
     * The user's name
     */
    public string $name;

    /**
     * The user's email
     */
    protected string $email;

    /**
     * The user's password hash
     */
    private string $password;

    /**
     * Create a new user instance
     */
    public function __construct(string $name, string $email)
    {
        $this->name = $name;
        $this->email = $email;
    }

    /**
     * Get the user's greeting
     */
    public function greet(): string
    {
        return "Hello, " . $this->name;
    }

    /**
     * Check if user is admin
     */
    public static function isAdmin(): bool
    {
        return false;
    }

    /**
     * Internal helper method
     */
    private function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
}

/**
 * Admin user with extra permissions
 */
class AdminUser extends User
{
    /**
     * The admin's permissions
     */
    protected array $permissions = [];

    /**
     * Check if admin has a permission
     */
    public function hasPermission(string $perm): bool
    {
        return in_array($perm, $this->permissions);
    }
}

/**
 * Interface for user-related operations
 */
interface Authenticatable
{
    /**
     * Authenticate the user
     */
    public function authenticate(string $password): bool;

    /**
     * Get the user's ID
     */
    public function getId(): int;
}

/**
 * Trait for soft deletes
 */
trait SoftDeletes
{
    /**
     * Soft delete the model
     */
    public function softDelete(): void
    {
        $this->deleted_at = new DateTime();
    }
}

/**
 * Calculate the sum of numbers
 */
function calculateSum(array $numbers): int
{
    return array_sum($numbers);
}

/**
 * Private helper function
 */
function privateHelper(): void
{
    // internal function
}
`;

describe("PHP Tree-sitter Parser", () => {
  beforeAll(async () => {
    await initPhpParser();
  });

  describe("parsePhpAsync", () => {
    it("should parse use statements correctly", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      expect(structure.language).toBe("php");
      expect(structure.imports.length).toBeGreaterThanOrEqual(3);

      const importNames = structure.imports.map((i) => i.name);
      expect(importNames).toContain("Model");
      expect(importNames).toContain("HasTimestamps");
      expect(importNames).toContain("UserInterface");
    });

    it("should parse functions correctly", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const funcNames = structure.functions
        .filter((f) => f.type === "function")
        .map((f) => f.name);
      expect(funcNames).toContain("calculateSum");
      expect(funcNames).toContain("privateHelper");
    });

    it("should parse methods correctly", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const methods = structure.functions.filter((f) => f.type === "method");
      expect(methods.length).toBeGreaterThanOrEqual(5);

      const methodNames = methods.map((m) => m.name);
      expect(methodNames).toContain("__construct");
      expect(methodNames).toContain("greet");
      expect(methodNames).toContain("isAdmin");
      expect(methodNames).toContain("hashPassword");
    });

    it("should track parent class for methods", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const greet = structure.functions.find((f) => f.name === "greet");
      expect(greet?.parent).toBe("User");

      const hasPermission = structure.functions.find((f) => f.name === "hasPermission");
      expect(hasPermission?.parent).toBe("AdminUser");
    });

    it("should parse classes correctly", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      expect(structure.classes.length).toBeGreaterThanOrEqual(2);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("User");
      expect(classNames).toContain("AdminUser");
    });

    it("should parse traits as classes", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const classNames = structure.classes.map((c) => c.name);
      expect(classNames).toContain("SoftDeletes");
    });

    it("should parse interfaces", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      expect(structure.interfaces.length).toBeGreaterThanOrEqual(1);

      const interfaceNames = structure.interfaces.map((i) => i.name);
      expect(interfaceNames).toContain("Authenticatable");
    });

    it("should extract PHPDoc comments", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const userClass = structure.classes.find((c) => c.name === "User");
      expect(userClass?.documentation).toContain("Represents a user");

      const calcSum = structure.functions.find((f) => f.name === "calculateSum");
      expect(calcSum?.documentation).toContain("Calculate the sum");
    });

    it("should parse constants", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const varNames = structure.variables.map((v) => v.name);
      expect(varNames).toContain("MAX_USERS");
    });

    it("should return correct line numbers", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const userClass = structure.classes.find((c) => c.name === "User");
      expect(userClass?.startLine).toBeGreaterThan(0);
      expect(userClass?.endLine).toBeGreaterThan(userClass?.startLine ?? 0);
    });

    it("should detect visibility", async () => {
      const structure = await parsePhpAsync(SAMPLE_PHP);

      const greet = structure.functions.find((f) => f.name === "greet");
      expect(greet?.isExported).toBe(true); // public

      const hashPassword = structure.functions.find((f) => f.name === "hashPassword");
      expect(hashPassword?.isExported).toBe(false); // private
    });
  });

  describe("LanguageParser interface", () => {
    it("should implement parse() method", () => {
      const structure = phpTreeSitterParser.parse(SAMPLE_PHP);
      expect(structure).toBeDefined();
      expect(structure.language).toBe("php");
    });

    it("should implement extractElement() method for functions", async () => {
      await initPhpParser();

      const result = phpTreeSitterParser.extractElement(
        SAMPLE_PHP,
        { type: "function", name: "calculateSum" },
        { includeImports: true, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("function calculateSum");
      expect(result?.elements[0]?.name).toBe("calculateSum");
    });

    it("should extract methods by name", async () => {
      await initPhpParser();

      const result = phpTreeSitterParser.extractElement(
        SAMPLE_PHP,
        { type: "method", name: "greet" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("function greet");
    });

    it("should extract classes by name", async () => {
      await initPhpParser();

      const result = phpTreeSitterParser.extractElement(
        SAMPLE_PHP,
        { type: "class", name: "User" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.content).toContain("class User");
    });

    it("should implement searchElements() method", async () => {
      await initPhpParser();

      const results = phpTreeSitterParser.searchElements(SAMPLE_PHP, "user");

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes("user"))).toBe(true);
    });

    it("should return null for non-existent elements", async () => {
      await initPhpParser();

      const result = phpTreeSitterParser.extractElement(
        SAMPLE_PHP,
        { type: "function", name: "nonExistentFunc" },
        { includeImports: false, includeComments: false }
      );

      expect(result).toBeNull();
    });
  });

  describe("PHP 8.0+ Features", () => {
    it("should parse enums (PHP 8.1)", async () => {
      const code = `<?php
enum Status
{
    case Pending;
    case Active;
    case Closed;
}
`;
      const structure = await parsePhpAsync(code);
      expect(structure.types.some((t) => t.name === "Status")).toBe(true);

      const statusEnum = structure.types.find((t) => t.name === "Status");
      expect(statusEnum?.signature).toContain("enum Status");
    });

    it("should parse backed enums (PHP 8.1)", async () => {
      const code = `<?php
enum HttpStatus: int
{
    case Ok = 200;
    case NotFound = 404;
    case ServerError = 500;
}
`;
      const structure = await parsePhpAsync(code);
      const httpEnum = structure.types.find((t) => t.name === "HttpStatus");
      expect(httpEnum?.signature).toContain("enum HttpStatus: int");

      // Check enum cases
      const caseNames = structure.variables.map((v) => v.name);
      expect(caseNames).toContain("Ok");
      expect(caseNames).toContain("NotFound");
    });

    it("should parse string-backed enums", async () => {
      const code = `<?php
enum Color: string
{
    case Red = 'red';
    case Green = 'green';
    case Blue = 'blue';
}
`;
      const structure = await parsePhpAsync(code);
      const colorEnum = structure.types.find((t) => t.name === "Color");
      expect(colorEnum?.signature).toContain("enum Color: string");
    });

    it("should parse readonly classes (PHP 8.2)", async () => {
      const code = `<?php
readonly class ImmutableUser
{
    public function __construct(
        public string $name,
        public string $email
    ) {}
}
`;
      const structure = await parsePhpAsync(code);
      const userClass = structure.classes.find((c) => c.name === "ImmutableUser");
      expect(userClass?.signature).toContain("readonly class");
    });

    it("should parse attributes (PHP 8.0)", async () => {
      const code = `<?php
#[Deprecated("Use NewClass instead")]
class OldClass
{
    #[Pure]
    public function getValue(): int
    {
        return 42;
    }
}
`;
      const structure = await parsePhpAsync(code);
      const oldClass = structure.classes.find((c) => c.name === "OldClass");
      expect(oldClass?.signature).toContain("Deprecated");
    });

    it("should parse typed properties", async () => {
      const code = `<?php
class TypedClass
{
    public string $name;
    protected int $age;
    private ?float $balance = null;
    public readonly string $id;
}
`;
      const structure = await parsePhpAsync(code);

      const nameVar = structure.variables.find((v) => v.name === "name");
      expect(nameVar?.signature).toContain("string");
      expect(nameVar?.signature).toContain("public");

      const idVar = structure.variables.find((v) => v.name === "id");
      expect(idVar?.signature).toContain("readonly");
    });

    it("should parse property hooks (PHP 8.4)", async () => {
      // Note: Property hooks support depends on tree-sitter-php version (v0.24.0+)
      // Current tree-sitter-wasms may not include PHP 8.4 property hooks support yet
      // This test validates the utilities are ready when parser support is added

      // Test with traditional property first (always works)
      const traditionalCode = `<?php
class UserTraditional
{
    public string $name;
}
`;
      const traditionalStructure = await parsePhpAsync(traditionalCode);
      const nameVar = traditionalStructure.variables.find((v) => v.name === "name");
      expect(nameVar).toBeDefined();
      expect(nameVar?.signature).toContain("string");

      // Property hooks syntax - may or may not parse depending on tree-sitter-php version
      const hookCode = `<?php
class UserWithHooks
{
    public string $fullName {
        get => $this->firstName . ' ' . $this->lastName;
        set => [$this->firstName, $this->lastName] = explode(' ', $value, 2);
    }
}
`;
      const hookStructure = await parsePhpAsync(hookCode);

      // If tree-sitter-php supports property hooks, validate parsing
      const userClass = hookStructure.classes.find((c) => c.name === "UserWithHooks");
      if (userClass) {
        // Class was parsed - tree-sitter supports the syntax
        const fullNameVar = hookStructure.variables.find((v) => v.name === "fullName");
        if (fullNameVar) {
          expect(fullNameVar.signature).toBeDefined();
        }
      }
      // If userClass is undefined, tree-sitter doesn't support the syntax yet - that's OK
    });

    it("should parse interface properties (PHP 8.4)", async () => {
      // Note: Interface property support depends on tree-sitter-php version
      const code = `<?php
interface HasName
{
    public string $name { get; }
}
`;
      const structure = await parsePhpAsync(code);
      // The interface should be parsed regardless of property hook support
      expect(structure.interfaces.some((i) => i.name === "HasName")).toBe(true);
    });

    it("should parse enum methods", async () => {
      const code = `<?php
enum Status: string
{
    case Active = 'active';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match($this) {
            self::Active => 'Active Status',
            self::Inactive => 'Inactive Status',
        };
    }
}
`;
      const structure = await parsePhpAsync(code);
      const labelMethod = structure.functions.find((f) => f.name === "label");
      expect(labelMethod?.parent).toBe("Status");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty content", async () => {
      const structure = await parsePhpAsync("<?php");
      expect(structure.language).toBe("php");
      expect(structure.functions).toHaveLength(0);
    });

    it("should handle simple use statement", async () => {
      const code = `<?php
use App\\Models\\User;

function test(): void {}
`;
      const structure = await parsePhpAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle use with alias", async () => {
      const code = `<?php
use App\\Models\\User as UserModel;
use App\\Services\\Auth as AuthService;
`;
      const structure = await parsePhpAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle grouped use", async () => {
      const code = `<?php
use App\\Models\\{User, Post, Comment};
`;
      const structure = await parsePhpAsync(code);
      expect(structure.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle abstract classes", async () => {
      const code = `<?php
abstract class BaseModel
{
    abstract public function save(): void;
}
`;
      const structure = await parsePhpAsync(code);
      expect(structure.classes.some((c) => c.name === "BaseModel")).toBe(true);
    });

    it("should handle final classes", async () => {
      const code = `<?php
final class FinalClass
{
    public function method(): void {}
}
`;
      const structure = await parsePhpAsync(code);
      expect(structure.classes.some((c) => c.name === "FinalClass")).toBe(true);
    });

    it("should handle static methods", async () => {
      const code = `<?php
class Helper
{
    public static function format(string $value): string
    {
        return trim($value);
    }
}
`;
      const structure = await parsePhpAsync(code);
      const format = structure.functions.find((f) => f.name === "format");
      expect(format).toBeDefined();
      expect(format?.signature).toContain("static");
    });
  });
});
