/**
 * Go AST Parser Module
 *
 * Exports the Tree-sitter based Go parser.
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

export {
  getLineNumber,
  getEndLineNumber,
  extractGoDoc,
  getFunctionSignature,
  getMethodSignature,
  getTypeSignature,
  isExported,
  createCodeElement,
} from "./utils.js";
