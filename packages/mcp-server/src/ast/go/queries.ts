/**
 * Go Tree-sitter Queries
 *
 * S-expression queries for extracting Go code elements.
 */

/**
 * Query to find all function declarations
 */
export const FUNCTION_QUERY = `
(function_declaration
  name: (identifier) @name) @function
`;

/**
 * Query to find all method declarations
 */
export const METHOD_QUERY = `
(method_declaration
  receiver: (parameter_list) @receiver
  name: (field_identifier) @name) @method
`;

/**
 * Query to find all type declarations (struct, interface)
 */
export const TYPE_QUERY = `
(type_declaration
  (type_spec
    name: (type_identifier) @name
    type: [
      (struct_type) @struct
      (interface_type) @interface
    ])) @type
`;

/**
 * Query to find all import declarations
 */
export const IMPORT_QUERY = `
[
  (import_declaration
    (import_spec) @import)
  (import_declaration
    (import_spec_list
      (import_spec) @import))
]
`;

/**
 * Query to find package-level variable declarations
 */
export const VARIABLE_QUERY = `
(source_file
  (var_declaration
    (var_spec
      name: (identifier) @name)) @variable)
`;

/**
 * Query to find package-level constant declarations
 */
export const CONST_QUERY = `
(source_file
  (const_declaration
    (const_spec
      name: (identifier) @name)) @constant)
`;

/**
 * Query to find type aliases
 */
export const TYPE_ALIAS_QUERY = `
(type_declaration
  (type_spec
    name: (type_identifier) @name
    type: (type_identifier) @alias_type)) @type_alias
`;

/**
 * Combined query for common elements
 */
export const ALL_DEFINITIONS_QUERY = `
; Package declaration
(package_clause
  (package_identifier) @package_name) @package

; Import declarations
(import_declaration) @import_decl

; Function declarations
(function_declaration
  name: (identifier) @func_name) @function

; Method declarations
(method_declaration
  name: (field_identifier) @method_name) @method

; Type declarations
(type_declaration
  (type_spec
    name: (type_identifier) @type_name)) @type

; Variable declarations
(var_declaration) @var_decl

; Constant declarations
(const_declaration) @const_decl
`;

/**
 * Query patterns as a single object for easy access
 */
export const QUERIES = {
  function: FUNCTION_QUERY,
  method: METHOD_QUERY,
  type: TYPE_QUERY,
  import: IMPORT_QUERY,
  variable: VARIABLE_QUERY,
  constant: CONST_QUERY,
  typeAlias: TYPE_ALIAS_QUERY,
  all: ALL_DEFINITIONS_QUERY,
} as const;
