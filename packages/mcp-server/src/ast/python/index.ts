/**
 * Python AST Parser Module
 *
 * Exports the Tree-sitter based Python parser.
 * Updated 2025: Support for Python 3.10+ features (match, walrus, type params)
 */

export {
  pythonTreeSitterParser,
  parsePython,
  parsePythonAsync,
  extractPythonElement,
  searchPythonElements,
  initPythonParser,
} from "./parser.js";

// Export all queries including new Python 3.10+ queries
export {
  QUERIES,
  FUNCTION_QUERY,
  CLASS_QUERY,
  IMPORT_QUERY,
  DECORATED_QUERY,
  VARIABLE_QUERY,
  TYPE_ALIAS_QUERY,
  METHOD_QUERY,
  ALL_DEFINITIONS_QUERY,
  // Python 3.8+ features
  NAMED_EXPRESSION_QUERY,
  // Python 3.10+ features
  MATCH_STATEMENT_QUERY,
  // Python 3.12+ features
  TYPE_PARAMETER_QUERY,
  // Async features
  ASYNC_FUNCTION_QUERY,
  ASYNC_CONTEXT_QUERY,
  // Detailed extraction queries
  DECORATED_DEFINITION_QUERY,
  PARAMETER_QUERY,
  RETURN_TYPE_QUERY,
} from "./queries.js";

// Export utility functions
export {
  getLineNumber,
  getEndLineNumber,
  extractDocstring,
  getFunctionSignature,
  getClassSignature,
  createCodeElement,
  getDecorators,
  getTypeParameters,
  getReturnType,
  getParameterInfoList,
  getBodyNode,
  getImportName,
  getImportSignature,
  isAsyncFunction,
} from "./utils.js";
