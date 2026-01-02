/**
 * TypeScript AST Parser
 *
 * Main entry point for TypeScript/JavaScript code parsing.
 * Re-exports all public functions from submodules.
 */

// Main parser function
export { parseTypeScript } from "./parser.js";

// Search and extraction functions
export { extractTypeScriptElement, searchTypeScriptElements } from "./search.js";

// Signature builder (for external use if needed)
export { buildSignature } from "./signatures.js";

// Utility functions (for external use if needed)
export {
  getLineNumber,
  getJSDoc,
  getModifiers,
  isExported,
  isAsync,
  isStatic,
  isAbstract,
  isReadonly,
  getVisibility,
  getDecorators,
  getTypeParameters,
  getReturnType,
  getParameters,
  getExtendsClause,
  getImplementsClause,
  getInterfaceExtends,
} from "./utils.js";

// Member parsers (for external use if needed)
export {
  parsePropertyDeclaration,
  parseMethodDeclaration,
  parseConstructorDeclaration,
  parseAccessor,
  parsePropertySignature,
  parseMethodSignature,
} from "./members.js";
