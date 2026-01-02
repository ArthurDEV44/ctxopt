/**
 * Python Tree-sitter Queries
 *
 * S-expression queries for extracting Python code elements.
 * Tree-sitter uses a query language similar to Lisp S-expressions.
 */

/**
 * Query to find all function definitions (including async)
 * Captures:
 * - @function: the function_definition node
 * - @name: the function name
 */
export const FUNCTION_QUERY = `
(function_definition
  name: (identifier) @name) @function
`;

/**
 * Query to find all class definitions
 * Captures:
 * - @class: the class_definition node
 * - @name: the class name
 */
export const CLASS_QUERY = `
(class_definition
  name: (identifier) @name) @class
`;

/**
 * Query to find all import statements
 * Captures:
 * - @import: the import statement node
 */
export const IMPORT_QUERY = `
[
  (import_statement) @import
  (import_from_statement) @import
]
`;

/**
 * Query to find all decorated definitions
 * Captures:
 * - @decorator: the decorator node
 * - @definition: the decorated definition (function or class)
 */
export const DECORATED_QUERY = `
(decorated_definition
  (decorator) @decorator
  definition: [
    (function_definition) @function
    (class_definition) @class
  ])
`;

/**
 * Query to find all assignments at module level (variables)
 * Captures:
 * - @variable: the assignment node
 * - @name: the variable name
 */
export const VARIABLE_QUERY = `
(module
  (expression_statement
    (assignment
      left: (identifier) @name) @variable))
`;

/**
 * Query to find all type aliases (using TypeAlias or simple assignment with type annotation)
 * Captures:
 * - @type_alias: the type alias definition
 */
export const TYPE_ALIAS_QUERY = `
(module
  (type_alias_statement
    name: (type) @name) @type_alias)
`;

/**
 * Query to find match statements (Python 3.10+ structural pattern matching)
 * Captures:
 * - @match: the match_statement node
 * - @subject: the expression being matched
 * - @case: individual case_clause nodes
 * - @pattern: the pattern in each case
 *
 * @see https://docs.python.org/3/reference/compound_stmts.html#match
 */
export const MATCH_STATEMENT_QUERY = `
(match_statement
  subject: (_) @subject
  body: (block
    (case_clause
      pattern: (_) @pattern) @case)) @match
`;

/**
 * Query to find named expressions (walrus operator :=, Python 3.8+)
 * Allows assignment within expressions: if (n := len(a)) > 10
 * Captures:
 * - @named_expr: the named_expression node
 * - @name: the variable name being assigned
 * - @value: the assigned value expression
 *
 * @see https://peps.python.org/pep-0572/
 */
export const NAMED_EXPRESSION_QUERY = `
(named_expression
  name: (identifier) @name
  value: (_) @value) @named_expr
`;

/**
 * Query to find async function definitions specifically
 * Captures async def functions distinctly from regular def
 * Captures:
 * - @async_function: the async function_definition node
 * - @name: the function name
 */
export const ASYNC_FUNCTION_QUERY = `
(function_definition
  "async"
  name: (identifier) @name) @async_function
`;

/**
 * Query to find type parameters (generics, Python 3.12+ PEP 695)
 * Example: def func[T](x: T) -> T: ...
 * Captures:
 * - @type_params: the type_parameter node containing generic params
 *
 * @see https://peps.python.org/pep-0695/
 */
export const TYPE_PARAMETER_QUERY = `
[
  (function_definition
    type_parameters: (type_parameter) @type_params)
  (class_definition
    type_parameters: (type_parameter) @type_params)
]
`;

/**
 * Query to find decorated definitions with full decorator details
 * Captures decorator name, arguments, and the decorated definition
 * Captures:
 * - @decorated: the decorated_definition node
 * - @decorator: individual decorator nodes
 * - @decorator_name: the decorator identifier or attribute
 * - @decorator_args: the decorator arguments (if call syntax)
 * - @function/@class: the decorated definition
 */
export const DECORATED_DEFINITION_QUERY = `
(decorated_definition
  (decorator
    [
      (identifier) @decorator_name
      (call
        function: [
          (identifier) @decorator_name
          (attribute) @decorator_name
        ]
        arguments: (argument_list) @decorator_args)
      (attribute) @decorator_name
    ]) @decorator
  definition: [
    (function_definition
      name: (identifier) @func_name) @function
    (class_definition
      name: (identifier) @class_name) @class
  ]) @decorated
`;

/**
 * Query to find async context managers and async iteration (Python 3.5+)
 * Captures async with and async for statements
 * Captures:
 * - @async_with: async with statement
 * - @async_for: async for statement
 */
export const ASYNC_CONTEXT_QUERY = `
[
  (for_statement
    "async") @async_for
  (with_statement
    "async") @async_with
]
`;

/**
 * Query to find function/method parameters with type annotations
 * Captures parameter details including types and defaults
 * Captures:
 * - @param: parameter node
 * - @param_name: parameter identifier
 * - @param_type: type annotation if present
 * - @param_default: default value if present
 */
export const PARAMETER_QUERY = `
(parameters
  [
    (identifier) @param_name
    (typed_parameter
      (identifier) @param_name
      type: (_) @param_type)
    (default_parameter
      name: (identifier) @param_name
      value: (_) @param_default)
    (typed_default_parameter
      name: (identifier) @param_name
      type: (_) @param_type
      value: (_) @param_default)
    (list_splat_pattern
      (identifier) @param_name)
    (dictionary_splat_pattern
      (identifier) @param_name)
  ] @param)
`;

/**
 * Query to find return type annotations
 * Captures:
 * - @return_type: the return type annotation
 */
export const RETURN_TYPE_QUERY = `
(function_definition
  return_type: (_) @return_type)
`;

/**
 * Query to find class methods
 * Captures:
 * - @method: the function_definition node inside a class
 * - @name: the method name
 * - @class_name: the parent class name
 */
export const METHOD_QUERY = `
(class_definition
  name: (identifier) @class_name
  body: (block
    (function_definition
      name: (identifier) @method_name) @method))
`;

/**
 * Combined query for all top-level definitions
 * This is more efficient than running multiple queries
 * Updated 2025: includes type aliases, match statements, and Python 3.10+ features
 */
export const ALL_DEFINITIONS_QUERY = `
; Functions at module level (including async)
(module
  (function_definition
    name: (identifier) @func_name) @function)

; Decorated functions at module level
(module
  (decorated_definition
    (function_definition
      name: (identifier) @decorated_func_name) @decorated_function))

; Classes at module level
(module
  (class_definition
    name: (identifier) @class_name) @class)

; Decorated classes at module level
(module
  (decorated_definition
    (class_definition
      name: (identifier) @decorated_class_name) @decorated_class))

; Import statements
(import_statement) @import
(import_from_statement) @import_from

; Module-level variables
(module
  (expression_statement
    (assignment
      left: (identifier) @var_name) @variable))

; Type aliases (Python 3.12+ PEP 695)
(module
  (type_alias_statement
    name: (type) @type_alias_name) @type_alias)

; Match statements (Python 3.10+)
(match_statement) @match_statement
`;

/**
 * Query patterns as a single object for easy access
 * Updated 2025: includes Python 3.10+ features (match, walrus, type params)
 */
export const QUERIES = {
  // Core definitions
  function: FUNCTION_QUERY,
  class: CLASS_QUERY,
  import: IMPORT_QUERY,
  decorated: DECORATED_QUERY,
  variable: VARIABLE_QUERY,
  typeAlias: TYPE_ALIAS_QUERY,
  method: METHOD_QUERY,

  // Python 3.8+ features
  namedExpression: NAMED_EXPRESSION_QUERY,

  // Python 3.10+ features
  match: MATCH_STATEMENT_QUERY,

  // Python 3.12+ features
  typeParameter: TYPE_PARAMETER_QUERY,

  // Async features
  asyncFunction: ASYNC_FUNCTION_QUERY,
  asyncContext: ASYNC_CONTEXT_QUERY,

  // Detailed extraction
  decoratedDefinition: DECORATED_DEFINITION_QUERY,
  parameter: PARAMETER_QUERY,
  returnType: RETURN_TYPE_QUERY,

  // Combined query
  all: ALL_DEFINITIONS_QUERY,
} as const;
