/**
 * Rust Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting Rust-specific constructs.
 */

import type Parser from "web-tree-sitter";
type Node = Parser.SyntaxNode;
import type { CodeElement, ElementType } from "../types.js";

/**
 * Get line number from a Tree-sitter node (1-indexed)
 */
export function getLineNumber(node: Node): number {
  return node.startPosition.row + 1;
}

/**
 * Get end line number from a Tree-sitter node (1-indexed)
 */
export function getEndLineNumber(node: Node): number {
  return node.endPosition.row + 1;
}

/**
 * Extract Rust doc comment from above a declaration
 * Rust uses /// and //! for doc comments, or block doc comments
 */
export function extractRustDoc(node: Node, lines: string[]): string | undefined {
  const startLine = node.startPosition.row;
  const comments: string[] = [];

  // Look for doc comments above the node
  // Skip attributes like #[derive(...)] and continue looking
  for (let i = startLine - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) {
      // Empty line - continue looking
      continue;
    } else if (line.startsWith("///")) {
      // Outer doc comment
      comments.unshift(line.slice(3).trim());
    } else if (line.startsWith("//!")) {
      // Inner doc comment (module-level)
      comments.unshift(line.slice(3).trim());
    } else if (line.startsWith("#[") || line.startsWith("#![")) {
      // Attribute - skip and continue looking for doc comments
      continue;
    } else if (line.startsWith("//")) {
      // Regular comment - skip and continue
      continue;
    } else {
      // Something else (code) - stop
      break;
    }
  }

  return comments.length > 0 ? comments.join("\n") : undefined;
}

/**
 * Check if a node has a visibility modifier (pub, pub(crate), etc.)
 */
export function hasVisibility(node: Node): boolean {
  const visibilityNode = node.childForFieldName("visibility_modifier");
  if (visibilityNode) return true;

  // Also check first child for visibility_modifier
  for (const child of node.children) {
    if (child.type === "visibility_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Get visibility string from a node
 */
export function getVisibility(node: Node): string | undefined {
  for (const child of node.children) {
    if (child.type === "visibility_modifier") {
      return child.text;
    }
  }
  return undefined;
}

/**
 * Check if a function is async
 */
export function isAsyncFn(node: Node): boolean {
  // Check for async keyword in function modifiers
  for (const child of node.children) {
    if (child.type === "async") {
      return true;
    }
  }
  // Also check the text for async keyword (may have pub async, etc.)
  const text = node.text.trimStart();
  // Match patterns like "async fn", "pub async fn", "pub(crate) async fn"
  return /^(?:pub(?:\([^)]*\))?\s+)?async\s+fn\s/.test(text);
}

/**
 * Get function signature from a function_item node
 */
export function getFunctionSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const returnTypeNode = node.childForFieldName("return_type");

  const visibility = getVisibility(node);
  const isAsync = isAsyncFn(node);
  const name = nameNode?.text ?? "unknown";
  const params = paramsNode?.text ?? "()";
  const returnType = returnTypeNode ? ` -> ${returnTypeNode.text}` : "";

  const prefix = [visibility, isAsync ? "async" : null, "fn"]
    .filter(Boolean)
    .join(" ");

  return `${prefix} ${name}${params}${returnType}`;
}

/**
 * Get struct signature
 */
export function getStructSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const visibility = getVisibility(node);
  const name = nameNode?.text ?? "unknown";

  const prefix = [visibility, "struct"].filter(Boolean).join(" ");
  return `${prefix} ${name}`;
}

/**
 * Get enum signature
 */
export function getEnumSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const visibility = getVisibility(node);
  const name = nameNode?.text ?? "unknown";

  const prefix = [visibility, "enum"].filter(Boolean).join(" ");
  return `${prefix} ${name}`;
}

/**
 * Get trait signature
 */
export function getTraitSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const visibility = getVisibility(node);
  const name = nameNode?.text ?? "unknown";

  const prefix = [visibility, "trait"].filter(Boolean).join(" ");
  return `${prefix} ${name}`;
}

/**
 * Get impl block signature
 */
export function getImplSignature(node: Node): string {
  const typeNode = node.childForFieldName("type");
  const traitNode = node.childForFieldName("trait");

  const typeName = typeNode?.text ?? "unknown";

  if (traitNode) {
    return `impl ${traitNode.text} for ${typeName}`;
  }
  return `impl ${typeName}`;
}

/**
 * Get the type name from an impl block
 */
export function getImplTypeName(node: Node): string {
  const typeNode = node.childForFieldName("type");
  return typeNode?.text ?? "unknown";
}

/**
 * Get the trait name from an impl block (if implementing a trait)
 */
export function getImplTraitName(node: Node): string | undefined {
  const traitNode = node.childForFieldName("trait");
  return traitNode?.text;
}

/**
 * Extract the use path from a use_declaration
 */
export function getUsePath(node: Node): string {
  // The use path is typically the text minus "use " and ";"
  const text = node.text.trim();
  // Remove "use " prefix and trailing ";"
  let path = text;
  if (path.startsWith("use ")) {
    path = path.slice(4);
  }
  if (path.endsWith(";")) {
    path = path.slice(0, -1);
  }
  return path.trim();
}

/**
 * Get the short name from a use path
 * e.g., "std::collections::HashMap" -> "HashMap"
 */
export function getUseShortName(usePath: string): string {
  // Handle "as Alias" syntax
  const asMatch = usePath.match(/\s+as\s+(\w+)\s*$/);
  if (asMatch) {
    return asMatch[1]!;
  }

  // Handle brace syntax: use std::{A, B} or use std::io::{self, Read}
  const braceMatch = usePath.match(/::?\{(.+)\}\s*$/);
  if (braceMatch) {
    const items = braceMatch[1]!.split(",").map((s) => s.trim());
    // Return first non-self item or the full set
    const nonSelf = items.filter((i) => i !== "self");
    if (nonSelf.length === 1) {
      return nonSelf[0]!;
    }
    return `{${items.join(", ")}}`;
  }

  // Handle glob: use std::*
  if (usePath.endsWith("::*")) {
    const parts = usePath.slice(0, -3).split("::");
    return `${parts[parts.length - 1]}::*`;
  }

  // Simple path: use std::collections::HashMap
  const parts = usePath.split("::");
  return parts[parts.length - 1] ?? usePath;
}

/**
 * Get const/static signature
 */
export function getConstSignature(node: Node, kind: "const" | "static"): string {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");
  const visibility = getVisibility(node);
  const name = nameNode?.text ?? "unknown";
  const typePart = typeNode ? `: ${typeNode.text}` : "";

  const prefix = [visibility, kind].filter(Boolean).join(" ");
  return `${prefix} ${name}${typePart}`;
}

/**
 * Get type alias signature
 */
export function getTypeAliasSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const visibility = getVisibility(node);
  const name = nameNode?.text ?? "unknown";

  const prefix = [visibility, "type"].filter(Boolean).join(" ");
  return `${prefix} ${name}`;
}

/**
 * Create a CodeElement from a Tree-sitter node
 */
export function createCodeElement(
  type: ElementType,
  name: string,
  node: Node,
  options?: {
    signature?: string;
    documentation?: string;
    isAsync?: boolean;
    isExported?: boolean;
    parent?: string;
  }
): CodeElement {
  return {
    type,
    name,
    startLine: getLineNumber(node),
    endLine: getEndLineNumber(node),
    signature: options?.signature,
    documentation: options?.documentation,
    isAsync: options?.isAsync,
    isExported: options?.isExported,
    parent: options?.parent,
  };
}
