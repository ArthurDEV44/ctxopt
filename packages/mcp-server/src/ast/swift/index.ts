/**
 * Swift AST Parser Module
 *
 * Provides Swift code parsing capabilities using Tree-sitter.
 * Supports Swift 6+ features including actors, macros, typed throws,
 * nonisolated, distributed actors, and more.
 *
 * @module ast/swift
 */

// Parser exports
export {
  swiftTreeSitterParser,
  parseSwift,
  parseSwiftAsync,
  extractSwiftElement,
  searchSwiftElements,
  initSwiftParser,
} from "./parser.js";

// Query exports
export { QUERIES } from "./queries.js";

// Utility exports
export {
  // Line number utilities
  getLineNumber,
  getEndLineNumber,

  // Documentation extraction
  extractSwiftDoc,

  // Access level utilities
  getAccessLevel,
  isPublic,

  // Function modifier checks
  isAsync,
  isThrowing,
  isRethrows,
  getTypedThrowsType,
  isStatic,
  isClassMember,
  isNonisolated,
  isDistributed,
  isMutating,
  isNonmutating,
  isOverride,
  isFinal,

  // Attribute utilities
  extractAttributes,
  isMainActor,
  isSendable,

  // Comprehensive modifier extraction
  getFunctionModifiers,

  // Signature extraction
  getFunctionSignature,
  getMethodSignature,
  getClassSignature,
  getActorSignature,
  getStructSignature,
  getProtocolSignature,
  getEnumSignature,
  getExtensionSignature,
  getTypealiasSignature,
  getMacroSignature,
  getSubscriptSignature,
  getOperatorSignature,
  getAssociatedTypeSignature,
  getImportPath,
  getVariableSignature,
  getInitSignature,

  // Element creation
  createCodeElement,
} from "./utils.js";

// Type exports
export type {
  SwiftAccessLevel,
  SwiftFunctionModifiers,
  SwiftAttribute,
  SwiftTypeModifiers,
} from "./utils.js";
