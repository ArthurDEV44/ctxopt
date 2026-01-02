/**
 * Rust Tree-sitter Queries
 *
 * S-expression queries for extracting Rust code elements.
 * Updated for tree-sitter-rust 0.24+ (2025) with full support for:
 * - Generics and type parameters
 * - Lifetimes
 * - Where clauses
 * - Macros (macro_rules! and macro_definition)
 * - Attributes (#[...])
 * - Async functions
 * - Trait implementations
 */

/**
 * Query to find all function declarations with full signature
 * Captures: name, type_parameters, parameters, return_type, where_clause
 */
export const FUNCTION_QUERY = `
(function_item
  name: (identifier) @name
  type_parameters: (type_parameters)? @type_params
  parameters: (parameters) @params
  return_type: (_)? @return_type) @function
`;

/**
 * Query to find all struct declarations with generics
 */
export const STRUCT_QUERY = `
(struct_item
  name: (type_identifier) @name
  type_parameters: (type_parameters)? @type_params) @struct
`;

/**
 * Query to find all enum declarations with generics
 */
export const ENUM_QUERY = `
(enum_item
  name: (type_identifier) @name
  type_parameters: (type_parameters)? @type_params) @enum
`;

/**
 * Query to find all trait declarations with bounds
 */
export const TRAIT_QUERY = `
(trait_item
  name: (type_identifier) @name
  type_parameters: (type_parameters)? @type_params
  bounds: (trait_bounds)? @bounds) @trait
`;

/**
 * Query to find all impl blocks - supports both:
 * - Inherent impl: impl<T> MyStruct<T> { ... }
 * - Trait impl: impl<T> Trait for MyStruct<T> { ... }
 * Handles type_identifier, generic_type, and scoped_type_identifier
 */
export const IMPL_QUERY = `
[
  (impl_item
    type_parameters: (type_parameters)? @type_params
    trait: (_)? @trait_name
    type: (type_identifier) @impl_type) @impl
  (impl_item
    type_parameters: (type_parameters)? @type_params
    trait: (_)? @trait_name
    type: (generic_type
      type: (type_identifier) @impl_type)) @impl
  (impl_item
    type_parameters: (type_parameters)? @type_params
    trait: (_)? @trait_name
    type: (scoped_type_identifier) @impl_type) @impl
]
`;

/**
 * Query to find all use declarations (imports)
 */
export const USE_QUERY = `
(use_declaration
  argument: (_) @path) @use
`;

/**
 * Query to find type aliases with generics
 */
export const TYPE_ALIAS_QUERY = `
(type_item
  name: (type_identifier) @name
  type_parameters: (type_parameters)? @type_params
  type: (_) @aliased_type) @type_alias
`;

/**
 * Query to find const declarations
 */
export const CONST_QUERY = `
(const_item
  name: (identifier) @name
  type: (_) @type
  value: (_)? @value) @const
`;

/**
 * Query to find static declarations
 */
export const STATIC_QUERY = `
(static_item
  name: (identifier) @name
  type: (_) @type
  value: (_)? @value) @static
`;

/**
 * Query to find module declarations
 */
export const MOD_QUERY = `
(mod_item
  name: (identifier) @name
  body: (declaration_list)? @body) @mod
`;

/**
 * Query to find macro_rules! definitions
 */
export const MACRO_RULES_QUERY = `
(macro_definition
  name: (identifier) @name) @macro
`;

/**
 * Query to find procedural macro definitions (attribute macros, derive macros)
 * These are functions with #[proc_macro], #[proc_macro_derive], #[proc_macro_attribute]
 */
export const PROC_MACRO_QUERY = `
(function_item
  (attribute_item
    (attribute
      (identifier) @attr_name))
  name: (identifier) @name
  (#match? @attr_name "^proc_macro")) @proc_macro
`;

/**
 * Query to find attribute items
 */
export const ATTRIBUTE_QUERY = `
(attribute_item
  (attribute
    (identifier) @attr_name
    arguments: (token_tree)? @attr_args)) @attribute
`;

/**
 * Query to find inner attributes (e.g., #![...])
 */
export const INNER_ATTRIBUTE_QUERY = `
(inner_attribute_item
  (attribute
    (identifier) @attr_name
    arguments: (token_tree)? @attr_args)) @inner_attribute
`;

/**
 * Query to find extern crate declarations
 */
export const EXTERN_CRATE_QUERY = `
(extern_crate_declaration
  name: (identifier) @name
  alias: (identifier)? @alias) @extern_crate
`;

/**
 * Query to find extern blocks (FFI)
 */
export const EXTERN_BLOCK_QUERY = `
(extern_block
  abi: (string_literal)? @abi) @extern_block
`;

/**
 * Query to find associated types in traits
 */
export const ASSOCIATED_TYPE_QUERY = `
(associated_type
  name: (type_identifier) @name
  bounds: (trait_bounds)? @bounds) @associated_type
`;

/**
 * Query to find where clauses
 */
export const WHERE_CLAUSE_QUERY = `
(where_clause
  (where_predicate
    left: (_) @constrained_type
    bounds: (trait_bounds) @bounds)*) @where_clause
`;

/**
 * Query to find lifetime parameters
 */
export const LIFETIME_QUERY = `
(lifetime
  (identifier) @lifetime_name) @lifetime
`;

/**
 * Query to find closures with their parameters and return types
 * Rust 2021+ edition closures with improved capture syntax
 */
export const CLOSURE_QUERY = `
(closure_expression
  parameters: (closure_parameters) @params
  return_type: (_)? @return_type
  body: (_) @body) @closure
`;

/**
 * Query to find const generics (Rust 1.51+)
 * e.g., struct Array<const N: usize>
 */
export const CONST_GENERIC_QUERY = `
(const_parameter
  name: (identifier) @const_name
  type: (_) @const_type) @const_generic
`;

/**
 * Query to find unsafe traits
 */
export const UNSAFE_TRAIT_QUERY = `
(trait_item
  "unsafe"
  name: (type_identifier) @name
  type_parameters: (type_parameters)? @type_params) @unsafe_trait
`;

/**
 * Query to find unsafe impl blocks
 */
export const UNSAFE_IMPL_QUERY = `
(impl_item
  "unsafe"
  type_parameters: (type_parameters)? @type_params
  trait: (_)? @trait_name
  type: (_) @impl_type) @unsafe_impl
`;

/**
 * Query to find async traits (Rust 1.75+ with AFIT)
 * Captures trait methods with async keyword
 */
export const ASYNC_TRAIT_METHOD_QUERY = `
(trait_item
  name: (type_identifier) @trait_name
  body: (declaration_list
    (function_signature_item
      "async"
      name: (identifier) @method_name) @async_method)) @trait_with_async
`;

/**
 * Query to find match expressions with patterns
 */
export const MATCH_QUERY = `
(match_expression
  value: (_) @match_value
  body: (match_block
    (match_arm
      pattern: (_) @pattern
      value: (_) @arm_value) @arm)) @match
`;

/**
 * Query to find let bindings with patterns
 */
export const LET_PATTERN_QUERY = `
(let_declaration
  pattern: (_) @pattern
  type: (_)? @type
  value: (_)? @value) @let
`;

/**
 * Query to find function parameters with their types
 * Captures self parameters and regular parameters
 */
export const PARAMETER_QUERY = `
(parameters
  [
    (self_parameter) @self_param
    (parameter
      pattern: (_) @param_name
      type: (_) @param_type) @param
  ])
`;

/**
 * Query to find trait bounds on generic types
 */
export const TRAIT_BOUND_QUERY = `
(trait_bounds
  (trait_bound
    (type_identifier) @bound_trait
    type_arguments: (type_arguments)? @bound_args)) @bounds
`;

/**
 * Query to find impl Trait return types (RPIT)
 */
export const IMPL_TRAIT_QUERY = `
(abstract_type
  trait: (_) @impl_trait_bound) @impl_trait
`;

/**
 * Query to find dyn Trait types
 */
export const DYN_TRAIT_QUERY = `
(dynamic_type
  trait: (_) @dyn_trait_bound) @dyn_trait
`;

/**
 * Combined query for all definitions (optimized for single-pass extraction)
 */
export const ALL_DEFINITIONS_QUERY = `
; Use declarations (imports)
(use_declaration
  argument: (_) @use_path) @use_decl

; Function declarations with full signature
(function_item
  name: (identifier) @func_name
  type_parameters: (type_parameters)? @func_type_params
  parameters: (parameters) @func_params
  return_type: (_)? @func_return) @function

; Struct declarations with generics
(struct_item
  name: (type_identifier) @struct_name
  type_parameters: (type_parameters)? @struct_type_params) @struct

; Enum declarations with generics
(enum_item
  name: (type_identifier) @enum_name
  type_parameters: (type_parameters)? @enum_type_params) @enum

; Trait declarations with bounds
(trait_item
  name: (type_identifier) @trait_name
  type_parameters: (type_parameters)? @trait_type_params
  bounds: (trait_bounds)? @trait_bounds) @trait

; Impl blocks - inherent impl with simple type
(impl_item
  type_parameters: (type_parameters)? @impl_type_params
  trait: (_)? @impl_trait
  type: (type_identifier) @impl_type_name) @impl

; Impl blocks - with generic type
(impl_item
  type_parameters: (type_parameters)? @impl_type_params
  trait: (_)? @impl_trait
  type: (generic_type
    type: (type_identifier) @impl_type_name)) @impl_generic

; Type aliases with generics
(type_item
  name: (type_identifier) @type_name
  type_parameters: (type_parameters)? @type_type_params
  type: (_) @type_value) @type_alias

; Const declarations
(const_item
  name: (identifier) @const_name
  type: (_) @const_type) @const

; Static declarations
(static_item
  name: (identifier) @static_name
  type: (_) @static_type) @static

; Module declarations
(mod_item
  name: (identifier) @mod_name) @mod

; Macro definitions (macro_rules!)
(macro_definition
  name: (identifier) @macro_name) @macro

; Extern crate declarations
(extern_crate_declaration
  name: (identifier) @extern_name) @extern_crate
`;

/**
 * Query patterns as a single object for easy access
 * Updated 2025: Added queries for modern Rust features (closures, const generics, async traits)
 */
export const QUERIES = {
  // Core definitions
  function: FUNCTION_QUERY,
  struct: STRUCT_QUERY,
  enum: ENUM_QUERY,
  trait: TRAIT_QUERY,
  impl: IMPL_QUERY,
  use: USE_QUERY,
  typeAlias: TYPE_ALIAS_QUERY,
  const: CONST_QUERY,
  static: STATIC_QUERY,
  mod: MOD_QUERY,

  // Macros
  macroRules: MACRO_RULES_QUERY,
  procMacro: PROC_MACRO_QUERY,

  // Attributes
  attribute: ATTRIBUTE_QUERY,
  innerAttribute: INNER_ATTRIBUTE_QUERY,

  // External
  externCrate: EXTERN_CRATE_QUERY,
  externBlock: EXTERN_BLOCK_QUERY,

  // Types and generics
  associatedType: ASSOCIATED_TYPE_QUERY,
  whereClause: WHERE_CLAUSE_QUERY,
  lifetime: LIFETIME_QUERY,
  constGeneric: CONST_GENERIC_QUERY,
  traitBound: TRAIT_BOUND_QUERY,
  implTrait: IMPL_TRAIT_QUERY,
  dynTrait: DYN_TRAIT_QUERY,

  // Closures
  closure: CLOSURE_QUERY,

  // Unsafe
  unsafeTrait: UNSAFE_TRAIT_QUERY,
  unsafeImpl: UNSAFE_IMPL_QUERY,

  // Async (Rust 1.75+)
  asyncTraitMethod: ASYNC_TRAIT_METHOD_QUERY,

  // Patterns
  match: MATCH_QUERY,
  letPattern: LET_PATTERN_QUERY,
  parameter: PARAMETER_QUERY,

  // Combined query
  all: ALL_DEFINITIONS_QUERY,
} as const;
