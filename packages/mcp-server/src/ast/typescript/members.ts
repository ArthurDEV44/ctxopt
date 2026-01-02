/**
 * TypeScript Member Extractors
 *
 * Functions for extracting class and interface members.
 */

import ts from "typescript";
import type { CodeElement } from "../types.js";
import {
  getLineNumber,
  getJSDoc,
  getVisibility,
  isStatic,
  isReadonly,
  isAbstract,
  isAsync,
  getDecorators,
  getTypeParameters,
  getReturnType,
  getParameters,
} from "./utils.js";
import { buildSignature } from "./signatures.js";

/**
 * Parse a property declaration
 */
export function parsePropertyDeclaration(
  member: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
  className: string
): CodeElement {
  const name = member.name.getText(sourceFile);
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());

  const element: CodeElement = {
    type: "property",
    name,
    startLine,
    endLine,
    parent: className,
    documentation: getJSDoc(member),
  };

  const visibility = getVisibility(member);
  if (visibility) element.visibility = visibility;
  if (isStatic(member)) element.isStatic = true;
  if (isReadonly(member)) element.isReadonly = true;
  if (isAbstract(member)) element.isAbstract = true;

  const decorators = getDecorators(member);
  if (decorators) element.decorators = decorators;

  if (member.type) {
    element.typeAnnotation = member.type.getText(sourceFile);
  }

  if (member.initializer) {
    element.initializer = member.initializer.getText(sourceFile);
  }

  // Build signature
  const sigParts: string[] = [];
  if (visibility) sigParts.push(visibility);
  if (isStatic(member)) sigParts.push("static");
  if (isReadonly(member)) sigParts.push("readonly");
  sigParts.push(name);
  if (member.questionToken) sigParts[sigParts.length - 1] += "?";
  if (member.type)
    sigParts[sigParts.length - 1] += `: ${member.type.getText(sourceFile)}`;
  element.signature = sigParts.join(" ");

  return element;
}

/**
 * Parse a method declaration
 */
export function parseMethodDeclaration(
  member: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
  className: string
): CodeElement {
  const name = member.name.getText(sourceFile);
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());

  const element: CodeElement = {
    type: "method",
    name,
    startLine,
    endLine,
    parent: className,
    signature: buildSignature(member, sourceFile, name),
    documentation: getJSDoc(member),
  };

  if (isAsync(member)) element.isAsync = true;
  if (isStatic(member)) element.isStatic = true;
  if (isAbstract(member)) element.isAbstract = true;

  const visibility = getVisibility(member);
  if (visibility) element.visibility = visibility;

  const decorators = getDecorators(member);
  if (decorators) element.decorators = decorators;

  const generics = getTypeParameters(member, sourceFile);
  if (generics) element.generics = generics;

  const returnType = getReturnType(member, sourceFile);
  if (returnType) element.returnType = returnType;

  const parameters = getParameters(member, sourceFile);
  if (parameters) element.parameters = parameters;

  return element;
}

/**
 * Parse a constructor declaration
 */
export function parseConstructorDeclaration(
  member: ts.ConstructorDeclaration,
  sourceFile: ts.SourceFile,
  className: string
): CodeElement {
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());

  const element: CodeElement = {
    type: "constructor",
    name: "constructor",
    startLine,
    endLine,
    parent: className,
    signature: buildSignature(member, sourceFile),
    documentation: getJSDoc(member),
  };

  const parameters = getParameters(member, sourceFile);
  if (parameters) element.parameters = parameters;

  return element;
}

/**
 * Parse a getter or setter accessor
 */
export function parseAccessor(
  member: ts.GetAccessorDeclaration | ts.SetAccessorDeclaration,
  sourceFile: ts.SourceFile,
  className: string
): CodeElement {
  const name = member.name.getText(sourceFile);
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());
  const isGetter = ts.isGetAccessor(member);

  const element: CodeElement = {
    type: isGetter ? "getter" : "setter",
    name,
    startLine,
    endLine,
    parent: className,
    signature: buildSignature(member, sourceFile, name),
    documentation: getJSDoc(member),
  };

  if (isStatic(member)) element.isStatic = true;
  if (isAbstract(member)) element.isAbstract = true;

  const visibility = getVisibility(member);
  if (visibility) element.visibility = visibility;

  const decorators = getDecorators(member);
  if (decorators) element.decorators = decorators;

  if (isGetter && member.type) {
    element.returnType = member.type.getText(sourceFile);
  }

  if (!isGetter) {
    const parameters = getParameters(member, sourceFile);
    if (parameters) element.parameters = parameters;
  }

  return element;
}

/**
 * Parse interface property signature
 */
export function parsePropertySignature(
  member: ts.PropertySignature,
  sourceFile: ts.SourceFile,
  interfaceName: string
): CodeElement {
  const name = member.name.getText(sourceFile);
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());

  const element: CodeElement = {
    type: "property",
    name,
    startLine,
    endLine,
    parent: interfaceName,
    documentation: getJSDoc(member),
  };

  if (isReadonly(member)) element.isReadonly = true;

  if (member.type) {
    element.typeAnnotation = member.type.getText(sourceFile);
  }

  // Build signature
  const sigParts: string[] = [];
  if (isReadonly(member)) sigParts.push("readonly");
  sigParts.push(name);
  if (member.questionToken) sigParts[sigParts.length - 1] += "?";
  if (member.type)
    sigParts[sigParts.length - 1] += `: ${member.type.getText(sourceFile)}`;
  element.signature = sigParts.join(" ");

  return element;
}

/**
 * Parse interface method signature
 */
export function parseMethodSignature(
  member: ts.MethodSignature,
  sourceFile: ts.SourceFile,
  interfaceName: string
): CodeElement {
  const name = member.name.getText(sourceFile);
  const startLine = getLineNumber(sourceFile, member.getStart(sourceFile));
  const endLine = getLineNumber(sourceFile, member.getEnd());

  // Build signature
  const typeParams = getTypeParameters(member, sourceFile);
  const params = member.parameters.map((p) => p.getText(sourceFile)).join(", ");
  const returnType = member.type ? `: ${member.type.getText(sourceFile)}` : "";
  const genericsStr = typeParams ? `<${typeParams.join(", ")}>` : "";
  const signature = `${name}${genericsStr}(${params})${returnType}`;

  const element: CodeElement = {
    type: "method",
    name,
    startLine,
    endLine,
    parent: interfaceName,
    signature,
    documentation: getJSDoc(member),
  };

  const generics = getTypeParameters(member, sourceFile);
  if (generics) element.generics = generics;

  const returnTypeStr = getReturnType(member, sourceFile);
  if (returnTypeStr) element.returnType = returnTypeStr;

  const parameters = getParameters(member, sourceFile);
  if (parameters) element.parameters = parameters;

  return element;
}
