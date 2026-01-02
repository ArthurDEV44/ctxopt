/**
 * TypeScript Signature Builder
 *
 * Functions for building signature strings for various declarations.
 */

import ts from "typescript";
import {
  getVisibility,
  isStatic,
  isAbstract,
  isAsync,
  getTypeParameters,
} from "./utils.js";

/**
 * Build function/method signature string with full details
 */
export function buildSignature(
  node:
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.ArrowFunction
    | ts.ConstructorDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration,
  sourceFile: ts.SourceFile,
  name?: string
): string {
  const parts: string[] = [];

  // Visibility and modifiers
  const visibility = getVisibility(node);
  if (visibility) parts.push(visibility);
  if (isStatic(node)) parts.push("static");
  if (isAbstract(node)) parts.push("abstract");
  if (isAsync(node)) parts.push("async");

  // Accessor keyword
  if (ts.isGetAccessor(node)) {
    parts.push("get");
  } else if (ts.isSetAccessor(node)) {
    parts.push("set");
  }

  // Name
  if (ts.isConstructorDeclaration(node)) {
    parts.push("constructor");
  } else if (name) {
    parts.push(name);
  } else if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node)
  ) {
    const nodeName = node.name?.getText(sourceFile) ?? "anonymous";
    parts.push(nodeName);
  }

  // Generic type parameters
  if (
    !ts.isConstructorDeclaration(node) &&
    !ts.isGetAccessor(node) &&
    !ts.isSetAccessor(node)
  ) {
    const typeParams = getTypeParameters(node, sourceFile);
    if (typeParams) {
      parts[parts.length - 1] += `<${typeParams.join(", ")}>`;
    }
  }

  // Parameters
  const params = node.parameters.map((p) => p.getText(sourceFile)).join(", ");
  parts[parts.length - 1] += `(${params})`;

  // Return type (not for constructors or setters)
  if (
    !ts.isConstructorDeclaration(node) &&
    !ts.isSetAccessor(node) &&
    node.type
  ) {
    parts[parts.length - 1] += `: ${node.type.getText(sourceFile)}`;
  }

  return parts.join(" ");
}
