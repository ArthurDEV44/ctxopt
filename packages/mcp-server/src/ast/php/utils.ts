/**
 * PHP Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting PHP-specific constructs.
 *
 * Supports PHP 8.0+ features:
 * - Attributes (PHP 8.0)
 * - Enums (PHP 8.1)
 * - Readonly properties/classes (PHP 8.1/8.2)
 * - Property hooks (PHP 8.4)
 * - Asymmetric visibility (PHP 8.4)
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
 * Extract PHPDoc comment from above a declaration
 * PHP uses block doc comments starting with /**
 */
export function extractPhpDoc(node: Node, lines: string[]): string | undefined {
  const startLine = node.startPosition.row;
  const comments: string[] = [];

  // Look for PHPDoc comments above the node
  for (let i = startLine - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) {
      // Empty line - continue looking
      continue;
    } else if (line.startsWith("*/")) {
      // End of block comment - look for the start
      for (let j = i; j >= 0; j--) {
        const commentLine = lines[j]?.trim();
        if (commentLine?.startsWith("/**")) {
          // Found start of PHPDoc
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
    } else if (line.startsWith("//")) {
      // Single line comment - skip
      continue;
    } else {
      // Something else (code) - stop
      break;
    }
  }

  return comments.length > 0 ? comments.join("\n") : undefined;
}

/**
 * Get visibility from a node (public, private, protected)
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
 * Check if a node has public visibility (explicit or default)
 */
export function isPublic(node: Node): boolean {
  const visibility = getVisibility(node);
  return visibility === "public" || visibility === undefined;
}

/**
 * Check if a function/method has static modifier
 */
export function isStatic(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "static_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node has readonly modifier (PHP 8.1+)
 */
export function isReadonly(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "readonly_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node has final modifier
 */
export function isFinal(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "final_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Check if a node has abstract modifier
 */
export function isAbstract(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === "abstract_modifier") {
      return true;
    }
  }
  return false;
}

/**
 * Extract asymmetric visibility (PHP 8.4)
 * Returns { get: visibility, set: visibility } for properties with different read/write access
 */
export function getAsymmetricVisibility(node: Node): { get?: string; set?: string } | undefined {
  const visibilities: { get?: string; set?: string } = {};
  let foundAsymmetric = false;

  for (const child of node.children) {
    if (child.type === "visibility_modifier") {
      const text = child.text;
      // Check for asymmetric syntax like "public private(set)"
      const setMatch = text.match(/private\(set\)|protected\(set\)/);
      if (setMatch) {
        visibilities.set = setMatch[0].replace("(set)", "");
        foundAsymmetric = true;
      }
    }
  }

  // Also check the full node text for asymmetric patterns
  const nodeText = node.text;
  const asymmetricMatch = nodeText.match(/(public|protected|private)\s+(private|protected)\(set\)/);
  if (asymmetricMatch) {
    visibilities.get = asymmetricMatch[1];
    visibilities.set = asymmetricMatch[2];
    foundAsymmetric = true;
  }

  return foundAsymmetric ? visibilities : undefined;
}

/**
 * Extract attributes from a node (PHP 8.0+)
 * Returns array of attribute names
 */
export function getAttributes(node: Node): string[] {
  const attributes: string[] = [];

  for (const child of node.children) {
    if (child.type === "attribute_list" || child.type === "attribute_group") {
      // Extract attribute names from the attribute list
      const attrText = child.text;
      // Match attribute names like #[Route("/api")] or #[Deprecated]
      const matches = attrText.matchAll(/#\[([^\]]+)\]/g);
      for (const match of matches) {
        const attrContent = match[1];
        if (attrContent) {
          // Extract the attribute name (before any parentheses)
          const attrName = attrContent.split("(")[0]?.trim();
          if (attrName) {
            attributes.push(attrName);
          }
        }
      }
    }
  }

  return attributes;
}

/**
 * Check if a property has hooks (PHP 8.4)
 */
export function hasPropertyHooks(node: Node): boolean {
  for (const child of node.namedChildren) {
    if (child.type === "property_hook_list" || child.type === "property_hook") {
      return true;
    }
  }
  // Also check text for hook syntax { get; set; } or { get { } set { } }
  return node.text.includes("{ get") || node.text.includes("{get");
}

/**
 * Extract property hooks information (PHP 8.4)
 */
export function getPropertyHooks(node: Node): { get?: boolean; set?: boolean } | undefined {
  const hooks: { get?: boolean; set?: boolean } = {};

  for (const child of node.namedChildren) {
    if (child.type === "property_hook_list") {
      for (const hookChild of child.namedChildren) {
        if (hookChild.type === "property_hook") {
          const nameNode = hookChild.childForFieldName("name");
          if (nameNode?.text === "get") hooks.get = true;
          if (nameNode?.text === "set") hooks.set = true;
        }
      }
    }
  }

  // Fallback: parse from text
  if (!hooks.get && !hooks.set) {
    const text = node.text;
    if (text.includes("get")) hooks.get = true;
    if (text.includes("set")) hooks.set = true;
  }

  return hooks.get || hooks.set ? hooks : undefined;
}

/**
 * Get function signature from a function_definition node
 */
export function getFunctionSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const returnTypeNode = node.childForFieldName("return_type");

  const name = nameNode?.text ?? "unknown";
  const params = paramsNode?.text ?? "()";
  const returnType = returnTypeNode ? `: ${returnTypeNode.text}` : "";

  return `function ${name}${params}${returnType}`;
}

/**
 * Get method signature from a method_declaration node
 */
export function getMethodSignature(node: Node): string {
  const visibility = getVisibility(node) ?? "public";
  const staticMod = isStatic(node) ? "static " : "";
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const returnTypeNode = node.childForFieldName("return_type");

  const name = nameNode?.text ?? "unknown";
  const params = paramsNode?.text ?? "()";
  const returnType = returnTypeNode ? `: ${returnTypeNode.text}` : "";

  return `${visibility} ${staticMod}function ${name}${params}${returnType}`;
}

/**
 * Get class signature
 */
export function getClassSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";

  // Check for abstract/final modifiers
  let prefix = "class";
  for (const child of node.children) {
    if (child.type === "abstract_modifier") {
      prefix = "abstract class";
      break;
    }
    if (child.type === "final_modifier") {
      prefix = "final class";
      break;
    }
  }

  return `${prefix} ${name}`;
}

/**
 * Get interface signature
 */
export function getInterfaceSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";
  return `interface ${name}`;
}

/**
 * Get trait signature
 */
export function getTraitSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";
  return `trait ${name}`;
}

/**
 * Get enum signature (PHP 8.1+)
 */
export function getEnumSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";

  // Check for backed enum type (string or int)
  let backedType = "";
  for (const child of node.children) {
    if (child.type === ":") {
      const nextSibling = child.nextSibling;
      if (nextSibling && (nextSibling.text === "string" || nextSibling.text === "int")) {
        backedType = `: ${nextSibling.text}`;
      }
    }
  }

  return `enum ${name}${backedType}`;
}

/**
 * Get property signature with full details (PHP 8.0+)
 * Includes type, visibility, readonly, hooks
 */
export function getPropertySignature(node: Node): string {
  const parts: string[] = [];

  // Visibility
  const visibility = getVisibility(node);
  if (visibility) {
    parts.push(visibility);
  }

  // Asymmetric visibility (PHP 8.4)
  const asymmetric = getAsymmetricVisibility(node);
  if (asymmetric?.set) {
    parts.push(`${asymmetric.set}(set)`);
  }

  // Static
  if (isStatic(node)) {
    parts.push("static");
  }

  // Readonly
  if (isReadonly(node)) {
    parts.push("readonly");
  }

  // Type
  const typeNode = node.childForFieldName("type");
  if (typeNode) {
    parts.push(typeNode.text);
  }

  // Property name(s)
  const propertyNames: string[] = [];
  for (const child of node.namedChildren) {
    if (child.type === "property_element") {
      const nameNode = child.childForFieldName("name");
      if (nameNode) {
        propertyNames.push(nameNode.text);
      }
    }
  }

  if (propertyNames.length > 0) {
    parts.push(propertyNames.join(", "));
  }

  // Property hooks indicator (PHP 8.4)
  const hooks = getPropertyHooks(node);
  if (hooks) {
    const hookList: string[] = [];
    if (hooks.get) hookList.push("get");
    if (hooks.set) hookList.push("set");
    if (hookList.length > 0) {
      parts.push(`{ ${hookList.join("; ")} }`);
    }
  }

  return parts.join(" ");
}

/**
 * Get property name from property_declaration
 */
export function getPropertyName(node: Node): string {
  for (const child of node.namedChildren) {
    if (child.type === "property_element") {
      const nameNode = child.childForFieldName("name");
      if (nameNode) {
        return nameNode.text.replace(/^\$/, ""); // Remove $ prefix
      }
    }
  }
  // Fallback: extract from text
  const match = node.text.match(/\$(\w+)/);
  return match?.[1] ?? "unknown";
}

/**
 * Get enum case name
 */
export function getEnumCaseName(node: Node): string {
  const nameNode = node.childForFieldName("name");
  return nameNode?.text ?? "unknown";
}

/**
 * Get enum case signature
 */
export function getEnumCaseSignature(node: Node): string {
  const name = getEnumCaseName(node);

  // Check for backed value
  const valueNode = node.childForFieldName("value");
  if (valueNode) {
    return `case ${name} = ${valueNode.text}`;
  }

  return `case ${name}`;
}

/**
 * Extract the use path from a namespace_use_declaration
 */
export function getUsePath(node: Node): string {
  // Get the full text and clean it up
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
 * e.g., "App\\Models\\User" -> "User"
 */
export function getUseShortName(usePath: string): string {
  // Handle "as Alias" syntax
  const asMatch = usePath.match(/\s+as\s+(\w+)\s*$/i);
  if (asMatch) {
    return asMatch[1]!;
  }

  // Handle grouped use: use App\{A, B}
  const braceMatch = usePath.match(/\{(.+)\}\s*$/);
  if (braceMatch) {
    const items = braceMatch[1]!.split(",").map((s) => s.trim());
    if (items.length === 1) {
      return items[0]!;
    }
    return `{${items.join(", ")}}`;
  }

  // Simple path: App\Models\User
  const parts = usePath.split("\\");
  return parts[parts.length - 1] ?? usePath;
}

/**
 * Get const declaration info
 */
export function getConstSignature(node: Node): string {
  const visibility = getVisibility(node);
  const text = node.text.trim();

  // Extract const name from the declaration
  const match = text.match(/const\s+(\w+)/);
  const name = match?.[1] ?? "unknown";

  if (visibility) {
    return `${visibility} const ${name}`;
  }
  return `const ${name}`;
}

/**
 * Get const name from declaration
 */
export function getConstName(node: Node): string {
  // Look for const_element children
  for (const child of node.namedChildren) {
    if (child.type === "const_element") {
      const nameNode = child.childForFieldName("name");
      if (nameNode) return nameNode.text;
    }
  }
  // Fallback: try to extract from text
  const match = node.text.match(/const\s+(\w+)/);
  return match?.[1] ?? "unknown";
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
