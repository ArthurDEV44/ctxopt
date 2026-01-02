/**
 * SDK Code/AST Functions
 *
 * Wraps AST parsing functionality for sandbox use.
 * Returns Result types for type-safe error handling.
 */

import { Result, ok, err } from "neverthrow";
import { parseFile, extractElement, searchElements } from "../../ast/index.js";
import type { SupportedLanguage, CodeElement as ASTElement } from "../../ast/types.js";
import type { FileStructure, ExtractionTarget, CodeElement } from "../types.js";
import { ParseError, parseError } from "../errors.js";

/**
 * Convert AST element to SDK element
 */
function toCodeElement(el: ASTElement): CodeElement {
  return {
    type: el.type,
    name: el.name,
    startLine: el.startLine,
    endLine: el.endLine,
    signature: el.signature,
    documentation: el.documentation,
  };
}

/**
 * Parse code content to structure
 * Returns Result<FileStructure, ParseError> for type-safe error handling
 */
export function codeParse(content: string, language: SupportedLanguage): FileStructure {
  const parsed = parseFile(content, language);

  return {
    language,
    functions: parsed.functions.map(toCodeElement),
    classes: parsed.classes.map(toCodeElement),
    interfaces: parsed.interfaces?.map(toCodeElement) || [],
    types: parsed.types?.map(toCodeElement) || [],
    variables: parsed.variables?.map(toCodeElement) || [],
    imports: parsed.imports?.map(toCodeElement) || [],
    exports: parsed.exports?.map(toCodeElement) || [],
  };
}

/**
 * Parse code content to structure with Result type
 */
export function codeParseResult(
  content: string,
  language: SupportedLanguage
): Result<FileStructure, ParseError> {
  try {
    if (language === "unknown") {
      return err(parseError.unsupportedLanguage(language));
    }

    const parsed = parseFile(content, language);

    return ok({
      language,
      functions: parsed.functions.map(toCodeElement),
      classes: parsed.classes.map(toCodeElement),
      interfaces: parsed.interfaces?.map(toCodeElement) || [],
      types: parsed.types?.map(toCodeElement) || [],
      variables: parsed.variables?.map(toCodeElement) || [],
      imports: parsed.imports?.map(toCodeElement) || [],
      exports: parsed.exports?.map(toCodeElement) || [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(parseError.parseFailed(language, message));
  }
}

/**
 * Extract a specific element from code
 */
export function codeExtract(
  content: string,
  language: SupportedLanguage,
  target: ExtractionTarget
): string | null {
  const lines = content.split("\n");
  const parsed = parseFile(content, language);

  // Find matching element
  const allElements = [
    ...parsed.functions,
    ...parsed.classes,
    ...(parsed.interfaces || []),
    ...(parsed.types || []),
    ...(parsed.variables || []),
  ];

  const element = allElements.find(
    (el) => el.type === target.type && el.name === target.name
  );

  if (!element) {
    return null;
  }

  // Extract lines
  const start = element.startLine - 1; // 0-indexed
  const end = element.endLine || element.startLine;
  return lines.slice(start, end).join("\n");
}

/**
 * Extract a specific element from code with Result type
 */
export function codeExtractResult(
  content: string,
  language: SupportedLanguage,
  target: ExtractionTarget
): Result<string, ParseError> {
  try {
    if (language === "unknown") {
      return err(parseError.unsupportedLanguage(language));
    }

    const lines = content.split("\n");
    const parsed = parseFile(content, language);

    // Find matching element
    const allElements = [
      ...parsed.functions,
      ...parsed.classes,
      ...(parsed.interfaces || []),
      ...(parsed.types || []),
      ...(parsed.variables || []),
    ];

    const element = allElements.find(
      (el) => el.type === target.type && el.name === target.name
    );

    if (!element) {
      return err(parseError.elementNotFound(target.type, target.name));
    }

    // Extract lines
    const start = element.startLine - 1; // 0-indexed
    const end = element.endLine || element.startLine;
    return ok(lines.slice(start, end).join("\n"));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(parseError.parseFailed(language, message));
  }
}

/**
 * Get code skeleton (signatures only)
 */
export function codeSkeleton(content: string, language: SupportedLanguage): string {
  const parsed = parseFile(content, language);
  const lines: string[] = [];

  // Imports (first 5)
  if (parsed.imports && parsed.imports.length > 0) {
    lines.push("// Imports:");
    for (const imp of parsed.imports.slice(0, 5)) {
      lines.push(`//   ${imp.name}`);
    }
    if (parsed.imports.length > 5) {
      lines.push(`//   ... +${parsed.imports.length - 5} more`);
    }
    lines.push("");
  }

  // Classes
  for (const cls of parsed.classes) {
    const sig = cls.signature || `class ${cls.name}`;
    lines.push(sig);
    lines.push("");
  }

  // Interfaces
  if (parsed.interfaces) {
    for (const iface of parsed.interfaces) {
      const sig = iface.signature || `interface ${iface.name}`;
      lines.push(sig);
      lines.push("");
    }
  }

  // Types
  if (parsed.types) {
    for (const type of parsed.types) {
      const sig = type.signature || `type ${type.name}`;
      lines.push(sig);
      lines.push("");
    }
  }

  // Functions
  for (const fn of parsed.functions) {
    const sig = fn.signature || `function ${fn.name}()`;
    lines.push(sig);
  }

  return lines.join("\n");
}

/**
 * Get code skeleton with Result type
 */
export function codeSkeletonResult(
  content: string,
  language: SupportedLanguage
): Result<string, ParseError> {
  try {
    if (language === "unknown") {
      return err(parseError.unsupportedLanguage(language));
    }

    return ok(codeSkeleton(content, language));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(parseError.parseFailed(language, message));
  }
}
