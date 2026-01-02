/**
 * TypeScript Parser Utilities
 *
 * Common utility functions for AST parsing and extraction.
 */

import ts from "typescript";
import type { Visibility, ParameterInfo } from "../types.js";

/**
 * Get line number from position in source file (1-indexed)
 */
export function getLineNumber(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

/**
 * Get JSDoc comment for a node
 */
export function getJSDoc(node: ts.Node): string | undefined {
  const jsDocs = ts.getJSDocCommentsAndTags(node);
  if (jsDocs && jsDocs.length > 0) {
    return jsDocs.map((doc: ts.Node) => doc.getText()).join("\n");
  }
  return undefined;
}

/**
 * Get modifiers array for a node
 */
export function getModifiers(node: ts.Node): readonly ts.Modifier[] | undefined {
  return ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
}

/**
 * Check if a node has an export modifier
 */
export function isExported(node: ts.Node): boolean {
  return getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/**
 * Check if a function is async
 */
export function isAsync(node: ts.Node): boolean {
  return getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

/**
 * Check if a member is static
 */
export function isStatic(node: ts.Node): boolean {
  return getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

/**
 * Check if a class/method is abstract
 */
export function isAbstract(node: ts.Node): boolean {
  return getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword) ?? false;
}

/**
 * Check if a member is readonly
 */
export function isReadonly(node: ts.Node): boolean {
  return getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false;
}

/**
 * Get visibility modifier (public, private, protected)
 */
export function getVisibility(node: ts.Node): Visibility | undefined {
  const modifiers = getModifiers(node);
  if (!modifiers) return undefined;

  for (const mod of modifiers) {
    switch (mod.kind) {
      case ts.SyntaxKind.PublicKeyword:
        return "public";
      case ts.SyntaxKind.PrivateKeyword:
        return "private";
      case ts.SyntaxKind.ProtectedKeyword:
        return "protected";
    }
  }
  return undefined;
}

/**
 * Extract decorators from a node
 */
export function getDecorators(node: ts.Node): string[] | undefined {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
  if (!decorators || decorators.length === 0) return undefined;

  return decorators.map((d) => {
    // Get the decorator expression text (e.g., "@Component" or "@Injectable()")
    return `@${d.expression.getText()}`;
  });
}

/**
 * Extract generic type parameters from a node
 */
export function getTypeParameters(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string[] | undefined {
  // Check if node has typeParameters property
  const nodeWithTypeParams = node as {
    typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
  };
  const typeParams = nodeWithTypeParams.typeParameters;
  if (!typeParams || typeParams.length === 0) return undefined;

  return typeParams.map((tp: ts.TypeParameterDeclaration) => tp.getText(sourceFile));
}

/**
 * Get return type as string
 */
export function getReturnType(
  node: ts.SignatureDeclaration,
  sourceFile: ts.SourceFile
): string | undefined {
  return node.type?.getText(sourceFile);
}

/**
 * Extract detailed parameter information
 */
export function getParameters(
  node: ts.SignatureDeclaration,
  sourceFile: ts.SourceFile
): ParameterInfo[] | undefined {
  if (!node.parameters || node.parameters.length === 0) return undefined;

  return node.parameters.map((param): ParameterInfo => {
    const name = param.name.getText(sourceFile);
    const info: ParameterInfo = { name };

    // Type annotation
    if (param.type) {
      info.type = param.type.getText(sourceFile);
    }

    // Optional parameter
    if (param.questionToken) {
      info.isOptional = true;
    }

    // Rest parameter
    if (param.dotDotDotToken) {
      info.isRest = true;
    }

    // Default value
    if (param.initializer) {
      info.defaultValue = param.initializer.getText(sourceFile);
      info.isOptional = true; // Parameters with defaults are optional
    }

    // Parameter decorators
    const decorators = ts.canHaveDecorators(param) ? ts.getDecorators(param) : undefined;
    if (decorators && decorators.length > 0) {
      info.decorators = decorators.map((d) => `@${d.expression.getText()}`);
    }

    // Constructor parameter properties (visibility modifiers)
    const visibility = getVisibility(param);
    if (visibility) {
      info.visibility = visibility;
    }

    if (isReadonly(param)) {
      info.isReadonly = true;
    }

    return info;
  });
}

/**
 * Get extends clause for classes
 */
export function getExtendsClause(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): string[] | undefined {
  if (!node.heritageClauses) return undefined;

  for (const clause of node.heritageClauses) {
    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      return clause.types.map((t) => t.getText(sourceFile));
    }
  }
  return undefined;
}

/**
 * Get implements clause for classes
 */
export function getImplementsClause(
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): string[] | undefined {
  if (!node.heritageClauses) return undefined;

  for (const clause of node.heritageClauses) {
    if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
      return clause.types.map((t) => t.getText(sourceFile));
    }
  }
  return undefined;
}

/**
 * Get extends clause for interfaces
 */
export function getInterfaceExtends(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile
): string[] | undefined {
  if (!node.heritageClauses) return undefined;

  for (const clause of node.heritageClauses) {
    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
      return clause.types.map((t) => t.getText(sourceFile));
    }
  }
  return undefined;
}
