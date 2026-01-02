/**
 * Rust Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting Rust-specific constructs.
 *
 * Updated for tree-sitter-rust 0.24+ (2025) with full support for:
 * - Generics and type parameters
 * - Lifetimes ('a, 'static, etc.)
 * - Where clauses
 * - Attributes (#[derive(...)])
 * - Async/unsafe/const functions
 * - Trait bounds
 */

import type Parser from "web-tree-sitter";
type Node = Parser.SyntaxNode;
import type { CodeElement, ElementType, ParameterInfo } from "../types.js";

/**
 * Represents extracted generic/type parameters
 */
export interface TypeParameters {
  raw: string;
  lifetimes: string[];
  typeParams: string[];
  constParams: string[];
}

/**
 * Represents a where clause
 */
export interface WhereClause {
  raw: string;
  predicates: Array<{
    type: string;
    bounds: string[];
  }>;
}

/**
 * Represents an attribute
 */
export interface Attribute {
  name: string;
  arguments?: string;
  isInner: boolean;
}

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
export function getVisibility(node: Node): string | null {
  for (const child of node.children) {
    if (child.type === "visibility_modifier") {
      return child.text;
    }
  }
  return null;
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
    // Also check function_modifiers node
    if (child.type === "function_modifiers") {
      for (const mod of child.children) {
        if (mod.type === "async") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function is unsafe
 */
export function isUnsafeFn(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "unsafe") {
      return true;
    }
    if (child.type === "function_modifiers") {
      for (const mod of child.children) {
        if (mod.type === "unsafe") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function is const
 */
export function isConstFn(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "const") {
      return true;
    }
    if (child.type === "function_modifiers") {
      for (const mod of child.children) {
        if (mod.type === "const") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function is extern
 */
export function isExternFn(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "extern_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Get the extern ABI string (e.g., "C", "system")
 */
export function getExternAbi(node: Node): string | undefined {
  for (const child of node.children) {
    if (child.type === "extern_modifier") {
      const abiNode = child.childForFieldName("abi");
      if (abiNode) {
        // Remove quotes from string literal
        return abiNode.text.replace(/^"|"$/g, "");
      }
      return "C"; // Default ABI
    }
  }
  return undefined;
}

/**
 * Extract type parameters (generics) from a node
 * Handles lifetimes, type params, and const params
 */
export function getTypeParameters(node: Node): TypeParameters | undefined {
  const typeParamsNode = node.childForFieldName("type_parameters");
  if (!typeParamsNode) return undefined;

  const lifetimes: string[] = [];
  const typeParams: string[] = [];
  const constParams: string[] = [];

  for (const child of typeParamsNode.children) {
    switch (child.type) {
      case "lifetime":
        lifetimes.push(child.text);
        break;
      case "type_identifier":
        typeParams.push(child.text);
        break;
      case "constrained_type_parameter":
        // e.g., T: Clone + Send
        typeParams.push(child.text);
        break;
      case "optional_type_parameter":
        // e.g., T = Default
        typeParams.push(child.text);
        break;
      case "const_parameter":
        // e.g., const N: usize
        constParams.push(child.text);
        break;
    }
  }

  return {
    raw: typeParamsNode.text,
    lifetimes,
    typeParams,
    constParams,
  };
}

/**
 * Extract where clause from a node
 */
export function getWhereClause(node: Node): WhereClause | undefined {
  let whereNode: Node | null = null;

  // Look for where_clause in children
  for (const child of node.children) {
    if (child.type === "where_clause") {
      whereNode = child;
      break;
    }
  }

  if (!whereNode) return undefined;

  const predicates: Array<{ type: string; bounds: string[] }> = [];

  for (const child of whereNode.children) {
    if (child.type === "where_predicate") {
      const leftNode = child.childForFieldName("left");
      const boundsNode = child.childForFieldName("bounds");

      if (leftNode) {
        const bounds: string[] = [];
        if (boundsNode) {
          // Extract individual bounds
          for (const bound of boundsNode.children) {
            if (bound.type !== "+" && bound.type !== ",") {
              bounds.push(bound.text);
            }
          }
        }
        predicates.push({
          type: leftNode.text,
          bounds,
        });
      }
    }
  }

  return {
    raw: whereNode.text,
    predicates,
  };
}

/**
 * Extract attributes from above a node
 */
export function getAttributes(node: Node): Attribute[] {
  const attributes: Attribute[] = [];

  // Look for preceding sibling attribute_item nodes
  let sibling = node.previousSibling;
  while (sibling) {
    if (sibling.type === "attribute_item") {
      const attr = sibling.child(0);
      if (attr && attr.type === "attribute") {
        const nameNode = attr.child(0);
        const argsNode = attr.childForFieldName("arguments");
        if (nameNode) {
          attributes.unshift({
            name: nameNode.text,
            arguments: argsNode?.text,
            isInner: false,
          });
        }
      }
    } else if (sibling.type === "line_comment" || sibling.type === "block_comment") {
      // Skip comments
    } else {
      break;
    }
    sibling = sibling.previousSibling;
  }

  return attributes;
}

/**
 * Check if node has a specific attribute
 */
export function hasAttribute(node: Node, attrName: string): boolean {
  const attrs = getAttributes(node);
  return attrs.some((a) => a.name === attrName || a.name.startsWith(`${attrName}(`));
}

/**
 * Get derive macros from attributes
 */
export function getDerives(node: Node): string[] {
  const attrs = getAttributes(node);
  const derives: string[] = [];

  for (const attr of attrs) {
    if (attr.name === "derive" && attr.arguments) {
      // Parse (Debug, Clone, PartialEq) format
      const inner = attr.arguments.slice(1, -1); // Remove parentheses
      const items = inner.split(",").map((s) => s.trim());
      derives.push(...items);
    }
  }

  return derives;
}

/**
 * Extract trait bounds from a type (e.g., T: Clone + Send)
 */
export function getTraitBounds(node: Node): string[] {
  const boundsNode = node.childForFieldName("bounds");
  if (!boundsNode) return [];

  const bounds: string[] = [];
  for (const child of boundsNode.children) {
    if (child.type !== "+" && child.type !== ":") {
      bounds.push(child.text);
    }
  }
  return bounds;
}

/**
 * Get function signature from a function_item node
 * Includes: visibility, modifiers (async/unsafe/const/extern), generics, params, return type, where clause
 */
export function getFunctionSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const returnTypeNode = node.childForFieldName("return_type");
  const typeParams = getTypeParameters(node);
  const whereClause = getWhereClause(node);

  const visibility = getVisibility(node);
  const isAsync = isAsyncFn(node);
  const isUnsafe = isUnsafeFn(node);
  const isConst = isConstFn(node);
  const isExtern = isExternFn(node);
  const externAbi = isExtern ? getExternAbi(node) : undefined;

  const name = nameNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const params = paramsNode?.text ?? "()";
  const returnType = returnTypeNode ? ` -> ${returnTypeNode.text}` : "";
  const where = whereClause ? ` ${whereClause.raw}` : "";

  const modifiers: (string | null)[] = [
    visibility,
    isConst ? "const" : null,
    isAsync ? "async" : null,
    isUnsafe ? "unsafe" : null,
    isExtern ? (externAbi ? `extern "${externAbi}"` : "extern") : null,
    "fn",
  ];

  const prefix = modifiers.filter(Boolean).join(" ");

  return `${prefix} ${name}${generics}${params}${returnType}${where}`;
}

/**
 * Get struct signature with generics and where clause
 */
export function getStructSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeParams = getTypeParameters(node);
  const whereClause = getWhereClause(node);
  const visibility = getVisibility(node);

  const name = nameNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const where = whereClause ? ` ${whereClause.raw}` : "";

  const prefix = [visibility, "struct"].filter(Boolean).join(" ");
  return `${prefix} ${name}${generics}${where}`;
}

/**
 * Get enum signature with generics and where clause
 */
export function getEnumSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeParams = getTypeParameters(node);
  const whereClause = getWhereClause(node);
  const visibility = getVisibility(node);

  const name = nameNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const where = whereClause ? ` ${whereClause.raw}` : "";

  const prefix = [visibility, "enum"].filter(Boolean).join(" ");
  return `${prefix} ${name}${generics}${where}`;
}

/**
 * Get trait signature with generics, bounds, and where clause
 * Updated 2025: includes unsafe modifier
 */
export function getTraitSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeParams = getTypeParameters(node);
  const boundsNode = node.childForFieldName("bounds");
  const whereClause = getWhereClause(node);
  const visibility = getVisibility(node);

  // Check for unsafe trait
  let isUnsafe = false;
  for (const child of node.children) {
    if (child.type === "unsafe") {
      isUnsafe = true;
      break;
    }
  }

  const name = nameNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const bounds = boundsNode ? `: ${boundsNode.text}` : "";
  const where = whereClause ? ` ${whereClause.raw}` : "";

  const prefix = [visibility, isUnsafe ? "unsafe" : null, "trait"].filter(Boolean).join(" ");
  return `${prefix} ${name}${generics}${bounds}${where}`;
}

/**
 * Check if impl is unsafe
 */
export function isUnsafeImpl(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "unsafe") {
      return true;
    }
  }
  return false;
}

/**
 * Get impl block signature with full generics, trait, and where clause
 */
export function getImplSignature(node: Node): string {
  const typeNode = node.childForFieldName("type");
  const traitNode = node.childForFieldName("trait");
  const typeParams = getTypeParameters(node);
  const whereClause = getWhereClause(node);
  const isUnsafe = isUnsafeImpl(node);

  const typeName = typeNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const where = whereClause ? ` ${whereClause.raw}` : "";
  const unsafePrefix = isUnsafe ? "unsafe " : "";

  if (traitNode) {
    return `${unsafePrefix}impl${generics} ${traitNode.text} for ${typeName}${where}`;
  }
  return `${unsafePrefix}impl${generics} ${typeName}${where}`;
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
 * Get type alias signature with generics and aliased type
 */
export function getTypeAliasSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");
  const typeParams = getTypeParameters(node);
  const whereClause = getWhereClause(node);
  const visibility = getVisibility(node);

  const name = nameNode?.text ?? "unknown";
  const generics = typeParams?.raw ?? "";
  const aliasedType = typeNode ? ` = ${typeNode.text}` : "";
  const where = whereClause ? ` ${whereClause.raw}` : "";

  const prefix = [visibility, "type"].filter(Boolean).join(" ");
  return `${prefix} ${name}${generics}${aliasedType}${where}`;
}

/**
 * Get macro_rules! signature
 */
export function getMacroSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";

  // Count macro rules/arms
  let ruleCount = 0;
  for (const child of node.children) {
    if (child.type === "macro_rule") {
      ruleCount++;
    }
  }

  return `macro_rules! ${name} { /* ${ruleCount} rule${ruleCount !== 1 ? "s" : ""} */ }`;
}

/**
 * Get module signature
 */
export function getModSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const bodyNode = node.childForFieldName("body");
  const visibility = getVisibility(node);

  const name = nameNode?.text ?? "unknown";
  const hasBody = bodyNode !== null;

  const prefix = [visibility, "mod"].filter(Boolean).join(" ");

  if (hasBody) {
    return `${prefix} ${name} { ... }`;
  }
  return `${prefix} ${name}`;
}

/**
 * Get extern crate signature
 */
export function getExternCrateSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const aliasNode = node.childForFieldName("alias");
  const visibility = getVisibility(node);

  const name = nameNode?.text ?? "unknown";
  const alias = aliasNode ? ` as ${aliasNode.text}` : "";

  const prefix = [visibility, "extern crate"].filter(Boolean).join(" ");
  return `${prefix} ${name}${alias}`;
}

/**
 * Get static/const item signature with mutability
 */
export function getStaticSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");
  const visibility = getVisibility(node);

  // Check for mutable_specifier
  let isMutable = false;
  for (const child of node.children) {
    if (child.type === "mutable_specifier") {
      isMutable = true;
      break;
    }
  }

  const name = nameNode?.text ?? "unknown";
  const typePart = typeNode ? `: ${typeNode.text}` : "";

  const prefix = [visibility, "static", isMutable ? "mut" : null]
    .filter(Boolean)
    .join(" ");
  return `${prefix} ${name}${typePart}`;
}

/**
 * Get associated type signature (in traits)
 */
export function getAssociatedTypeSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const boundsNode = node.childForFieldName("bounds");
  const defaultNode = node.childForFieldName("default_type");

  const name = nameNode?.text ?? "unknown";
  const bounds = boundsNode ? `: ${boundsNode.text}` : "";
  const defaultType = defaultNode ? ` = ${defaultNode.text}` : "";

  return `type ${name}${bounds}${defaultType}`;
}

/**
 * Create a CodeElement from a Tree-sitter node
 * Enhanced to support metadata for Rust-specific information
 * Updated 2025: Added support for parameters, generics, returnType
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
    metadata?: Record<string, unknown>;
    // Enhanced options (2025)
    parameters?: ParameterInfo[];
    generics?: string[];
    returnType?: string;
    decorators?: string[];
  }
): CodeElement {
  const element: CodeElement = {
    type,
    name,
    startLine: getLineNumber(node),
    endLine: getEndLineNumber(node),
  };

  // Only add optional properties if they have values
  if (options?.signature) element.signature = options.signature;
  if (options?.documentation) element.documentation = options.documentation;
  if (options?.isAsync) element.isAsync = options.isAsync;
  if (options?.isExported) element.isExported = options.isExported;
  if (options?.parent) element.parent = options.parent;

  // Enhanced properties (2025)
  if (options?.parameters?.length) element.parameters = options.parameters;
  if (options?.generics?.length) element.generics = options.generics;
  if (options?.returnType) element.returnType = options.returnType;
  if (options?.decorators?.length) element.decorators = options.decorators;

  // Add metadata if provided (for Rust-specific info like derives, unsafe, etc.)
  if (options?.metadata) {
    (element as CodeElement & { metadata?: Record<string, unknown> }).metadata =
      options.metadata;
  }

  return element;
}

/**
 * Extract detailed parameter information from a function_item node
 * Returns an array of ParameterInfo objects with name, type, etc.
 *
 * @example
 * fn process(&self, name: String, count: usize) -> Result<(), Error>
 * Returns: [
 *   { name: "self", type: "&Self" },
 *   { name: "name", type: "String" },
 *   { name: "count", type: "usize" }
 * ]
 */
export function getParameterInfoList(node: Node): ParameterInfo[] {
  const params: ParameterInfo[] = [];

  const paramsNode = node.childForFieldName("parameters");
  if (!paramsNode) return params;

  for (const child of paramsNode.namedChildren) {
    switch (child.type) {
      case "self_parameter": {
        // &self, &mut self, self, mut self
        const isMutable = child.text.includes("mut");
        const isRef = child.text.includes("&");
        let selfType = "Self";
        if (isRef) {
          selfType = isMutable ? "&mut Self" : "&Self";
        }
        params.push({
          name: "self",
          type: selfType,
        });
        break;
      }

      case "parameter": {
        // Regular parameter: name: Type
        const patternNode = child.childForFieldName("pattern");
        const typeNode = child.childForFieldName("type");

        let paramName = "unknown";
        if (patternNode) {
          // Handle different pattern types
          if (patternNode.type === "identifier") {
            paramName = patternNode.text;
          } else if (patternNode.type === "mut_pattern") {
            // mut x
            const innerIdent = patternNode.firstNamedChild;
            paramName = innerIdent?.text ?? "unknown";
          } else if (patternNode.type === "ref_pattern") {
            // ref x or ref mut x
            const innerIdent = patternNode.namedChildren.find(
              (n) => n.type === "identifier"
            );
            paramName = innerIdent?.text ?? "unknown";
          } else {
            paramName = patternNode.text;
          }
        }

        params.push({
          name: paramName,
          type: typeNode?.text,
        });
        break;
      }

      case "variadic_parameter": {
        // ... for variadic functions (extern "C")
        params.push({
          name: "...",
          isRest: true,
        });
        break;
      }
    }
  }

  return params;
}

/**
 * Get lifetimes from a node's type parameters
 */
export function getLifetimes(node: Node): string[] {
  const typeParams = getTypeParameters(node);
  return typeParams?.lifetimes ?? [];
}

/**
 * Get generic type parameters (without lifetimes)
 */
export function getGenericTypeParams(node: Node): string[] {
  const typeParams = getTypeParameters(node);
  return typeParams?.typeParams ?? [];
}

/**
 * Get const generic parameters
 */
export function getConstGenericParams(node: Node): string[] {
  const typeParams = getTypeParameters(node);
  return typeParams?.constParams ?? [];
}

/**
 * Extract return type from a function_item node
 */
export function getReturnType(node: Node): string | undefined {
  const returnTypeNode = node.childForFieldName("return_type");
  return returnTypeNode?.text;
}

/**
 * Check if a function returns impl Trait
 */
export function returnsImplTrait(node: Node): boolean {
  const returnTypeNode = node.childForFieldName("return_type");
  if (!returnTypeNode) return false;

  // Look for abstract_type (impl Trait syntax)
  for (const child of returnTypeNode.descendantsOfType("abstract_type")) {
    if (child) return true;
  }
  return returnTypeNode.text.includes("impl ");
}

/**
 * Check if a trait is unsafe
 */
export function isUnsafeTrait(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "unsafe") {
      return true;
    }
  }
  return false;
}

/**
 * Get all derive macros and attributes as decorator-like strings
 */
export function getDecoratorsFromAttributes(node: Node): string[] {
  const decorators: string[] = [];
  const attrs = getAttributes(node);

  for (const attr of attrs) {
    if (attr.arguments) {
      decorators.push(`${attr.name}(${attr.arguments.slice(1, -1)})`);
    } else {
      decorators.push(attr.name);
    }
  }

  return decorators;
}
