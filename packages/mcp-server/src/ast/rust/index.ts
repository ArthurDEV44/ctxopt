/**
 * Rust AST Parser Module
 *
 * Exports the Tree-sitter based Rust parser.
 */

export {
  rustTreeSitterParser,
  parseRust,
  parseRustAsync,
  extractRustElement,
  searchRustElements,
  initRustParser,
} from "./parser.js";

export { QUERIES } from "./queries.js";

export {
  getLineNumber,
  getEndLineNumber,
  extractRustDoc,
  hasVisibility,
  isAsyncFn,
  getFunctionSignature,
  getStructSignature,
  getEnumSignature,
  getTraitSignature,
  createCodeElement,
} from "./utils.js";
