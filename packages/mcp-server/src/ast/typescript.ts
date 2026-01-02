/**
 * TypeScript AST Parser
 *
 * This file provides backward compatibility by re-exporting from the
 * modular typescript/ directory structure.
 *
 * @module ast/typescript
 */

// Re-export all public APIs from the modular structure
export {
  parseTypeScript,
  extractTypeScriptElement,
  searchTypeScriptElements,
  buildSignature,
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
  parsePropertyDeclaration,
  parseMethodDeclaration,
  parseConstructorDeclaration,
  parseAccessor,
  parsePropertySignature,
  parseMethodSignature,
} from "./typescript/index.js";

// Legacy export object for backward compatibility
import {
  parseTypeScript,
  extractTypeScriptElement,
  searchTypeScriptElements,
} from "./typescript/index.js";
import type { LanguageParser, SupportedLanguage } from "./types.js";

export const typescriptParser: LanguageParser = {
  languages: ["typescript", "javascript"] as SupportedLanguage[],
  parse: (content, options) => parseTypeScript(content, true, options),
  extractElement: (content, target, options) =>
    extractTypeScriptElement(content, target, options, true),
  searchElements: searchTypeScriptElements,
};
