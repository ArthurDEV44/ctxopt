/**
 * PHP AST Parser Module
 *
 * Exports the Tree-sitter based PHP parser.
 *
 * Supports PHP 8.0+ features:
 * - Attributes (PHP 8.0)
 * - Enums (PHP 8.1)
 * - Readonly properties/classes (PHP 8.1/8.2)
 * - Property hooks (PHP 8.4)
 * - Asymmetric visibility (PHP 8.4)
 */

export {
  phpTreeSitterParser,
  parsePhp,
  parsePhpAsync,
  extractPhpElement,
  searchPhpElements,
  initPhpParser,
} from "./parser.js";

export { QUERIES } from "./queries.js";

// Core utilities
export {
  getLineNumber,
  getEndLineNumber,
  extractPhpDoc,
  getVisibility,
  isPublic,
  isStatic,
  isReadonly,
  isFinal,
  isAbstract,
  createCodeElement,
} from "./utils.js";

// Signature extraction
export {
  getFunctionSignature,
  getMethodSignature,
  getClassSignature,
  getInterfaceSignature,
  getTraitSignature,
  getEnumSignature,
  getEnumCaseSignature,
  getPropertySignature,
  getConstSignature,
} from "./utils.js";

// PHP 8.0+ feature utilities
export {
  getAttributes,
  getAsymmetricVisibility,
  hasPropertyHooks,
  getPropertyHooks,
  getPropertyName,
  getEnumCaseName,
} from "./utils.js";
