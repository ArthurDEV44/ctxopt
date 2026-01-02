/**
 * Go Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting Go-specific constructs.
 *
 * Supports Go 1.18+ features:
 * - Generics (type parameters and constraints)
 * - Type arguments in function calls
 * - Interface type constraints
 * - Embedded types in interfaces
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
 * Extract Go doc comment from above a declaration
 * Go uses // comments above declarations
 */
export function extractGoDoc(node: Node, lines: string[]): string | undefined {
  const startLine = node.startPosition.row;
  const comments: string[] = [];

  // Look for comments above the node
  for (let i = startLine - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (line?.startsWith("//")) {
      comments.unshift(line.slice(2).trim());
    } else if (line === "") {
      // Allow empty lines between comments
      continue;
    } else {
      break;
    }
  }

  return comments.length > 0 ? comments.join("\n") : undefined;
}

/**
 * Get type parameters from a function or type declaration (Go 1.18+ generics)
 */
export function getTypeParameters(node: Node): string | undefined {
  const typeParamsNode = node.childForFieldName("type_parameters");
  if (typeParamsNode) {
    return typeParamsNode.text;
  }

  // Also check for type_parameter_list as a child
  for (const child of node.namedChildren) {
    if (child.type === "type_parameter_list") {
      return child.text;
    }
  }

  return undefined;
}

/**
 * Check if a function or type has type parameters (is generic)
 */
export function isGeneric(node: Node): boolean {
  return getTypeParameters(node) !== undefined;
}

/**
 * Extract type constraints from type parameters
 */
export function getTypeConstraints(node: Node): string[] {
  const constraints: string[] = [];
  const typeParamsNode = node.childForFieldName("type_parameters");

  if (typeParamsNode) {
    // Look for constraint nodes within type parameters
    for (const child of typeParamsNode.namedChildren) {
      if (child.type === "type_parameter_declaration") {
        const constraintNode = child.childForFieldName("constraint");
        if (constraintNode) {
          constraints.push(constraintNode.text);
        }
      }
    }
  }

  return constraints;
}

/**
 * Get function signature from a function_declaration node
 * Includes type parameters for generic functions (Go 1.18+)
 */
export function getFunctionSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const resultNode = node.childForFieldName("result");
  const typeParams = getTypeParameters(node);

  const name = nameNode?.text ?? "unknown";
  const typeParamsStr = typeParams ? typeParams : "";
  const params = paramsNode?.text ?? "()";
  const result = resultNode ? ` ${resultNode.text}` : "";

  return `func ${name}${typeParamsStr}${params}${result}`;
}

/**
 * Get method signature from a method_declaration node
 */
export function getMethodSignature(node: Node): string {
  const receiverNode = node.childForFieldName("receiver");
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const resultNode = node.childForFieldName("result");

  const receiver = receiverNode?.text ?? "";
  const name = nameNode?.text ?? "unknown";
  const params = paramsNode?.text ?? "()";
  const result = resultNode ? ` ${resultNode.text}` : "";

  return `func ${receiver} ${name}${params}${result}`;
}

/**
 * Get type signature (struct, interface)
 * Includes type parameters for generic types (Go 1.18+)
 */
export function getTypeSignature(node: Node, kind: string): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";
  const typeParams = getTypeParameters(node);
  const typeParamsStr = typeParams ? typeParams : "";
  return `type ${name}${typeParamsStr} ${kind}`;
}

/**
 * Extract struct fields from a struct_type node
 */
export function getStructFields(node: Node): Array<{ name: string; type: string; tag?: string }> {
  const fields: Array<{ name: string; type: string; tag?: string }> = [];
  const typeNode = node.childForFieldName("type");

  if (!typeNode || typeNode.type !== "struct_type") {
    return fields;
  }

  // Find field_declaration_list
  for (const child of typeNode.namedChildren) {
    if (child.type === "field_declaration_list") {
      for (const field of child.namedChildren) {
        if (field.type === "field_declaration") {
          const nameNode = field.childForFieldName("name");
          const fieldType = field.childForFieldName("type");
          const tagNode = field.childForFieldName("tag");

          if (nameNode && fieldType) {
            fields.push({
              name: nameNode.text,
              type: fieldType.text,
              tag: tagNode?.text,
            });
          } else if (fieldType && !nameNode) {
            // Embedded type (anonymous field)
            fields.push({
              name: fieldType.text,
              type: fieldType.text,
            });
          }
        }
      }
    }
  }

  return fields;
}

/**
 * Get struct signature with field summary
 */
export function getStructSignatureWithFields(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";
  const typeParams = getTypeParameters(node);
  const typeParamsStr = typeParams ? typeParams : "";

  const fields = getStructFields(node);
  if (fields.length === 0) {
    return `type ${name}${typeParamsStr} struct {}`;
  }

  const fieldsSummary = fields.map((f) => f.name).slice(0, 5);
  const suffix = fields.length > 5 ? `, ... (${fields.length} fields)` : "";

  return `type ${name}${typeParamsStr} struct { ${fieldsSummary.join(", ")}${suffix} }`;
}

/**
 * Extract interface methods from an interface_type node
 */
export function getInterfaceMethods(node: Node): Array<{ name: string; signature: string }> {
  const methods: Array<{ name: string; signature: string }> = [];
  const typeNode = node.childForFieldName("type");

  if (!typeNode || typeNode.type !== "interface_type") {
    return methods;
  }

  for (const child of typeNode.namedChildren) {
    if (child.type === "method_spec") {
      const nameNode = child.childForFieldName("name");
      const paramsNode = child.childForFieldName("parameters");
      const resultNode = child.childForFieldName("result");

      if (nameNode) {
        const params = paramsNode?.text ?? "()";
        const result = resultNode ? ` ${resultNode.text}` : "";
        methods.push({
          name: nameNode.text,
          signature: `${nameNode.text}${params}${result}`,
        });
      }
    } else if (child.type === "type_identifier" || child.type === "qualified_type") {
      // Embedded interface
      methods.push({
        name: child.text,
        signature: child.text, // embedded type
      });
    } else if (child.type === "constraint_elem") {
      // Type constraint element (Go 1.18+)
      methods.push({
        name: child.text,
        signature: child.text,
      });
    }
  }

  return methods;
}

/**
 * Get interface signature with method summary
 */
export function getInterfaceSignatureWithMethods(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "unknown";
  const typeParams = getTypeParameters(node);
  const typeParamsStr = typeParams ? typeParams : "";

  const methods = getInterfaceMethods(node);
  if (methods.length === 0) {
    return `type ${name}${typeParamsStr} interface {}`;
  }

  const methodNames = methods.map((m) => m.name).slice(0, 5);
  const suffix = methods.length > 5 ? `, ... (${methods.length} methods)` : "";

  return `type ${name}${typeParamsStr} interface { ${methodNames.join("; ")}${suffix} }`;
}

/**
 * Check if a declaration is exported (starts with uppercase)
 */
export function isExported(name: string): boolean {
  if (!name || name.length === 0) return false;
  const firstChar = name.charAt(0);
  return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
}

/**
 * Get receiver type name from a method
 */
export function getReceiverType(node: Node): string | undefined {
  const receiverNode = node.childForFieldName("receiver");
  if (!receiverNode) return undefined;

  // Find the type identifier in the receiver
  const typeNode = receiverNode.descendantsOfType("type_identifier")[0];
  return typeNode?.text;
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

/**
 * Extract import path from an import spec
 */
export function getImportPath(node: Node): string {
  // Find the interpreted_string_literal child
  const pathNode = node.descendantsOfType("interpreted_string_literal")[0];
  if (pathNode) {
    // Remove quotes
    return pathNode.text.slice(1, -1);
  }
  return node.text;
}

/**
 * Get the short name from an import path
 */
export function getImportName(importPath: string): string {
  const parts = importPath.split("/");
  return parts[parts.length - 1] ?? importPath;
}

/**
 * Get alias if import has one
 */
export function getImportAlias(node: Node): string | undefined {
  const nameNode = node.childForFieldName("name");
  if (nameNode && nameNode.type === "package_identifier") {
    return nameNode.text;
  }
  return undefined;
}

/**
 * Get const signature with value
 */
export function getConstSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");
  const valueNode = node.childForFieldName("value");

  const name = nameNode?.text ?? "unknown";
  const typeStr = typeNode ? ` ${typeNode.text}` : "";
  const valueStr = valueNode ? ` = ${valueNode.text}` : "";

  return `const ${name}${typeStr}${valueStr}`;
}

/**
 * Get var signature with type
 */
export function getVarSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");
  const valueNode = node.childForFieldName("value");

  const name = nameNode?.text ?? "unknown";
  const typeStr = typeNode ? ` ${typeNode.text}` : "";
  const valueStr = valueNode ? ` = ${valueNode.text}` : "";

  return `var ${name}${typeStr}${valueStr}`;
}

/**
 * Check if const uses iota
 */
export function usesIota(node: Node): boolean {
  const text = node.text;
  return text.includes("iota");
}

/**
 * Extract type alias information
 */
export function getTypeAliasInfo(node: Node): { name: string; targetType: string; isAlias: boolean } | undefined {
  const nameNode = node.childForFieldName("name");
  const typeNode = node.childForFieldName("type");

  if (!nameNode || !typeNode) return undefined;

  const name = nameNode.text;
  const targetType = typeNode.text;

  // Check if it's a true alias (with =) vs type definition
  const nodeText = node.text;
  const isAlias = nodeText.includes("=");

  return { name, targetType, isAlias };
}

/**
 * Check if a type is a constraint interface (Go 1.18+)
 * Constraint interfaces contain type elements like ~int, int | string
 */
export function isConstraintInterface(node: Node): boolean {
  const typeNode = node.childForFieldName("type");
  if (!typeNode || typeNode.type !== "interface_type") {
    return false;
  }

  // Check for constraint elements
  for (const child of typeNode.namedChildren) {
    if (child.type === "constraint_elem" || child.type === "union_type") {
      return true;
    }
    // Check for ~ prefix (type approximation)
    if (child.text.includes("~")) {
      return true;
    }
  }

  return false;
}

/**
 * Get all embedded types from a struct
 */
export function getEmbeddedTypes(node: Node): string[] {
  const embedded: string[] = [];
  const typeNode = node.childForFieldName("type");

  if (!typeNode || typeNode.type !== "struct_type") {
    return embedded;
  }

  for (const child of typeNode.namedChildren) {
    if (child.type === "field_declaration_list") {
      for (const field of child.namedChildren) {
        if (field.type === "field_declaration") {
          const nameNode = field.childForFieldName("name");
          const fieldType = field.childForFieldName("type");

          // If no name, it's an embedded type
          if (!nameNode && fieldType) {
            embedded.push(fieldType.text);
          }
        }
      }
    }
  }

  return embedded;
}
