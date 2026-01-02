/**
 * Go Tree-sitter Queries
 *
 * S-expression queries for extracting Go code elements.
 *
 * Supports Go 1.18+ features:
 * - Generics (type parameters and constraints)
 * - Type arguments in function calls
 * - Interface type constraints
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
 * Query to find generic functions (Go 1.18+)
 */
export const GENERIC_FUNCTION_QUERY = `
(function_declaration
  name: (identifier) @name
  type_parameters: (type_parameter_list) @type_params) @generic_function
`;

/**
 * Query to find generic types (Go 1.18+)
 */
export const GENERIC_TYPE_QUERY = `
(type_declaration
  (type_spec
    name: (type_identifier) @name
    type_parameters: (type_parameter_list) @type_params
    type: [
      (struct_type) @struct
      (interface_type) @interface
    ])) @generic_type
`;

/**
 * Query to find type constraints (Go 1.18+)
 */
export const TYPE_CONSTRAINT_QUERY = `
(type_parameter_declaration
  name: (identifier) @param_name
  constraint: (_) @constraint) @type_param
`;

/**
 * Query to find struct fields
 */
export const STRUCT_FIELD_QUERY = `
(type_declaration
  (type_spec
    name: (type_identifier) @struct_name
    type: (struct_type
      (field_declaration_list
        (field_declaration
          name: (field_identifier)? @field_name
          type: (_) @field_type
          tag: (raw_string_literal)? @field_tag))))) @struct
`;

/**
 * Query to find interface methods
 */
export const INTERFACE_METHOD_QUERY = `
(type_declaration
  (type_spec
    name: (type_identifier) @interface_name
    type: (interface_type
      (method_spec
        name: (field_identifier) @method_name
        parameters: (parameter_list) @params
        result: (_)? @result)))) @interface
`;

/**
 * Query to find embedded types in structs
 */
export const EMBEDDED_TYPE_QUERY = `
(field_declaration
  type: (type_identifier) @embedded_type
  !name) @embedded_field
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

; Function declarations (including generic functions)
(function_declaration
  name: (identifier) @func_name
  type_parameters: (type_parameter_list)? @type_params) @function

; Method declarations
(method_declaration
  name: (field_identifier) @method_name) @method

; Type declarations (including generic types)
(type_declaration
  (type_spec
    name: (type_identifier) @type_name
    type_parameters: (type_parameter_list)? @type_params)) @type

; Variable declarations
(var_declaration) @var_decl

; Constant declarations
(const_declaration) @const_decl

; Type parameter declarations (Go 1.18+)
(type_parameter_declaration
  name: (identifier) @param_name
  constraint: (_) @constraint) @type_param
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
  genericFunction: GENERIC_FUNCTION_QUERY,
  genericType: GENERIC_TYPE_QUERY,
  typeConstraint: TYPE_CONSTRAINT_QUERY,
  structField: STRUCT_FIELD_QUERY,
  interfaceMethod: INTERFACE_METHOD_QUERY,
  embeddedType: EMBEDDED_TYPE_QUERY,
  all: ALL_DEFINITIONS_QUERY,
} as const;
