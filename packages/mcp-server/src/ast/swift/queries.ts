/**
 * Swift Tree-sitter Queries
 *
 * S-expression queries for extracting Swift code elements.
 * Updated for Swift 6+ features including actors, macros, typed throws,
 * nonisolated, distributed, and other modern Swift constructs.
 *
 * @see https://github.com/alex-pinkus/tree-sitter-swift
 * @see https://docs.swift.org/swift-book/
 */

/**
 * Query to find all function declarations
 */
export const FUNCTION_QUERY = `
(function_declaration
  name: (simple_identifier) @name) @function
`;

/**
 * Query to find all class declarations
 */
export const CLASS_QUERY = `
(class_declaration
  name: (type_identifier) @name) @class
`;

/**
 * Query to find all struct declarations
 */
export const STRUCT_QUERY = `
(struct_declaration
  name: (type_identifier) @name) @struct
`;

/**
 * Query to find all enum declarations
 */
export const ENUM_QUERY = `
(enum_declaration
  name: (type_identifier) @name) @enum
`;

/**
 * Query to find all protocol declarations
 */
export const PROTOCOL_QUERY = `
(protocol_declaration
  name: (type_identifier) @name) @protocol
`;

/**
 * Query to find all import declarations
 */
export const IMPORT_QUERY = `
(import_declaration) @import
`;

/**
 * Query to find all extension declarations
 */
export const EXTENSION_QUERY = `
(extension_declaration) @extension
`;

/**
 * Query to find all typealias declarations
 */
export const TYPEALIAS_QUERY = `
(typealias_declaration
  name: (type_identifier) @name) @typealias
`;

/**
 * Query to find all property/variable declarations
 */
export const VARIABLE_QUERY = `
(property_declaration) @property
`;

/**
 * Query to find initializers
 */
export const INIT_QUERY = `
(init_declaration) @init
`;

/**
 * Query to find deinitializers
 */
export const DEINIT_QUERY = `
(deinit_declaration) @deinit
`;

// ============================================================================
// Swift 5.5+ Concurrency Queries
// ============================================================================

/**
 * Query to find actor declarations (Swift 5.5+)
 * Actors provide thread-safe access to mutable state
 */
export const ACTOR_QUERY = `
(class_declaration
  (modifiers)? @modifiers
  "actor"
  name: (type_identifier) @name) @actor
`;

/**
 * Query to find async function declarations
 */
export const ASYNC_FUNCTION_QUERY = `
(function_declaration
  name: (simple_identifier) @name
  (modifiers
    (property_modifier) @modifier
    (#match? @modifier "async"))) @async_function
`;

/**
 * Query to find await expressions
 */
export const AWAIT_EXPRESSION_QUERY = `
(await_expression) @await
`;

// ============================================================================
// Swift 5.9+ Macro Queries
// ============================================================================

/**
 * Query to find macro declarations (Swift 5.9+)
 * Macros are code that generates other code at compile time
 */
export const MACRO_DECLARATION_QUERY = `
(macro_declaration
  name: (simple_identifier) @name) @macro_decl
`;

/**
 * Query to find macro invocations (freestanding macros use #)
 */
export const MACRO_INVOCATION_QUERY = `
(macro_invocation) @macro_invoke
`;

// ============================================================================
// Swift 6+ Queries
// ============================================================================

/**
 * Query to find functions with typed throws (Swift 6)
 * Syntax: func foo() throws(MyError) -> Result
 */
export const TYPED_THROWS_QUERY = `
(function_declaration
  (throws) @throws_clause) @typed_throws_function
`;

/**
 * Query for nonisolated declarations
 * Used in Swift 6 strict concurrency for opt-out of actor isolation
 */
export const NONISOLATED_QUERY = `
(function_declaration
  (modifiers
    (member_modifier) @modifier
    (#match? @modifier "nonisolated"))) @nonisolated_function
`;

/**
 * Query for distributed actor declarations
 * Used in Swift distributed actors for cross-process communication
 */
export const DISTRIBUTED_ACTOR_QUERY = `
(class_declaration
  (modifiers
    (property_modifier) @modifier
    (#match? @modifier "distributed"))
  "actor") @distributed_actor
`;

// ============================================================================
// Subscript and Operator Queries
// ============================================================================

/**
 * Query to find subscript declarations
 */
export const SUBSCRIPT_QUERY = `
(subscript_declaration) @subscript
`;

/**
 * Query to find operator declarations
 */
export const OPERATOR_QUERY = `
(operator_declaration) @operator
`;

/**
 * Query to find precedence group declarations
 */
export const PRECEDENCE_GROUP_QUERY = `
(precedence_group_declaration
  name: (simple_identifier) @name) @precedence_group
`;

// ============================================================================
// Associated Type and Generic Queries
// ============================================================================

/**
 * Query to find associated type declarations in protocols
 */
export const ASSOCIATED_TYPE_QUERY = `
(associatedtype_declaration
  name: (type_identifier) @name) @associatedtype
`;

/**
 * Query to find generic parameter clauses
 */
export const GENERIC_PARAMETER_QUERY = `
(type_parameters) @generic_params
`;

/**
 * Query to find where clauses (generic constraints)
 */
export const WHERE_CLAUSE_QUERY = `
(type_constraints) @where_clause
`;

// ============================================================================
// Attribute Queries
// ============================================================================

/**
 * Query to find all attributes (@MainActor, @available, @discardableResult, etc.)
 */
export const ATTRIBUTE_QUERY = `
(attribute
  (user_type) @attr_name) @attribute
`;

/**
 * Query to find @MainActor attributed declarations
 */
export const MAIN_ACTOR_QUERY = `
(attribute
  (user_type
    (type_identifier) @attr_name
    (#eq? @attr_name "MainActor"))) @main_actor_attr
`;

/**
 * Query to find @available attributes
 */
export const AVAILABLE_QUERY = `
(attribute
  (user_type
    (type_identifier) @attr_name
    (#eq? @attr_name "available"))) @available_attr
`;

/**
 * Query to find property wrapper attributes (@State, @Published, @ObservedObject, etc.)
 */
export const PROPERTY_WRAPPER_QUERY = `
(property_declaration
  (modifiers
    (attribute) @wrapper)) @wrapped_property
`;

// ============================================================================
// Protocol and Conformance Queries
// ============================================================================

/**
 * Query to find protocol function declarations (requirements)
 */
export const PROTOCOL_FUNCTION_QUERY = `
(protocol_function_declaration
  name: (simple_identifier) @name) @protocol_func
`;

/**
 * Query to find protocol property declarations
 */
export const PROTOCOL_PROPERTY_QUERY = `
(protocol_property_declaration) @protocol_prop
`;

/**
 * Query to find type inheritance clauses
 */
export const INHERITANCE_QUERY = `
(type_inheritance_clause) @inheritance
`;

// ============================================================================
// Closure and Higher-Order Function Queries
// ============================================================================

/**
 * Query to find closure expressions (lambdas)
 */
export const CLOSURE_QUERY = `
(lambda_literal) @closure
`;

/**
 * Query to find trailing closure syntax
 */
export const TRAILING_CLOSURE_QUERY = `
(call_expression
  (lambda_literal) @trailing_closure)
`;

// ============================================================================
// Error Handling Queries
// ============================================================================

/**
 * Query to find try expressions
 */
export const TRY_EXPRESSION_QUERY = `
(try_expression) @try_expr
`;

/**
 * Query to find do-catch blocks
 */
export const DO_CATCH_QUERY = `
(do_statement) @do_catch
`;

/**
 * Query to find throw statements
 */
export const THROW_QUERY = `
(throw_keyword) @throw
`;

// ============================================================================
// Combined Queries
// ============================================================================

/**
 * Combined query for all definitions (updated for Swift 6+)
 */
export const ALL_DEFINITIONS_QUERY = `
; Import declarations
(import_declaration) @import_decl

; Function declarations
(function_declaration
  name: (simple_identifier) @func_name) @function

; Class declarations
(class_declaration
  name: (type_identifier) @class_name) @class

; Struct declarations
(struct_declaration
  name: (type_identifier) @struct_name) @struct

; Enum declarations
(enum_declaration
  name: (type_identifier) @enum_name) @enum

; Protocol declarations
(protocol_declaration
  name: (type_identifier) @protocol_name) @protocol

; Extension declarations
(extension_declaration) @extension

; Typealias declarations
(typealias_declaration
  name: (type_identifier) @typealias_name) @typealias

; Property declarations
(property_declaration) @property

; Init declarations
(init_declaration) @init

; Deinit declarations
(deinit_declaration) @deinit

; Macro declarations (Swift 5.9+)
(macro_declaration
  name: (simple_identifier) @macro_name) @macro

; Subscript declarations
(subscript_declaration) @subscript

; Operator declarations
(operator_declaration) @operator

; Precedence group declarations
(precedence_group_declaration
  name: (simple_identifier) @precedence_name) @precedence_group

; Associated type declarations
(associatedtype_declaration
  name: (type_identifier) @associatedtype_name) @associatedtype

; Protocol function requirements
(protocol_function_declaration
  name: (simple_identifier) @protocol_func_name) @protocol_function

; Protocol property requirements
(protocol_property_declaration) @protocol_property
`;

/**
 * Query patterns as a single object for easy access
 */
export const QUERIES = {
  // Basic declarations
  function: FUNCTION_QUERY,
  class: CLASS_QUERY,
  struct: STRUCT_QUERY,
  enum: ENUM_QUERY,
  protocol: PROTOCOL_QUERY,
  import: IMPORT_QUERY,
  extension: EXTENSION_QUERY,
  typealias: TYPEALIAS_QUERY,
  variable: VARIABLE_QUERY,
  init: INIT_QUERY,
  deinit: DEINIT_QUERY,

  // Swift 5.5+ Concurrency
  actor: ACTOR_QUERY,
  asyncFunction: ASYNC_FUNCTION_QUERY,
  awaitExpression: AWAIT_EXPRESSION_QUERY,

  // Swift 5.9+ Macros
  macroDeclaration: MACRO_DECLARATION_QUERY,
  macroInvocation: MACRO_INVOCATION_QUERY,

  // Swift 6+
  typedThrows: TYPED_THROWS_QUERY,
  nonisolated: NONISOLATED_QUERY,
  distributedActor: DISTRIBUTED_ACTOR_QUERY,

  // Subscripts and Operators
  subscript: SUBSCRIPT_QUERY,
  operator: OPERATOR_QUERY,
  precedenceGroup: PRECEDENCE_GROUP_QUERY,

  // Generics
  associatedType: ASSOCIATED_TYPE_QUERY,
  genericParameter: GENERIC_PARAMETER_QUERY,
  whereClause: WHERE_CLAUSE_QUERY,

  // Attributes
  attribute: ATTRIBUTE_QUERY,
  mainActor: MAIN_ACTOR_QUERY,
  available: AVAILABLE_QUERY,
  propertyWrapper: PROPERTY_WRAPPER_QUERY,

  // Protocol requirements
  protocolFunction: PROTOCOL_FUNCTION_QUERY,
  protocolProperty: PROTOCOL_PROPERTY_QUERY,
  inheritance: INHERITANCE_QUERY,

  // Closures
  closure: CLOSURE_QUERY,
  trailingClosure: TRAILING_CLOSURE_QUERY,

  // Error handling
  tryExpression: TRY_EXPRESSION_QUERY,
  doCatch: DO_CATCH_QUERY,
  throw: THROW_QUERY,

  // All definitions
  all: ALL_DEFINITIONS_QUERY,
} as const;
