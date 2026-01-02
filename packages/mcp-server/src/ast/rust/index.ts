/**
 * Rust AST Parser Module
 *
 * Exports the Tree-sitter based Rust parser.
 * Updated 2025: Support for modern Rust features (const generics, async traits, closures)
 */

export {
  rustTreeSitterParser,
  parseRust,
  parseRustAsync,
  extractRustElement,
  searchRustElements,
  initRustParser,
} from "./parser.js";

// Export all queries including new Rust 2024+ queries
export {
  QUERIES,
  FUNCTION_QUERY,
  STRUCT_QUERY,
  ENUM_QUERY,
  TRAIT_QUERY,
  IMPL_QUERY,
  USE_QUERY,
  TYPE_ALIAS_QUERY,
  CONST_QUERY,
  STATIC_QUERY,
  MOD_QUERY,
  MACRO_RULES_QUERY,
  PROC_MACRO_QUERY,
  ATTRIBUTE_QUERY,
  INNER_ATTRIBUTE_QUERY,
  EXTERN_CRATE_QUERY,
  EXTERN_BLOCK_QUERY,
  ASSOCIATED_TYPE_QUERY,
  WHERE_CLAUSE_QUERY,
  LIFETIME_QUERY,
  ALL_DEFINITIONS_QUERY,
  // New queries (2025)
  CLOSURE_QUERY,
  CONST_GENERIC_QUERY,
  UNSAFE_TRAIT_QUERY,
  UNSAFE_IMPL_QUERY,
  ASYNC_TRAIT_METHOD_QUERY,
  MATCH_QUERY,
  LET_PATTERN_QUERY,
  PARAMETER_QUERY,
  TRAIT_BOUND_QUERY,
  IMPL_TRAIT_QUERY,
  DYN_TRAIT_QUERY,
} from "./queries.js";

// Export utility functions
export {
  getLineNumber,
  getEndLineNumber,
  extractRustDoc,
  hasVisibility,
  getVisibility,
  isAsyncFn,
  isUnsafeFn,
  isConstFn,
  isExternFn,
  getExternAbi,
  getFunctionSignature,
  getStructSignature,
  getEnumSignature,
  getTraitSignature,
  getImplSignature,
  getImplTypeName,
  getImplTraitName,
  getUsePath,
  getUseShortName,
  getConstSignature,
  getTypeAliasSignature,
  getMacroSignature,
  getModSignature,
  getStaticSignature,
  getAttributes,
  hasAttribute,
  getDerives,
  getTypeParameters,
  getWhereClause,
  getTraitBounds,
  createCodeElement,
  // New utility functions (2025)
  getParameterInfoList,
  getLifetimes,
  getGenericTypeParams,
  getConstGenericParams,
  getReturnType,
  returnsImplTrait,
  isUnsafeTrait,
  getDecoratorsFromAttributes,
} from "./utils.js";

// Export types
export type {
  TypeParameters,
  WhereClause,
  Attribute,
} from "./utils.js";
