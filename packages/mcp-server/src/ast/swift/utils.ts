/**
 * Swift Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting Swift-specific constructs.
 *
 * Updated for Swift 6+ features including:
 * - Actors and distributed actors
 * - Async/await and Sendable
 * - Typed throws
 * - Nonisolated and isolated
 * - Macros
 * - Property wrappers
 * - Global actors (@MainActor)
 *
 * @see https://docs.swift.org/swift-book/
 * @see https://github.com/swiftlang/swift-evolution
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
 * Extract Swift documentation comment from above a declaration
 * Swift uses /// for single-line doc comments and block comments
 */
export function extractSwiftDoc(node: Node, lines: string[]): string | undefined {
  const startLine = node.startPosition.row;
  const comments: string[] = [];

  // Look for doc comments above the node
  for (let i = startLine - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) {
      // Empty line - continue looking
      continue;
    } else if (line.startsWith("///")) {
      // Single-line doc comment
      const content = line.slice(3).trim();
      if (content) comments.unshift(content);
    } else if (line.endsWith("*/")) {
      // End of block comment - look for the start
      for (let j = i; j >= 0; j--) {
        const commentLine = lines[j]?.trim();
        if (commentLine?.startsWith("/**")) {
          // Found start of doc block
          for (let k = j; k <= i; k++) {
            let cl = lines[k]?.trim() ?? "";
            // Clean up comment markers
            if (cl.startsWith("/**")) cl = cl.slice(3).trim();
            if (cl.endsWith("*/")) cl = cl.slice(0, -2).trim();
            if (cl.startsWith("*")) cl = cl.slice(1).trim();
            if (cl) comments.push(cl);
          }
          break;
        }
      }
      break;
    } else if (line.startsWith("*")) {
      // Middle of block comment
      continue;
    } else if (line.startsWith("//") && !line.startsWith("///")) {
      // Regular comment - skip
      continue;
    } else if (line.startsWith("@")) {
      // Attribute like @available, @discardableResult - continue
      continue;
    } else {
      // Something else (code) - stop
      break;
    }
  }

  return comments.length > 0 ? comments.join("\n") : undefined;
}

/**
 * Swift access levels
 */
export type SwiftAccessLevel = "private" | "fileprivate" | "internal" | "public" | "open" | "package";

/**
 * Swift function modifiers (Swift 6+)
 */
export interface SwiftFunctionModifiers {
  accessLevel?: SwiftAccessLevel;
  isStatic: boolean;
  isClass: boolean;
  isAsync: boolean;
  isThrowing: boolean;
  isRethrows: boolean;
  throwsType?: string; // For typed throws: throws(MyError)
  isNonisolated: boolean;
  isMutating: boolean;
  isNonmutating: boolean;
  isOverride: boolean;
  isFinal: boolean;
  isRequired: boolean;
  isConvenience: boolean;
  isOptional: boolean;
  isDistributed: boolean;
  attributes: SwiftAttribute[];
}

/**
 * Swift attribute information
 */
export interface SwiftAttribute {
  name: string;
  arguments?: string;
}

/**
 * Swift type modifiers
 */
export interface SwiftTypeModifiers {
  accessLevel?: SwiftAccessLevel;
  isFinal: boolean;
  isDistributed: boolean;
  attributes: SwiftAttribute[];
}

/**
 * Get access level from a node
 */
export function getAccessLevel(node: Node): SwiftAccessLevel | undefined {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        const text = modifier.text;
        if (
          text === "private" ||
          text === "fileprivate" ||
          text === "internal" ||
          text === "public" ||
          text === "open" ||
          text === "package"
        ) {
          return text as SwiftAccessLevel;
        }
      }
    }
    // Also check for direct visibility_modifier nodes
    if (child.type === "visibility_modifier") {
      const text = child.text;
      if (
        text === "private" ||
        text === "fileprivate" ||
        text === "internal" ||
        text === "public" ||
        text === "open" ||
        text === "package"
      ) {
        return text as SwiftAccessLevel;
      }
    }
  }
  return undefined;
}

/**
 * Check if a node has public or open visibility (external API)
 */
export function isPublic(node: Node): boolean {
  const accessLevel = getAccessLevel(node);
  return accessLevel === "public" || accessLevel === "open" || accessLevel === undefined;
}

/**
 * Check if a function/method is async
 */
export function isAsync(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "async") {
          return true;
        }
      }
    }
    // Check in function signature
    if (child.type === "function_signature") {
      for (const sigChild of child.children) {
        if (sigChild.text === "async" || sigChild.type === "async") {
          return true;
        }
      }
    }
    if (child.text === "async") {
      return true;
    }
  }
  return false;
}

/**
 * Check if a function/method throws
 */
export function isThrowing(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "function_signature") {
      for (const sigChild of child.children) {
        if (sigChild.type === "throws" || sigChild.text?.includes("throws")) {
          return true;
        }
      }
    }
    if (child.type === "throws" || child.text === "throws") {
      return true;
    }
  }
  return false;
}

/**
 * Check if a function/method uses rethrows
 */
export function isRethrows(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "function_signature") {
      for (const sigChild of child.children) {
        if (sigChild.text === "rethrows") {
          return true;
        }
      }
    }
    if (child.text === "rethrows") {
      return true;
    }
  }
  return false;
}

/**
 * Get typed throws type (Swift 6+)
 * e.g., throws(MyError) returns "MyError"
 */
export function getTypedThrowsType(node: Node): string | undefined {
  for (const child of node.children) {
    if (child.type === "function_signature") {
      for (const sigChild of child.children) {
        if (sigChild.type === "throws") {
          // Look for the error type in throws(ErrorType)
          const match = sigChild.text.match(/throws\s*\(\s*(\w+)\s*\)/);
          if (match) {
            return match[1];
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Check if a node has static modifier
 */
export function isStatic(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "static") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a node has class modifier (class func/var)
 */
export function isClassMember(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "class") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function/method is nonisolated (Swift Concurrency)
 */
export function isNonisolated(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "nonisolated" || modifier.text?.startsWith("nonisolated")) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a node is distributed (distributed actor/func)
 */
export function isDistributed(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "distributed") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function is mutating
 */
export function isMutating(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "mutating") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a function is nonmutating
 */
export function isNonmutating(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "nonmutating") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a node has override modifier
 */
export function isOverride(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "override") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if a node has final modifier
 */
export function isFinal(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === "final") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Extract attributes from a node
 */
export function extractAttributes(node: Node): SwiftAttribute[] {
  const attributes: SwiftAttribute[] = [];

  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.type === "attribute") {
          const attrText = modifier.text;
          // Parse @AttributeName or @AttributeName(args)
          const match = attrText.match(/^@(\w+)(?:\((.*)\))?$/);
          if (match) {
            attributes.push({
              name: match[1]!,
              arguments: match[2],
            });
          } else {
            // Simple attribute
            attributes.push({ name: attrText.replace("@", "") });
          }
        }
      }
    }
  }

  return attributes;
}

/**
 * Check if a node has @MainActor attribute
 */
export function isMainActor(node: Node): boolean {
  const attrs = extractAttributes(node);
  return attrs.some((a) => a.name === "MainActor");
}

/**
 * Check if a node has @Sendable attribute
 */
export function isSendable(node: Node): boolean {
  const attrs = extractAttributes(node);
  return attrs.some((a) => a.name === "Sendable");
}

/**
 * Get all function modifiers (comprehensive extraction)
 */
export function getFunctionModifiers(node: Node): SwiftFunctionModifiers {
  return {
    accessLevel: getAccessLevel(node),
    isStatic: isStatic(node),
    isClass: isClassMember(node),
    isAsync: isAsync(node),
    isThrowing: isThrowing(node),
    isRethrows: isRethrows(node),
    throwsType: getTypedThrowsType(node),
    isNonisolated: isNonisolated(node),
    isMutating: isMutating(node),
    isNonmutating: isNonmutating(node),
    isOverride: isOverride(node),
    isFinal: isFinal(node),
    isRequired: hasModifier(node, "required"),
    isConvenience: hasModifier(node, "convenience"),
    isOptional: hasModifier(node, "optional"),
    isDistributed: isDistributed(node),
    attributes: extractAttributes(node),
  };
}

/**
 * Helper to check for a specific modifier
 */
function hasModifier(node: Node, modifierName: string): boolean {
  for (const child of node.children) {
    if (child.type === "modifiers") {
      for (const modifier of child.children) {
        if (modifier.text === modifierName) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Get function signature from a function_declaration node
 */
export function getFunctionSignature(node: Node): string {
  const parts: string[] = [];
  const modifiers = getFunctionModifiers(node);

  // Attributes (e.g., @MainActor, @discardableResult)
  for (const attr of modifiers.attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  // Access level
  if (modifiers.accessLevel && modifiers.accessLevel !== "internal") {
    parts.push(modifiers.accessLevel);
  }

  // Other modifiers
  if (modifiers.isDistributed) parts.push("distributed");
  if (modifiers.isNonisolated) parts.push("nonisolated");
  if (modifiers.isOverride) parts.push("override");
  if (modifiers.isFinal) parts.push("final");
  if (modifiers.isRequired) parts.push("required");
  if (modifiers.isConvenience) parts.push("convenience");
  if (modifiers.isOptional) parts.push("optional");
  if (modifiers.isStatic) parts.push("static");
  if (modifiers.isClass) parts.push("class");
  if (modifiers.isMutating) parts.push("mutating");
  if (modifiers.isNonmutating) parts.push("nonmutating");

  parts.push("func");

  // Function name
  const nameNode = node.childForFieldName("name");
  let name = nameNode?.text ?? "unknown";

  // Look for simple_identifier if name field not found
  if (name === "unknown") {
    for (const child of node.children) {
      if (child.type === "simple_identifier") {
        name = child.text;
        break;
      }
    }
  }

  // Generic parameters
  let genericParams = "";
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      genericParams = child.text;
      break;
    }
  }

  // Parameters
  let params = "()";
  for (const child of node.children) {
    if (child.type === "parameter_clause" || child.type === "function_signature") {
      const paramClause =
        child.type === "function_signature"
          ? child.children.find((c) => c.type === "parameter_clause")
          : child;
      if (paramClause) {
        params = paramClause.text;
      }
      break;
    }
  }

  // Async
  const asyncPart = modifiers.isAsync ? " async" : "";

  // Throws
  let throwsPart = "";
  if (modifiers.throwsType) {
    throwsPart = ` throws(${modifiers.throwsType})`;
  } else if (modifiers.isRethrows) {
    throwsPart = " rethrows";
  } else if (modifiers.isThrowing) {
    throwsPart = " throws";
  }

  // Return type
  let returnType = "";
  for (const child of node.children) {
    if (child.type === "function_signature") {
      const returnClause = child.children.find((c) => c.type === "function_result");
      if (returnClause) {
        returnType = ` ${returnClause.text}`;
      }
      break;
    }
  }

  // Where clause
  let whereClause = "";
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      whereClause = ` ${child.text}`;
      break;
    }
  }

  parts.push(`${name}${genericParams}${params}${asyncPart}${throwsPart}${returnType}${whereClause}`);

  return parts.join(" ");
}

/**
 * Get method signature (same as function but with receiver context)
 */
export function getMethodSignature(node: Node): string {
  return getFunctionSignature(node);
}

/**
 * Get class signature
 */
export function getClassSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  // Check for final modifier
  if (isFinal(node)) {
    parts.push("final");
  }

  parts.push("class");

  // Class name - look for type_identifier
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Inheritance clause
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause" || child.type === "inheritance_specifier") {
      parts.push(child.text);
      break;
    }
  }

  // Where clause
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get actor signature (Swift 5.5+)
 */
export function getActorSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  // Check for distributed modifier
  if (isDistributed(node)) {
    parts.push("distributed");
  }

  parts.push("actor");

  // Actor name - look for type_identifier
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Inheritance clause
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause" || child.type === "inheritance_specifier") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get struct signature
 */
export function getStructSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("struct");

  // Struct name - look for type_identifier
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Inheritance clause (protocols)
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause" || child.type === "inheritance_specifier") {
      parts.push(child.text);
      break;
    }
  }

  // Where clause
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get protocol signature
 */
export function getProtocolSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("protocol");

  // Protocol name - look for type_identifier
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Inheritance clause
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause" || child.type === "inheritance_specifier") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get enum signature
 */
export function getEnumSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("enum");

  // Enum name - look for type_identifier
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Raw type or protocol conformance
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause" || child.type === "inheritance_specifier") {
      parts.push(child.text);
      break;
    }
  }

  // Where clause
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get extension signature
 */
export function getExtensionSignature(node: Node): string {
  const parts: string[] = [];

  // Attributes
  const attributes = extractAttributes(node);
  for (const attr of attributes) {
    if (attr.arguments) {
      parts.push(`@${attr.name}(${attr.arguments})`);
    } else {
      parts.push(`@${attr.name}`);
    }
  }

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("extension");

  // Extended type
  for (const child of node.children) {
    if (child.type === "type_identifier" || child.type === "user_type") {
      parts.push(child.text);
      break;
    }
  }

  // Protocol conformance
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause") {
      parts.push(child.text);
      break;
    }
  }

  // Where clause
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get typealias signature
 */
export function getTypealiasSignature(node: Node): string {
  const parts: string[] = [];

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("typealias");

  // Typealias name
  const nameNode = node.childForFieldName("name");
  let name = nameNode?.text ?? "unknown";

  // Look for type_identifier if name field not found
  if (name === "unknown") {
    for (const child of node.children) {
      if (child.type === "type_identifier") {
        name = child.text;
        break;
      }
    }
  }
  parts.push(name);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Type assignment
  for (const child of node.children) {
    if (child.type === "type_annotation" || child.text.startsWith("=")) {
      // Get the type after =
      const typeText = child.text.replace(/^=\s*/, "");
      if (typeText) {
        parts.push("=", typeText);
      }
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get macro signature (Swift 5.9+)
 */
export function getMacroSignature(node: Node): string {
  const parts: string[] = [];

  const accessLevel = getAccessLevel(node);
  if (accessLevel && accessLevel !== "internal") {
    parts.push(accessLevel);
  }

  parts.push("macro");

  // Macro name
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "simple_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Parameters
  let params = "";
  for (const child of node.children) {
    if (child.type === "parameter_clause") {
      params = child.text;
      break;
    }
  }

  if (params) {
    parts[parts.length - 1] += params;
  }

  // Return type
  for (const child of node.children) {
    if (child.type === "function_result") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get subscript signature
 */
export function getSubscriptSignature(node: Node): string {
  const parts: string[] = [];
  const modifiers = getFunctionModifiers(node);

  // Access level
  if (modifiers.accessLevel && modifiers.accessLevel !== "internal") {
    parts.push(modifiers.accessLevel);
  }

  // Other modifiers
  if (modifiers.isStatic) parts.push("static");
  if (modifiers.isClass) parts.push("class");

  parts.push("subscript");

  // Generic parameters
  let genericParams = "";
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      genericParams = child.text;
      break;
    }
  }

  // Parameters
  let params = "()";
  for (const child of node.children) {
    if (child.type === "parameter_clause") {
      params = child.text;
      break;
    }
  }

  parts[parts.length - 1] += genericParams + params;

  // Return type
  for (const child of node.children) {
    if (child.type === "function_result") {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get operator signature
 */
export function getOperatorSignature(node: Node): string {
  // Get the raw text and clean it up
  const text = node.text.trim();
  return text.split("\n")[0] ?? text;
}

/**
 * Get associated type signature
 */
export function getAssociatedTypeSignature(node: Node): string {
  const parts: string[] = [];

  parts.push("associatedtype");

  // Name
  let name = "unknown";
  for (const child of node.children) {
    if (child.type === "type_identifier") {
      name = child.text;
      break;
    }
  }
  parts.push(name);

  // Type constraint
  for (const child of node.children) {
    if (child.type === "type_inheritance_clause") {
      parts.push(child.text);
      break;
    }
  }

  // Where clause
  for (const child of node.children) {
    if (child.type === "type_constraints") {
      parts.push(child.text);
      break;
    }
  }

  // Default type
  for (const child of node.children) {
    if (child.text?.startsWith("=")) {
      parts.push(child.text);
      break;
    }
  }

  return parts.join(" ");
}

/**
 * Get import path from import declaration
 */
export function getImportPath(node: Node): string {
  // Remove "import " prefix
  const text = node.text.trim();
  if (text.startsWith("import ")) {
    return text.slice(7).trim();
  }
  return text;
}

/**
 * Get variable/constant signature
 */
export function getVariableSignature(node: Node): string {
  const text = node.text.trim();
  // Get just the declaration part (first line, up to = or {)
  const firstLine = text.split("\n")[0] ?? text;
  // Clean up and return
  return firstLine.replace(/\s*[={].*$/, "").trim();
}

/**
 * Get init signature
 */
export function getInitSignature(node: Node): string {
  const parts: string[] = [];
  const modifiers = getFunctionModifiers(node);

  // Access level
  if (modifiers.accessLevel && modifiers.accessLevel !== "internal") {
    parts.push(modifiers.accessLevel);
  }

  // Modifiers
  if (modifiers.isRequired) parts.push("required");
  if (modifiers.isConvenience) parts.push("convenience");
  if (modifiers.isOverride) parts.push("override");

  // Init keyword (check for init? or init!)
  let initKeyword = "init";
  const text = node.text;
  if (text.includes("init?")) {
    initKeyword = "init?";
  } else if (text.includes("init!")) {
    initKeyword = "init!";
  }
  parts.push(initKeyword);

  // Generic parameters
  for (const child of node.children) {
    if (child.type === "type_parameters") {
      parts[parts.length - 1] += child.text;
      break;
    }
  }

  // Parameters
  const paramMatch = node.text.match(/\([^)]*\)/);
  if (paramMatch) {
    parts[parts.length - 1] += paramMatch[0];
  }

  // Async and throws
  if (modifiers.isAsync) parts.push("async");
  if (modifiers.isThrowing) {
    if (modifiers.throwsType) {
      parts.push(`throws(${modifiers.throwsType})`);
    } else {
      parts.push("throws");
    }
  }

  return parts.join(" ");
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
