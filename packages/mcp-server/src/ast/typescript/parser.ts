/**
 * TypeScript Parser
 *
 * Main parsing function for TypeScript/JavaScript code.
 * Uses TypeScript Compiler API for accurate AST parsing.
 */

import ts from "typescript";
import type {
  CodeElement,
  FileStructure,
  ParseOptions,
  SupportedLanguage,
} from "../types.js";
import { createEmptyStructure } from "../types.js";
import {
  getLineNumber,
  getJSDoc,
  getModifiers,
  isExported,
  isAsync,
  isAbstract,
  getDecorators,
  getTypeParameters,
  getReturnType,
  getParameters,
  getExtendsClause,
  getImplementsClause,
  getInterfaceExtends,
} from "./utils.js";
import { buildSignature } from "./signatures.js";
import {
  parsePropertyDeclaration,
  parseMethodDeclaration,
  parseConstructorDeclaration,
  parseAccessor,
  parsePropertySignature,
  parseMethodSignature,
} from "./members.js";

/**
 * Parse TypeScript/JavaScript content into FileStructure
 * Always extracts full details (signatures, documentation, decorators, etc.)
 */
export function parseTypeScript(
  content: string,
  isTypeScript: boolean = true,
  _options: ParseOptions = {}
): FileStructure {
  // Note: detailed option is deprecated, we always extract full details now

  const sourceFile = ts.createSourceFile(
    isTypeScript ? "temp.ts" : "temp.js",
    content,
    ts.ScriptTarget.Latest,
    true,
    isTypeScript ? ts.ScriptKind.TS : ts.ScriptKind.JS
  );

  const language: SupportedLanguage = isTypeScript ? "typescript" : "javascript";
  const structure = createEmptyStructure(language, content.split("\n").length);

  function visit(node: ts.Node) {
    const startLine = getLineNumber(sourceFile, node.getStart(sourceFile));
    const endLine = getLineNumber(sourceFile, node.getEnd());

    // ========================================================================
    // Import declarations
    // ========================================================================
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause;
      const moduleSpecifier = node.moduleSpecifier
        .getText(sourceFile)
        .replace(/['"]/g, "");

      if (importClause) {
        // Default import
        if (importClause.name) {
          structure.imports.push({
            type: "import",
            name: importClause.name.getText(sourceFile),
            startLine,
            endLine,
            signature: `import ${importClause.name.getText(sourceFile)} from "${moduleSpecifier}"`,
          });
        }

        // Namespace import (import * as X)
        if (
          importClause.namedBindings &&
          ts.isNamespaceImport(importClause.namedBindings)
        ) {
          structure.imports.push({
            type: "import",
            name: importClause.namedBindings.name.getText(sourceFile),
            startLine,
            endLine,
            signature: `import * as ${importClause.namedBindings.name.getText(sourceFile)} from "${moduleSpecifier}"`,
          });
        }

        // Named imports
        if (
          importClause.namedBindings &&
          ts.isNamedImports(importClause.namedBindings)
        ) {
          for (const element of importClause.namedBindings.elements) {
            const importedName = element.name.getText(sourceFile);
            const propertyName = element.propertyName?.getText(sourceFile);
            const signature = propertyName
              ? `import { ${propertyName} as ${importedName} } from "${moduleSpecifier}"`
              : `import { ${importedName} } from "${moduleSpecifier}"`;

            structure.imports.push({
              type: "import",
              name: importedName,
              startLine,
              endLine,
              signature,
            });
          }
        }
      }
    }

    // ========================================================================
    // Function declarations
    // ========================================================================
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.getText(sourceFile);
      const fn: CodeElement = {
        type: "function",
        name,
        startLine,
        endLine,
        isExported: isExported(node),
        isAsync: isAsync(node),
        signature: buildSignature(node, sourceFile, name),
        documentation: getJSDoc(node),
      };

      const decorators = getDecorators(node);
      if (decorators) fn.decorators = decorators;

      const generics = getTypeParameters(node, sourceFile);
      if (generics) fn.generics = generics;

      const returnType = getReturnType(node, sourceFile);
      if (returnType) fn.returnType = returnType;

      const parameters = getParameters(node, sourceFile);
      if (parameters) fn.parameters = parameters;

      structure.functions.push(fn);
    }

    // ========================================================================
    // Variable declarations (including arrow functions)
    // ========================================================================
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          const name = decl.name.getText(sourceFile);
          const declStartLine = getLineNumber(
            sourceFile,
            decl.getStart(sourceFile)
          );
          const declEndLine = getLineNumber(sourceFile, decl.getEnd());

          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            // Arrow function
            const arrowFn = decl.initializer;
            const fn: CodeElement = {
              type: "function",
              name,
              startLine: declStartLine,
              endLine: declEndLine,
              isExported: isExported(node),
              isAsync: isAsync(arrowFn),
              documentation: getJSDoc(node),
            };

            // Build arrow function signature
            const typeParams = getTypeParameters(arrowFn, sourceFile);
            const genericsStr = typeParams ? `<${typeParams.join(", ")}>` : "";
            const params = arrowFn.parameters
              .map((p) => p.getText(sourceFile))
              .join(", ");
            const returnType = arrowFn.type
              ? `: ${arrowFn.type.getText(sourceFile)}`
              : "";
            const asyncMod = isAsync(arrowFn) ? "async " : "";
            fn.signature = `const ${name} = ${asyncMod}${genericsStr}(${params})${returnType} =>`;

            const generics = getTypeParameters(arrowFn, sourceFile);
            if (generics) fn.generics = generics;

            const retType = getReturnType(arrowFn, sourceFile);
            if (retType) fn.returnType = retType;

            const parameters = getParameters(arrowFn, sourceFile);
            if (parameters) fn.parameters = parameters;

            structure.functions.push(fn);
          } else {
            // Regular variable/constant
            const variable: CodeElement = {
              type: "variable",
              name,
              startLine: declStartLine,
              endLine: declEndLine,
              isExported: isExported(node),
              documentation: getJSDoc(node),
            };

            // Determine if const/let/var
            const isConst = node.declarationList.flags & ts.NodeFlags.Const;
            if (isConst) variable.isReadonly = true;

            if (decl.type) {
              variable.typeAnnotation = decl.type.getText(sourceFile);
            }

            if (decl.initializer) {
              // Truncate long initializers
              const initText = decl.initializer.getText(sourceFile);
              variable.initializer =
                initText.length > 100 ? initText.slice(0, 100) + "..." : initText;
            }

            // Build signature
            const keyword = isConst ? "const" : "let";
            const typeAnn = decl.type
              ? `: ${decl.type.getText(sourceFile)}`
              : "";
            variable.signature = `${keyword} ${name}${typeAnn}`;

            structure.variables.push(variable);
          }
        }
      }
    }

    // ========================================================================
    // Class declarations
    // ========================================================================
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.getText(sourceFile);
      const cls: CodeElement = {
        type: "class",
        name: className,
        startLine,
        endLine,
        isExported: isExported(node),
        documentation: getJSDoc(node),
        children: [],
      };

      if (isAbstract(node)) cls.isAbstract = true;

      const decorators = getDecorators(node);
      if (decorators) cls.decorators = decorators;

      const generics = getTypeParameters(node, sourceFile);
      if (generics) cls.generics = generics;

      const extendsClause = getExtendsClause(node, sourceFile);
      if (extendsClause) cls.extends = extendsClause;

      const implementsClause = getImplementsClause(node, sourceFile);
      if (implementsClause) cls.implements = implementsClause;

      // Build class signature
      const sigParts: string[] = [];
      if (isAbstract(node)) sigParts.push("abstract");
      sigParts.push("class");
      sigParts.push(className);
      if (generics) sigParts[sigParts.length - 1] += `<${generics.join(", ")}>`;
      if (extendsClause)
        sigParts.push(`extends ${extendsClause.join(", ")}`);
      if (implementsClause)
        sigParts.push(`implements ${implementsClause.join(", ")}`);
      cls.signature = sigParts.join(" ");

      // Parse class members
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member)) {
          cls.children!.push(
            parsePropertyDeclaration(member, sourceFile, className)
          );
        } else if (ts.isMethodDeclaration(member)) {
          const method = parseMethodDeclaration(member, sourceFile, className);
          cls.children!.push(method);
          // Also add to functions for backward compatibility
          structure.functions.push(method);
        } else if (ts.isConstructorDeclaration(member)) {
          cls.children!.push(
            parseConstructorDeclaration(member, sourceFile, className)
          );
        } else if (ts.isGetAccessor(member) || ts.isSetAccessor(member)) {
          cls.children!.push(parseAccessor(member, sourceFile, className));
        }
      }

      // Remove empty children array
      if (cls.children!.length === 0) {
        delete cls.children;
      }

      structure.classes.push(cls);
    }

    // ========================================================================
    // Interface declarations
    // ========================================================================
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const interfaceName = node.name.getText(sourceFile);
      const iface: CodeElement = {
        type: "interface",
        name: interfaceName,
        startLine,
        endLine,
        isExported: isExported(node),
        documentation: getJSDoc(node),
        children: [],
      };

      const generics = getTypeParameters(node, sourceFile);
      if (generics) iface.generics = generics;

      const extendsClause = getInterfaceExtends(node, sourceFile);
      if (extendsClause) iface.extends = extendsClause;

      // Build interface signature
      const sigParts: string[] = ["interface", interfaceName];
      if (generics) sigParts[sigParts.length - 1] += `<${generics.join(", ")}>`;
      if (extendsClause) sigParts.push(`extends ${extendsClause.join(", ")}`);
      iface.signature = sigParts.join(" ");

      // Parse interface members
      for (const member of node.members) {
        if (ts.isPropertySignature(member)) {
          iface.children!.push(
            parsePropertySignature(member, sourceFile, interfaceName)
          );
        } else if (ts.isMethodSignature(member)) {
          iface.children!.push(
            parseMethodSignature(member, sourceFile, interfaceName)
          );
        }
      }

      // Remove empty children array
      if (iface.children!.length === 0) {
        delete iface.children;
      }

      structure.interfaces.push(iface);
    }

    // ========================================================================
    // Type alias declarations
    // ========================================================================
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const typeName = node.name.getText(sourceFile);
      const typeAlias: CodeElement = {
        type: "type",
        name: typeName,
        startLine,
        endLine,
        isExported: isExported(node),
        documentation: getJSDoc(node),
      };

      const generics = getTypeParameters(node, sourceFile);
      if (generics) typeAlias.generics = generics;

      // Build type signature
      const genericsStr = generics ? `<${generics.join(", ")}>` : "";
      const typeValue = node.type.getText(sourceFile);
      // Truncate very long type definitions
      const truncatedType =
        typeValue.length > 200 ? typeValue.slice(0, 200) + "..." : typeValue;
      typeAlias.signature = `type ${typeName}${genericsStr} = ${truncatedType}`;
      typeAlias.typeAnnotation = typeValue;

      structure.types.push(typeAlias);
    }

    // ========================================================================
    // Enum declarations
    // ========================================================================
    if (ts.isEnumDeclaration(node) && node.name) {
      const enumName = node.name.getText(sourceFile);
      const enumDecl: CodeElement = {
        type: "enum",
        name: enumName,
        startLine,
        endLine,
        isExported: isExported(node),
        documentation: getJSDoc(node),
        children: [],
      };

      // Check if const enum
      if (
        getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ConstKeyword)
      ) {
        enumDecl.isReadonly = true;
        enumDecl.signature = `const enum ${enumName}`;
      } else {
        enumDecl.signature = `enum ${enumName}`;
      }

      // Parse enum members
      for (const member of node.members) {
        const memberName = member.name.getText(sourceFile);
        const memberStart = getLineNumber(
          sourceFile,
          member.getStart(sourceFile)
        );
        const memberEnd = getLineNumber(sourceFile, member.getEnd());

        const enumMember: CodeElement = {
          type: "enum-member",
          name: memberName,
          startLine: memberStart,
          endLine: memberEnd,
          parent: enumName,
          documentation: getJSDoc(member),
        };

        if (member.initializer) {
          enumMember.initializer = member.initializer.getText(sourceFile);
          enumMember.signature = `${memberName} = ${enumMember.initializer}`;
        } else {
          enumMember.signature = memberName;
        }

        enumDecl.children!.push(enumMember);
      }

      // Remove empty children array
      if (enumDecl.children!.length === 0) {
        delete enumDecl.children;
      }

      structure.enums.push(enumDecl);
    }

    // ========================================================================
    // Export declarations
    // ========================================================================
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exportedName = element.name.getText(sourceFile);
          const propertyName = element.propertyName?.getText(sourceFile);
          const signature = propertyName
            ? `export { ${propertyName} as ${exportedName} }`
            : `export { ${exportedName} }`;

          structure.exports.push({
            type: "export",
            name: exportedName,
            startLine,
            endLine,
            signature,
          });
        }
      }
    }

    // Export assignment (export default)
    if (ts.isExportAssignment(node)) {
      const exportedExpr = node.expression.getText(sourceFile);
      structure.exports.push({
        type: "export",
        name: "default",
        startLine,
        endLine,
        signature: `export default ${exportedExpr}`,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return structure;
}
