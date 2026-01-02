/**
 * Go AST Parser Module
 *
 * Exports the Tree-sitter based Go parser.
 *
 * Supports Go 1.18+ features:
 * - Generics (type parameters and constraints)
 * - Type arguments in function calls
 * - Interface type constraints
 */

export {
  goTreeSitterParser,
  parseGo,
  parseGoAsync,
  extractGoElement,
  searchGoElements,
  initGoParser,
} from "./parser.js";

export { QUERIES } from "./queries.js";

// Core utilities
export {
  getLineNumber,
  getEndLineNumber,
  extractGoDoc,
  isExported,
  createCodeElement,
} from "./utils.js";

// Signature extraction
export {
  getFunctionSignature,
  getMethodSignature,
  getTypeSignature,
  getStructSignatureWithFields,
  getInterfaceSignatureWithMethods,
  getConstSignature,
  getVarSignature,
} from "./utils.js";

// Go 1.18+ generics utilities
export {
  getTypeParameters,
  isGeneric,
  getTypeConstraints,
  isConstraintInterface,
} from "./utils.js";

// Struct and interface utilities
export {
  getStructFields,
  getInterfaceMethods,
  getEmbeddedTypes,
  getReceiverType,
} from "./utils.js";

// Import utilities
export {
  getImportPath,
  getImportName,
  getImportAlias,
} from "./utils.js";

// Type alias utilities
export {
  getTypeAliasInfo,
  usesIota,
} from "./utils.js";
