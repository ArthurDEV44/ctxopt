/**
 * Rust Tree-sitter Queries
 *
 * S-expression queries for extracting Rust code elements.
 */

/**
 * Query to find all function declarations
 */
export const FUNCTION_QUERY = `
(function_item
  name: (identifier) @name) @function
`;

/**
 * Query to find all struct declarations
 */
export const STRUCT_QUERY = `
(struct_item
  name: (type_identifier) @name) @struct
`;

/**
 * Query to find all enum declarations
 */
export const ENUM_QUERY = `
(enum_item
  name: (type_identifier) @name) @enum
`;

/**
 * Query to find all trait declarations
 */
export const TRAIT_QUERY = `
(trait_item
  name: (type_identifier) @name) @trait
`;

/**
 * Query to find all impl blocks
 */
export const IMPL_QUERY = `
(impl_item
  type: (type_identifier) @impl_type) @impl
`;

/**
 * Query to find all use declarations (imports)
 */
export const USE_QUERY = `
(use_declaration) @use
`;

/**
 * Query to find type aliases
 */
export const TYPE_ALIAS_QUERY = `
(type_item
  name: (type_identifier) @name) @type_alias
`;

/**
 * Query to find const declarations
 */
export const CONST_QUERY = `
(const_item
  name: (identifier) @name) @const
`;

/**
 * Query to find static declarations
 */
export const STATIC_QUERY = `
(static_item
  name: (identifier) @name) @static
`;

/**
 * Query to find module declarations
 */
export const MOD_QUERY = `
(mod_item
  name: (identifier) @name) @mod
`;

/**
 * Combined query for all definitions
 */
export const ALL_DEFINITIONS_QUERY = `
; Use declarations (imports)
(use_declaration) @use_decl

; Function declarations
(function_item
  name: (identifier) @func_name) @function

; Struct declarations
(struct_item
  name: (type_identifier) @struct_name) @struct

; Enum declarations
(enum_item
  name: (type_identifier) @enum_name) @enum

; Trait declarations
(trait_item
  name: (type_identifier) @trait_name) @trait

; Impl blocks
(impl_item) @impl

; Type aliases
(type_item
  name: (type_identifier) @type_name) @type_alias

; Const declarations
(const_item
  name: (identifier) @const_name) @const

; Static declarations
(static_item
  name: (identifier) @static_name) @static

; Module declarations
(mod_item
  name: (identifier) @mod_name) @mod
`;

/**
 * Query patterns as a single object for easy access
 */
export const QUERIES = {
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
  all: ALL_DEFINITIONS_QUERY,
} as const;
