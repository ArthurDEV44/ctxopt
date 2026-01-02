/**
 * PHP Tree-sitter Queries
 *
 * S-expression queries for extracting PHP code elements.
 *
 * Supports PHP 8.0+ features:
 * - Attributes (PHP 8.0)
 * - Enums (PHP 8.1)
 * - Readonly properties/classes (PHP 8.1/8.2)
 * - Property hooks (PHP 8.4)
 * - Asymmetric visibility (PHP 8.4)
 */

/**
 * Query to find all function definitions
 */
export const FUNCTION_QUERY = `
(function_definition
  name: (name) @name) @function
`;

/**
 * Query to find all class declarations
 */
export const CLASS_QUERY = `
(class_declaration
  name: (name) @name) @class
`;

/**
 * Query to find all interface declarations
 */
export const INTERFACE_QUERY = `
(interface_declaration
  name: (name) @name) @interface
`;

/**
 * Query to find all trait declarations
 */
export const TRAIT_QUERY = `
(trait_declaration
  name: (name) @name) @trait
`;

/**
 * Query to find all namespace definitions
 */
export const NAMESPACE_QUERY = `
(namespace_definition
  name: (namespace_name) @name) @namespace
`;

/**
 * Query to find all use declarations (imports)
 */
export const USE_QUERY = `
(namespace_use_declaration) @use
`;

/**
 * Query to find all method declarations
 */
export const METHOD_QUERY = `
(method_declaration
  name: (name) @name) @method
`;

/**
 * Query to find all property declarations
 */
export const PROPERTY_QUERY = `
(property_declaration) @property
`;

/**
 * Query to find const declarations
 */
export const CONST_QUERY = `
(const_declaration) @const
`;

/**
 * Query to find enum declarations (PHP 8.1+)
 */
export const ENUM_QUERY = `
(enum_declaration
  name: (name) @name) @enum
`;

/**
 * Query to find enum cases (PHP 8.1+)
 */
export const ENUM_CASE_QUERY = `
(enum_case
  name: (name) @name) @enum_case
`;

/**
 * Query to find attribute groups (PHP 8.0+)
 */
export const ATTRIBUTE_QUERY = `
(attribute_group) @attribute
`;

/**
 * Query to find property hooks (PHP 8.4)
 */
export const PROPERTY_HOOK_QUERY = `
(property_hook
  name: (name) @name) @property_hook
`;

/**
 * Query to find properties with hooks (PHP 8.4)
 */
export const PROPERTY_WITH_HOOKS_QUERY = `
(property_declaration
  (property_hook_list) @hooks) @property_with_hooks
`;

/**
 * Combined query for all definitions
 */
export const ALL_DEFINITIONS_QUERY = `
; Namespace definitions
(namespace_definition
  name: (namespace_name) @namespace_name) @namespace

; Use declarations (imports)
(namespace_use_declaration) @use_decl

; Function definitions
(function_definition
  name: (name) @func_name) @function

; Class declarations
(class_declaration
  name: (name) @class_name) @class

; Interface declarations
(interface_declaration
  name: (name) @interface_name) @interface

; Trait declarations
(trait_declaration
  name: (name) @trait_name) @trait

; Enum declarations (PHP 8.1+)
(enum_declaration
  name: (name) @enum_name) @enum

; Enum cases (PHP 8.1+)
(enum_case
  name: (name) @case_name) @enum_case

; Method declarations
(method_declaration
  name: (name) @method_name) @method

; Const declarations
(const_declaration) @const

; Property declarations
(property_declaration) @property

; Property hooks (PHP 8.4)
(property_hook
  name: (name) @hook_name) @property_hook

; Attribute groups (PHP 8.0+)
(attribute_group) @attribute
`;

/**
 * Query patterns as a single object for easy access
 */
export const QUERIES = {
  function: FUNCTION_QUERY,
  class: CLASS_QUERY,
  interface: INTERFACE_QUERY,
  trait: TRAIT_QUERY,
  namespace: NAMESPACE_QUERY,
  use: USE_QUERY,
  method: METHOD_QUERY,
  property: PROPERTY_QUERY,
  const: CONST_QUERY,
  enum: ENUM_QUERY,
  enumCase: ENUM_CASE_QUERY,
  attribute: ATTRIBUTE_QUERY,
  propertyHook: PROPERTY_HOOK_QUERY,
  propertyWithHooks: PROPERTY_WITH_HOOKS_QUERY,
  all: ALL_DEFINITIONS_QUERY,
} as const;
