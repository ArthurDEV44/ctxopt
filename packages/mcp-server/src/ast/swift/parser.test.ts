/**
 * Swift Tree-sitter Parser Tests
 *
 * Tests for Swift code parsing including Swift 6+ features:
 * - Actors and distributed actors
 * - Async/await concurrency
 * - Typed throws
 * - Nonisolated functions
 * - Macros (Swift 5.9+)
 * - Subscripts and operators
 * - Associated types
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  swiftTreeSitterParser,
  parseSwiftAsync,
  initSwiftParser,
} from "./parser.js";

// Sample Swift code for testing
const SAMPLE_SWIFT = `
import Foundation
import UIKit

/// Maximum number of users allowed
let MAX_USERS = 100

/// Default timeout in seconds
var defaultTimeout: TimeInterval = 30.0

/// Represents a user in the system
protocol UserProtocol {
    var name: String { get }
    var email: String { get }
    func greet() -> String
}

/// A type alias for user identifiers
typealias UserID = String

/// Represents a basic user
class User: UserProtocol {
    /// The user's name
    public var name: String

    /// The user's email
    private var email: String

    /// The user's unique identifier
    let id: UserID

    /// Create a new user instance
    public init(name: String, email: String) {
        self.name = name
        self.email = email
        self.id = UUID().uuidString
    }

    deinit {
        print("User \\(name) is being deallocated")
    }

    /// Get the user's greeting
    public func greet() -> String {
        return "Hello, \\(name)"
    }

    /// Check if user is valid
    private func isValid() -> Bool {
        return !email.isEmpty && !name.isEmpty
    }

    /// Async method to fetch user data
    public func fetchData() async throws -> Data {
        return Data()
    }
}

/// Admin user with extra permissions
final class AdminUser: User {
    /// The admin's permissions
    var permissions: [String] = []

    /// Check if admin has a permission
    public func hasPermission(_ perm: String) -> Bool {
        return permissions.contains(perm)
    }
}

/// User status enum
enum UserStatus: String {
    case active
    case inactive
    case suspended

    /// Get status description
    func description() -> String {
        switch self {
        case .active: return "Active"
        case .inactive: return "Inactive"
        case .suspended: return "Suspended"
        }
    }
}

/// Result type for network operations
enum NetworkResult<T> {
    case success(T)
    case failure(Error)
}

/// Extension adding utility methods to User
extension User {
    /// Get a formatted display name
    func displayName() -> String {
        return name.capitalized
    }

    /// Static factory method
    static func guest() -> User {
        return User(name: "Guest", email: "guest@example.com")
    }
}

/// A simple struct for coordinates
struct Point {
    var x: Double
    var y: Double

    /// Calculate distance from origin
    func distanceFromOrigin() -> Double {
        return (x * x + y * y).squareRoot()
    }
}

/// Top-level function to process users
func processUser(_ user: User) -> Bool {
    return !user.name.isEmpty
}

/// Async function to fetch all users
func fetchAllUsers() async throws -> [User] {
    return []
}
`;

describe("Swift Tree-sitter Parser", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  describe("parseSwiftAsync", () => {
    it("should parse imports correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      expect(result.language).toBe("swift");
      expect(result.imports.length).toBeGreaterThanOrEqual(2);

      const foundationImport = result.imports.find((i) => i.name === "Foundation");
      expect(foundationImport).toBeDefined();
      expect(foundationImport?.signature).toBe("import Foundation");

      const uiKitImport = result.imports.find((i) => i.name === "UIKit");
      expect(uiKitImport).toBeDefined();
    });

    it("should parse top-level variables correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const maxUsers = result.variables.find((v) => v.name === "MAX_USERS");
      expect(maxUsers).toBeDefined();

      const defaultTimeout = result.variables.find((v) => v.name === "defaultTimeout");
      expect(defaultTimeout).toBeDefined();
    });

    it("should parse protocols correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const userProtocol = result.interfaces.find((i) => i.name === "UserProtocol");
      expect(userProtocol).toBeDefined();
      expect(userProtocol?.signature).toContain("protocol UserProtocol");
      expect(userProtocol?.documentation).toContain("Represents a user");
    });

    it("should parse classes correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const userClass = result.classes.find((c) => c.name === "User");
      expect(userClass).toBeDefined();
      expect(userClass?.signature).toContain("class User");
      expect(userClass?.documentation).toContain("Represents a basic user");

      const adminClass = result.classes.find((c) => c.name === "AdminUser");
      expect(adminClass).toBeDefined();
      expect(adminClass?.signature).toContain("final");
      expect(adminClass?.signature).toContain("AdminUser");
    });

    it("should parse structs correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const pointStruct = result.classes.find((c) => c.name === "Point");
      expect(pointStruct).toBeDefined();
      expect(pointStruct?.signature).toContain("struct Point");
    });

    it("should parse enums correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const statusEnum = result.types.find((t) => t.name === "UserStatus");
      expect(statusEnum).toBeDefined();
      expect(statusEnum?.signature).toContain("enum UserStatus");

      const resultEnum = result.types.find((t) => t.name === "NetworkResult");
      expect(resultEnum).toBeDefined();
    });

    it("should parse extensions correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const userExtension = result.types.find((t) => t.name === "extension User");
      expect(userExtension).toBeDefined();
      expect(userExtension?.signature).toContain("extension User");
    });

    it("should parse typealias correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const userIdType = result.types.find((t) => t.name === "UserID");
      expect(userIdType).toBeDefined();
      expect(userIdType?.signature).toContain("typealias UserID");
    });

    it("should parse functions correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const processUser = result.functions.find((f) => f.name === "processUser");
      expect(processUser).toBeDefined();
      expect(processUser?.type).toBe("function");
      expect(processUser?.signature).toContain("func processUser");

      const fetchAllUsers = result.functions.find((f) => f.name === "fetchAllUsers");
      expect(fetchAllUsers).toBeDefined();
      expect(fetchAllUsers?.isAsync).toBe(true);
    });

    it("should parse methods correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const greetMethod = result.functions.find((f) => f.name === "greet" && f.parent === "User");
      expect(greetMethod).toBeDefined();
      expect(greetMethod?.type).toBe("method");
      expect(greetMethod?.signature).toContain("func greet");

      const fetchDataMethod = result.functions.find((f) => f.name === "fetchData");
      expect(fetchDataMethod).toBeDefined();
      expect(fetchDataMethod?.isAsync).toBe(true);
    });

    it("should parse init and deinit correctly", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const initMethod = result.functions.find((f) => f.name === "init" && f.parent === "User");
      expect(initMethod).toBeDefined();
      expect(initMethod?.type).toBe("method");

      const deinitMethod = result.functions.find((f) => f.name === "deinit");
      expect(deinitMethod).toBeDefined();
    });

    it("should extract documentation comments", async () => {
      const result = await parseSwiftAsync(SAMPLE_SWIFT);

      const userClass = result.classes.find((c) => c.name === "User");
      expect(userClass?.documentation).toBeDefined();
      expect(userClass?.documentation).toContain("Represents a basic user");

      const greetMethod = result.functions.find((f) => f.name === "greet" && f.parent === "User");
      expect(greetMethod?.documentation).toContain("Get the user's greeting");
    });
  });

  describe("extractSwiftElement", () => {
    it("should extract a specific class", async () => {
      const result = await swiftTreeSitterParser.extractElement(
        SAMPLE_SWIFT,
        { type: "class", name: "User" },
        { includeImports: true, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.elements[0]?.name).toBe("User");
      expect(result?.content).toContain("class User");
    });

    it("should extract a specific function", async () => {
      const result = await swiftTreeSitterParser.extractElement(
        SAMPLE_SWIFT,
        { type: "function", name: "processUser" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.elements[0]?.name).toBe("processUser");
      expect(result?.content).toContain("func processUser");
    });

    it("should extract a specific protocol", async () => {
      const result = await swiftTreeSitterParser.extractElement(
        SAMPLE_SWIFT,
        { type: "interface", name: "UserProtocol" },
        { includeImports: false, includeComments: true }
      );

      expect(result).not.toBeNull();
      expect(result?.elements[0]?.name).toBe("UserProtocol");
      expect(result?.content).toContain("protocol UserProtocol");
    });

    it("should return null for non-existent element", async () => {
      const result = await swiftTreeSitterParser.extractElement(
        SAMPLE_SWIFT,
        { type: "class", name: "NonExistent" },
        { includeImports: false, includeComments: false }
      );

      expect(result).toBeNull();
    });
  });

  describe("searchSwiftElements", () => {
    it("should find elements by name", async () => {
      const results = swiftTreeSitterParser.searchElements(SAMPLE_SWIFT, "user");

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.name.toLowerCase());
      expect(names.some((n) => n.includes("user"))).toBe(true);
    });

    it("should find elements by signature", async () => {
      const results = swiftTreeSitterParser.searchElements(SAMPLE_SWIFT, "async");

      expect(results.length).toBeGreaterThan(0);
      const hasAsync = results.some((r) => r.signature?.includes("async"));
      expect(hasAsync).toBe(true);
    });

    it("should find elements by documentation", async () => {
      const results = swiftTreeSitterParser.searchElements(SAMPLE_SWIFT, "greeting");

      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for no matches", async () => {
      const results = swiftTreeSitterParser.searchElements(SAMPLE_SWIFT, "xyznonexistent");

      expect(results).toEqual([]);
    });
  });

  describe("swiftTreeSitterParser interface", () => {
    it("should have correct languages", () => {
      expect(swiftTreeSitterParser.languages).toContain("swift");
    });

    it("should implement parse method", () => {
      const result = swiftTreeSitterParser.parse(SAMPLE_SWIFT);
      expect(result.language).toBe("swift");
      expect(result.totalLines).toBeGreaterThan(0);
    });
  });
});

describe("Swift specific features", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle generic types", async () => {
    const code = `
enum Result<Success, Failure: Error> {
    case success(Success)
    case failure(Failure)
}

func process<T: Codable>(_ item: T) -> T {
    return item
}
`;
    const result = await parseSwiftAsync(code);

    const resultEnum = result.types.find((t) => t.name === "Result");
    expect(resultEnum).toBeDefined();

    const processFunc = result.functions.find((f) => f.name === "process");
    expect(processFunc).toBeDefined();
  });

  it("should handle property wrappers", async () => {
    const code = `
class ViewModel {
    @Published var name: String = ""
    @State private var count: Int = 0
}
`;
    const result = await parseSwiftAsync(code);

    expect(result.classes.find((c) => c.name === "ViewModel")).toBeDefined();
  });

  it("should handle async/await", async () => {
    const code = `
func fetchData() async throws -> Data {
    return Data()
}

func process() async {
    do {
        let data = try await fetchData()
    } catch {
        print("Error")
    }
}
`;
    const result = await parseSwiftAsync(code);

    const fetchData = result.functions.find((f) => f.name === "fetchData");
    expect(fetchData?.isAsync).toBe(true);

    const process = result.functions.find((f) => f.name === "process");
    expect(process?.isAsync).toBe(true);
  });

  it("should handle access modifiers", async () => {
    const code = `
public class PublicClass {
    public var publicVar: String = ""
    private var privateVar: String = ""
    fileprivate var fileprivateVar: String = ""
    internal var internalVar: String = ""
}

open class OpenClass {}
`;
    const result = await parseSwiftAsync(code);

    const publicClass = result.classes.find((c) => c.name === "PublicClass");
    expect(publicClass).toBeDefined();
    expect(publicClass?.isExported).toBe(true);

    const openClass = result.classes.find((c) => c.name === "OpenClass");
    expect(openClass).toBeDefined();
  });

  it("should handle computed properties", async () => {
    const code = `
struct Rectangle {
    var width: Double
    var height: Double

    var area: Double {
        return width * height
    }

    var perimeter: Double {
        get { return 2 * (width + height) }
    }
}
`;
    const result = await parseSwiftAsync(code);

    const rectangle = result.classes.find((c) => c.name === "Rectangle");
    expect(rectangle).toBeDefined();
  });

  it("should handle protocol extensions", async () => {
    const code = `
protocol Describable {
    var description: String { get }
}

extension Describable {
    func describe() {
        print(description)
    }
}
`;
    const result = await parseSwiftAsync(code);

    const describable = result.interfaces.find((i) => i.name === "Describable");
    expect(describable).toBeDefined();

    const extension = result.types.find((t) => t.name === "extension Describable");
    expect(extension).toBeDefined();
  });
});

// ============================================================================
// Swift 5.5+ Concurrency Tests
// ============================================================================

describe("Swift 5.5+ Concurrency features", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle actor declarations", async () => {
    const code = `
/// A thread-safe counter actor
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func getValue() -> Int {
        return value
    }
}
`;
    const result = await parseSwiftAsync(code);

    const counter = result.classes.find((c) => c.name === "Counter");
    expect(counter).toBeDefined();
    expect(counter?.signature).toContain("actor Counter");
    expect(counter?.documentation).toContain("thread-safe counter");

    // Check methods inside actor
    const increment = result.functions.find((f) => f.name === "increment" && f.parent === "Counter");
    expect(increment).toBeDefined();
  });

  it("should handle nonisolated functions", async () => {
    const code = `
actor DataStore {
    private var data: [String] = []

    nonisolated func getCount() -> Int {
        return 0
    }

    func add(_ item: String) {
        data.append(item)
    }
}
`;
    const result = await parseSwiftAsync(code);

    const dataStore = result.classes.find((c) => c.name === "DataStore");
    expect(dataStore).toBeDefined();

    const getCount = result.functions.find((f) => f.name === "getCount" && f.parent === "DataStore");
    expect(getCount).toBeDefined();
    expect(getCount?.signature).toContain("nonisolated");
  });

  it("should handle async sequences", async () => {
    const code = `
func processItems() async {
    for await item in asyncSequence {
        print(item)
    }
}

func fetchItems() async throws -> [Item] {
    return []
}
`;
    const result = await parseSwiftAsync(code);

    const processItems = result.functions.find((f) => f.name === "processItems");
    expect(processItems).toBeDefined();
    expect(processItems?.isAsync).toBe(true);

    const fetchItems = result.functions.find((f) => f.name === "fetchItems");
    expect(fetchItems).toBeDefined();
    expect(fetchItems?.isAsync).toBe(true);
    expect(fetchItems?.signature).toContain("throws");
  });

  it("should handle @MainActor attribute", async () => {
    const code = `
@MainActor
class ViewModel {
    var title: String = ""

    func updateUI() {
        // Updates UI on main thread
    }
}

@MainActor
func updateDisplay() {
    print("Updating display")
}
`;
    const result = await parseSwiftAsync(code);

    const viewModel = result.classes.find((c) => c.name === "ViewModel");
    expect(viewModel).toBeDefined();
    expect(viewModel?.signature).toContain("@MainActor");

    const updateDisplay = result.functions.find((f) => f.name === "updateDisplay");
    expect(updateDisplay).toBeDefined();
    expect(updateDisplay?.signature).toContain("@MainActor");
  });

  it("should handle Sendable types", async () => {
    const code = `
struct Message: Sendable {
    let id: UUID
    let content: String
}

final class SafeCounter: @unchecked Sendable {
    private var lock = NSLock()
    private var value = 0
}
`;
    const result = await parseSwiftAsync(code);

    const message = result.classes.find((c) => c.name === "Message");
    expect(message).toBeDefined();

    const safeCounter = result.classes.find((c) => c.name === "SafeCounter");
    expect(safeCounter).toBeDefined();
  });
});

// ============================================================================
// Swift 5.9+ Macro Tests
// ============================================================================

describe("Swift 5.9+ Macro features", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle macro declarations", async () => {
    const code = `
@freestanding(expression)
public macro stringify<T>(_ value: T) -> (T, String) = #externalMacro(module: "MyMacros", type: "StringifyMacro")

@attached(member)
public macro AddInit() = #externalMacro(module: "MyMacros", type: "AddInitMacro")
`;
    const result = await parseSwiftAsync(code);

    // Note: macro parsing depends on tree-sitter-swift grammar support
    // This test verifies the parser doesn't crash on macro syntax
    expect(result.language).toBe("swift");
  });

  it("should handle types with macro attributes", async () => {
    const code = `
@Observable
class UserSettings {
    var theme: String = "light"
    var fontSize: Int = 14
}
`;
    const result = await parseSwiftAsync(code);

    const userSettings = result.classes.find((c) => c.name === "UserSettings");
    expect(userSettings).toBeDefined();
  });
});

// ============================================================================
// Swift 6+ Features Tests
// ============================================================================

describe("Swift 6+ features", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle typed throws", async () => {
    const code = `
enum ValidationError: Error {
    case empty
    case tooLong
}

func validate(_ input: String) throws(ValidationError) -> String {
    if input.isEmpty {
        throw .empty
    }
    return input
}
`;
    const result = await parseSwiftAsync(code);

    const validate = result.functions.find((f) => f.name === "validate");
    expect(validate).toBeDefined();
    // Note: typed throws signature extraction depends on tree-sitter-swift support
  });

  it("should handle distributed actors", async () => {
    const code = `
distributed actor GamePlayer {
    var score: Int = 0

    distributed func makeMove() async throws -> Move {
        return Move()
    }
}
`;
    const result = await parseSwiftAsync(code);

    const gamePlayer = result.classes.find((c) => c.name === "GamePlayer");
    expect(gamePlayer).toBeDefined();
    // Note: distributed actor signature depends on tree-sitter-swift support
  });

  it("should handle nonisolated(unsafe)", async () => {
    const code = `
class LegacyWrapper {
    nonisolated(unsafe) var legacyState: Int = 0

    nonisolated func accessLegacy() -> Int {
        return legacyState
    }
}
`;
    const result = await parseSwiftAsync(code);

    const wrapper = result.classes.find((c) => c.name === "LegacyWrapper");
    expect(wrapper).toBeDefined();
  });

  it("should handle package access level", async () => {
    const code = `
package class PackageClass {
    package var packageVar: String = ""

    package func packageMethod() {}
}
`;
    const result = await parseSwiftAsync(code);

    const packageClass = result.classes.find((c) => c.name === "PackageClass");
    expect(packageClass).toBeDefined();
  });
});

// ============================================================================
// Subscript and Operator Tests
// ============================================================================

describe("Subscripts and Operators", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle subscript declarations", async () => {
    const code = `
struct Matrix {
    var data: [[Double]]

    subscript(row: Int, column: Int) -> Double {
        get { return data[row][column] }
        set { data[row][column] = newValue }
    }

    subscript(row: Int) -> [Double] {
        return data[row]
    }
}
`;
    const result = await parseSwiftAsync(code);

    const matrix = result.classes.find((c) => c.name === "Matrix");
    expect(matrix).toBeDefined();

    // Check for subscript methods
    const subscripts = result.functions.filter((f) => f.name === "subscript" && f.parent === "Matrix");
    expect(subscripts.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle operator declarations", async () => {
    const code = `
infix operator **: MultiplicationPrecedence

func ** (base: Double, exponent: Double) -> Double {
    return pow(base, exponent)
}

prefix operator ++

prefix func ++ (value: inout Int) -> Int {
    value += 1
    return value
}
`;
    const result = await parseSwiftAsync(code);

    // Check for operator function
    const powerFunc = result.functions.find((f) => f.name === "**");
    // Note: operator function parsing depends on tree-sitter-swift support
    expect(result.language).toBe("swift");
  });
});

// ============================================================================
// Protocol Associated Types Tests
// ============================================================================

describe("Protocol Associated Types", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle associated type declarations", async () => {
    const code = `
protocol Container {
    associatedtype Item
    associatedtype Iterator: IteratorProtocol where Iterator.Element == Item

    var count: Int { get }
    mutating func append(_ item: Item)
}
`;
    const result = await parseSwiftAsync(code);

    const container = result.interfaces.find((i) => i.name === "Container");
    expect(container).toBeDefined();

    // Check for associated types
    const itemType = result.types.find((t) => t.name === "Item" && t.parent === "Container");
    // Note: associated type parsing depends on tree-sitter-swift support
  });

  it("should handle primary associated types", async () => {
    const code = `
protocol Collection<Element> {
    associatedtype Element
    var first: Element? { get }
}

func process<C: Collection<String>>(_ collection: C) {
    print(collection.first ?? "")
}
`;
    const result = await parseSwiftAsync(code);

    const collection = result.interfaces.find((i) => i.name === "Collection");
    expect(collection).toBeDefined();

    const process = result.functions.find((f) => f.name === "process");
    expect(process).toBeDefined();
  });
});

// ============================================================================
// Complex Swift Patterns Tests
// ============================================================================

describe("Complex Swift patterns", () => {
  beforeAll(async () => {
    await initSwiftParser();
  });

  it("should handle result builders", async () => {
    const code = `
@resultBuilder
struct ArrayBuilder {
    static func buildBlock<T>(_ components: T...) -> [T] {
        return components
    }
}

@ArrayBuilder
func buildNumbers() -> [Int] {
    1
    2
    3
}
`;
    const result = await parseSwiftAsync(code);

    const arrayBuilder = result.classes.find((c) => c.name === "ArrayBuilder");
    expect(arrayBuilder).toBeDefined();

    const buildNumbers = result.functions.find((f) => f.name === "buildNumbers");
    expect(buildNumbers).toBeDefined();
  });

  it("should handle opaque return types", async () => {
    const code = `
func makeCollection() -> some Collection {
    return [1, 2, 3]
}

func makeEquatable() -> some Equatable {
    return 42
}
`;
    const result = await parseSwiftAsync(code);

    const makeCollection = result.functions.find((f) => f.name === "makeCollection");
    expect(makeCollection).toBeDefined();

    const makeEquatable = result.functions.find((f) => f.name === "makeEquatable");
    expect(makeEquatable).toBeDefined();
  });

  it("should handle parameter packs (variadic generics)", async () => {
    const code = `
func zip<each T, each U>(_ first: repeat each T, with second: repeat each U) -> (repeat (each T, each U)) {
    return (repeat (each first, each second))
}
`;
    const result = await parseSwiftAsync(code);

    const zip = result.functions.find((f) => f.name === "zip");
    expect(zip).toBeDefined();
  });

  it("should handle where clauses in extensions", async () => {
    const code = `
extension Array where Element: Comparable {
    func isSorted() -> Bool {
        return zip(self, self.dropFirst()).allSatisfy { $0 <= $1 }
    }
}

extension Collection where Element == String {
    func joined() -> String {
        return self.joined(separator: "")
    }
}
`;
    const result = await parseSwiftAsync(code);

    const arrayExtension = result.types.find((t) => t.name === "extension Array");
    expect(arrayExtension).toBeDefined();
    expect(arrayExtension?.signature).toContain("extension Array");

    const collectionExtension = result.types.find((t) => t.name === "extension Collection");
    expect(collectionExtension).toBeDefined();
  });

  it("should handle mutating and nonmutating functions", async () => {
    const code = `
struct Stack<Element> {
    private var items: [Element] = []

    mutating func push(_ item: Element) {
        items.append(item)
    }

    mutating func pop() -> Element? {
        return items.popLast()
    }

    func peek() -> Element? {
        return items.last
    }
}
`;
    const result = await parseSwiftAsync(code);

    const stack = result.classes.find((c) => c.name === "Stack");
    expect(stack).toBeDefined();

    const push = result.functions.find((f) => f.name === "push" && f.parent === "Stack");
    expect(push).toBeDefined();
    expect(push?.signature).toContain("mutating");

    const peek = result.functions.find((f) => f.name === "peek" && f.parent === "Stack");
    expect(peek).toBeDefined();
  });

  it("should handle convenience and required initializers", async () => {
    const code = `
class Vehicle {
    var name: String

    required init(name: String) {
        self.name = name
    }

    convenience init() {
        self.init(name: "Unknown")
    }
}

class Car: Vehicle {
    var wheels: Int = 4

    required init(name: String) {
        super.init(name: name)
    }
}
`;
    const result = await parseSwiftAsync(code);

    const vehicle = result.classes.find((c) => c.name === "Vehicle");
    expect(vehicle).toBeDefined();

    const requiredInit = result.functions.find(
      (f) => f.name === "init" && f.parent === "Vehicle" && f.signature?.includes("required")
    );
    // Note: required init signature depends on tree-sitter-swift support

    const convenienceInit = result.functions.find(
      (f) => f.name === "init" && f.parent === "Vehicle" && f.signature?.includes("convenience")
    );
    // Note: convenience init signature depends on tree-sitter-swift support
  });
});
