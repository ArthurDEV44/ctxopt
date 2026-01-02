/**
 * TypeScript Search and Extraction
 *
 * Functions for searching and extracting elements from TypeScript code.
 */

import type {
  CodeElement,
  FileStructure,
  ExtractedContent,
  ExtractionTarget,
  ExtractionOptions,
} from "../types.js";
import { parseTypeScript } from "./parser.js";

/**
 * Find identifiers used in a code snippet
 */
function findUsedIdentifiers(code: string): Set<string> {
  const identifiers = new Set<string>();
  const matches = code.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g);
  if (matches) {
    matches.forEach((m) => identifiers.add(m));
  }
  return identifiers;
}

/**
 * Find related imports for extracted code
 */
function findRelatedImports(
  content: string,
  structure: FileStructure,
  extractedCode: string
): string[] {
  const usedIds = findUsedIdentifiers(extractedCode);
  const lines = content.split("\n");
  const imports: string[] = [];

  for (const imp of structure.imports) {
    if (usedIds.has(imp.name)) {
      const importLine = lines[imp.startLine - 1];
      if (importLine && !imports.includes(importLine)) {
        imports.push(importLine);
      }
    }
  }

  return imports;
}

/**
 * Extract a specific element from TypeScript content
 */
export function extractTypeScriptElement(
  content: string,
  target: ExtractionTarget,
  options: ExtractionOptions,
  isTypeScript: boolean = true
): ExtractedContent | null {
  const structure = parseTypeScript(content, isTypeScript);

  // Find the target element
  let element: CodeElement | undefined;

  switch (target.type) {
    case "function":
    case "method":
      element = structure.functions.find((f) => f.name === target.name);
      break;
    case "class":
      element = structure.classes.find((c) => c.name === target.name);
      break;
    case "interface":
      element = structure.interfaces.find((i) => i.name === target.name);
      break;
    case "type":
      element = structure.types.find((t) => t.name === target.name);
      break;
    case "variable":
      element = structure.variables.find((v) => v.name === target.name);
      break;
    case "enum":
      element = structure.enums.find((e) => e.name === target.name);
      break;
    case "constructor":
    case "property":
    case "getter":
    case "setter":
      // Search in class children
      for (const cls of structure.classes) {
        element = cls.children?.find(
          (c) => c.type === target.type && c.name === target.name
        );
        if (element) break;
      }
      break;
  }

  if (!element) {
    return null;
  }

  const lines = content.split("\n");

  // Include documentation if present and requested
  let startLine = element.startLine;
  if (options.includeComments && element.documentation) {
    for (let i = element.startLine - 2; i >= 0; i--) {
      const line = lines[i]?.trim() ?? "";
      if (
        line.startsWith("/**") ||
        line.startsWith("*") ||
        line.startsWith("*/")
      ) {
        startLine = i + 1;
      } else if (line === "") {
        continue;
      } else {
        break;
      }
    }
  }

  // Include decorators
  if (element.decorators && element.decorators.length > 0) {
    for (let i = startLine - 2; i >= 0; i--) {
      const line = lines[i]?.trim() ?? "";
      if (line.startsWith("@")) {
        startLine = i + 1;
      } else if (line === "") {
        continue;
      } else {
        break;
      }
    }
  }

  const extractedLines = lines.slice(startLine - 1, element.endLine);
  const extractedCode = extractedLines.join("\n");

  const relatedImports = options.includeImports
    ? findRelatedImports(content, structure, extractedCode)
    : [];

  return {
    content: extractedCode,
    elements: [element],
    relatedImports,
    startLine,
    endLine: element.endLine,
  };
}

/**
 * Search for elements matching a query
 */
export function searchTypeScriptElements(
  content: string,
  query: string
): CodeElement[] {
  const structure = parseTypeScript(content, true);
  const queryLower = query.toLowerCase();
  const results: CodeElement[] = [];

  const allElements = [
    ...structure.functions,
    ...structure.classes,
    ...structure.interfaces,
    ...structure.types,
    ...structure.variables,
    ...structure.enums,
  ];

  // Also search in class/interface children
  for (const cls of structure.classes) {
    if (cls.children) {
      allElements.push(...cls.children);
    }
  }
  for (const iface of structure.interfaces) {
    if (iface.children) {
      allElements.push(...iface.children);
    }
  }

  for (const element of allElements) {
    if (
      element.name.toLowerCase().includes(queryLower) ||
      element.signature?.toLowerCase().includes(queryLower) ||
      element.documentation?.toLowerCase().includes(queryLower) ||
      element.decorators?.some((d) => d.toLowerCase().includes(queryLower))
    ) {
      results.push(element);
    }
  }

  return results;
}
