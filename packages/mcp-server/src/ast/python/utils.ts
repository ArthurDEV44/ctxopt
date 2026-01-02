/**
 * Python Parser Utilities
 *
 * Helper functions for converting Tree-sitter nodes to CodeElements
 * and extracting Python-specific constructs.
 */

import type Parser from "web-tree-sitter";
type Node = Parser.SyntaxNode;
import type { CodeElement, ElementType, ParameterInfo } from "../types.js";

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
 * Extract docstring from a function or class body
 * Returns the docstring content without the quotes
 */
export function extractDocstring(bodyNode: Node | null): string | undefined {
  if (!bodyNode) return undefined;

  // Look for the first expression_statement containing a string
  for (const child of bodyNode.children) {
    if (child.type === "expression_statement") {
      const stringNode = child.firstChild;
      if (stringNode && (stringNode.type === "string" || stringNode.type === "concatenated_string")) {
        const text = stringNode.text;
        // Remove triple quotes and clean up
        if (text.startsWith('"""') || text.startsWith("'''")) {
          return text.slice(3, -3).trim();
        }
        // Single quoted strings (less common for docstrings)
        if (text.startsWith('"') || text.startsWith("'")) {
          return text.slice(1, -1).trim();
        }
      }
    }
    // Only check the first statement
    break;
  }

  return undefined;
}

/**
 * Get function signature from a function_definition node
 */
export function getFunctionSignature(node: Node, isAsync: boolean): string {
  const nameNode = node.childForFieldName("name");
  const paramsNode = node.childForFieldName("parameters");
  const returnType = node.childForFieldName("return_type");

  const name = nameNode?.text ?? "unknown";
  const params = paramsNode?.text ?? "()";
  const asyncPrefix = isAsync ? "async " : "";
  const returnAnnotation = returnType ? ` -> ${returnType.text}` : "";

  return `${asyncPrefix}def ${name}${params}${returnAnnotation}`;
}

/**
 * Get class signature from a class_definition node
 */
export function getClassSignature(node: Node): string {
  const nameNode = node.childForFieldName("name");
  const superclassNode = node.childForFieldName("superclasses");

  const name = nameNode?.text ?? "unknown";
  const superclasses = superclassNode ? `(${superclassNode.text})` : "";

  return `class ${name}${superclasses}`;
}

/**
 * Check if a function is async
 */
export function isAsyncFunction(node: Node): boolean {
  // In tree-sitter-python, async functions have type "function_definition"
  // with an "async" modifier in their parent or the first child is "async" keyword
  const firstChild = node.firstChild;
  if (firstChild && firstChild.type === "async") {
    return true;
  }

  // Check if there's an "async" keyword before "def"
  const prevSibling = node.previousSibling;
  return prevSibling?.type === "async" || false;
}

/**
 * Extract decorators from a function or class definition
 * Returns the full decorator text including arguments
 * Updated 2025: Better handling of complex decorators with arguments
 *
 * @example
 * @decorator -> ["decorator"]
 * @decorator(arg) -> ["decorator(arg)"]
 * @module.decorator -> ["module.decorator"]
 */
export function getDecorators(node: Node): string[] {
  const decorators: string[] = [];

  // Check if parent is decorated_definition
  const parent = node.parent;
  if (parent?.type === "decorated_definition") {
    for (const child of parent.children) {
      if (child.type === "decorator") {
        // Get the decorator content (without the @ symbol)
        const decoratorContent = child.text.replace(/^@/, "").trim();
        if (decoratorContent) {
          decorators.push(decoratorContent);
        }
      }
    }
  }

  // Also check previous siblings (for inline decorators)
  let current = node.previousSibling;
  while (current && current.type === "decorator") {
    const decoratorContent = current.text.replace(/^@/, "").trim();
    if (decoratorContent) {
      decorators.unshift(decoratorContent);
    }
    current = current.previousSibling;
  }

  return decorators;
}

/**
 * Create a CodeElement from a Tree-sitter node
 * Updated 2025: Support for generics, decorators, return type, parameters, and type annotations
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
    // Enhanced options (2025)
    decorators?: string[];
    generics?: string[];
    returnType?: string;
    parameters?: ParameterInfo[];
    typeAnnotation?: string;
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
  if (options?.decorators?.length) element.decorators = options.decorators;
  if (options?.generics?.length) element.generics = options.generics;
  if (options?.returnType) element.returnType = options.returnType;
  if (options?.parameters?.length) element.parameters = options.parameters;
  if (options?.typeAnnotation) element.typeAnnotation = options.typeAnnotation;

  return element;
}

/**
 * Get the body node of a function or class
 */
export function getBodyNode(node: Node): Node | null {
  return node.childForFieldName("body");
}

/**
 * Extract import name from an import statement
 */
export function getImportName(node: Node): string {
  // For "import x" -> return "x"
  // For "from x import y" -> return "y"
  // For "import x as y" -> return "y"

  if (node.type === "import_statement") {
    const nameNode = node.firstNamedChild;
    if (nameNode?.type === "dotted_name") {
      return nameNode.text.split(".").pop() ?? nameNode.text;
    }
    if (nameNode?.type === "aliased_import") {
      const alias = nameNode.childForFieldName("alias");
      return alias?.text ?? nameNode.firstNamedChild?.text ?? "";
    }
    return nameNode?.text ?? "";
  }

  if (node.type === "import_from_statement") {
    // Get the imported names
    for (const child of node.namedChildren) {
      if (child.type === "dotted_name" && child.previousSibling?.type !== "from") {
        return child.text.split(".").pop() ?? child.text;
      }
      if (child.type === "aliased_import") {
        const alias = child.childForFieldName("alias");
        return alias?.text ?? child.firstNamedChild?.text ?? "";
      }
    }
  }

  return node.text.split(/\s+/).pop() ?? "";
}

/**
 * Get the full import statement text
 */
export function getImportSignature(node: Node): string {
  return node.text.split("\n")[0] ?? node.text;
}

/**
 * Extract type parameters from a function or class definition (Python 3.12+ PEP 695)
 * Returns the generic type parameters as an array of strings
 *
 * @example
 * def func[T](x: T) -> T: ... -> ["T"]
 * def func[T, U](x: T, y: U) -> T: ... -> ["T", "U"]
 * class Stack[T]: ... -> ["T"]
 */
export function getTypeParameters(node: Node): string[] {
  const typeParams: string[] = [];

  // Look for type_parameter node in the function/class definition
  const typeParamsNode = node.childForFieldName("type_parameters");
  if (typeParamsNode) {
    // Extract individual type parameters
    for (const child of typeParamsNode.namedChildren) {
      if (child.type === "type" || child.type === "identifier") {
        typeParams.push(child.text);
      }
    }

    // If no individual params found, use the full text (minus brackets)
    if (typeParams.length === 0 && typeParamsNode.text) {
      const text = typeParamsNode.text.replace(/^\[|\]$/g, "").trim();
      if (text) {
        typeParams.push(...text.split(",").map((t) => t.trim()));
      }
    }
  }

  return typeParams;
}

/**
 * Extract return type annotation from a function definition
 *
 * @example
 * def func() -> int: ... -> "int"
 * def func() -> list[str]: ... -> "list[str]"
 * async def func() -> Awaitable[int]: ... -> "Awaitable[int]"
 */
export function getReturnType(node: Node): string | undefined {
  const returnTypeNode = node.childForFieldName("return_type");
  if (returnTypeNode) {
    return returnTypeNode.text;
  }
  return undefined;
}

/**
 * Extract detailed parameter information from a function definition
 * Returns an array of ParameterInfo objects with name, type, default value, etc.
 *
 * @example
 * def func(x: int, y: str = "default") -> None:
 * Returns: [
 *   { name: "x", type: "int" },
 *   { name: "y", type: "str", defaultValue: '"default"' }
 * ]
 */
export function getParameterInfoList(node: Node): ParameterInfo[] {
  const params: ParameterInfo[] = [];

  const paramsNode = node.childForFieldName("parameters");
  if (!paramsNode) return params;

  for (const child of paramsNode.namedChildren) {
    const paramInfo: ParameterInfo = { name: "" };

    switch (child.type) {
      case "identifier":
        // Simple parameter: x
        paramInfo.name = child.text;
        break;

      case "typed_parameter": {
        // Typed parameter: x: int
        const nameNode = child.firstNamedChild;
        const typeNode = child.childForFieldName("type");
        if (nameNode) {
          paramInfo.name = nameNode.text;
        }
        if (typeNode) {
          paramInfo.type = typeNode.text;
        }
        break;
      }

      case "default_parameter": {
        // Default parameter: x = 10
        const nameNode = child.childForFieldName("name");
        const valueNode = child.childForFieldName("value");
        if (nameNode) {
          paramInfo.name = nameNode.text;
        }
        if (valueNode) {
          paramInfo.defaultValue = valueNode.text;
          paramInfo.isOptional = true;
        }
        break;
      }

      case "typed_default_parameter": {
        // Typed default parameter: x: int = 10
        const nameNode = child.childForFieldName("name");
        const typeNode = child.childForFieldName("type");
        const valueNode = child.childForFieldName("value");
        if (nameNode) {
          paramInfo.name = nameNode.text;
        }
        if (typeNode) {
          paramInfo.type = typeNode.text;
        }
        if (valueNode) {
          paramInfo.defaultValue = valueNode.text;
          paramInfo.isOptional = true;
        }
        break;
      }

      case "list_splat_pattern": {
        // *args
        const nameNode = child.firstNamedChild;
        if (nameNode) {
          paramInfo.name = nameNode.text;
          paramInfo.isRest = true;
        }
        break;
      }

      case "dictionary_splat_pattern": {
        // **kwargs
        const nameNode = child.firstNamedChild;
        if (nameNode) {
          paramInfo.name = nameNode.text;
          paramInfo.isRest = true;
        }
        break;
      }

      default:
        // Skip separators and other non-parameter nodes
        continue;
    }

    // Only add if we got a valid parameter name
    if (paramInfo.name) {
      params.push(paramInfo);
    }
  }

  return params;
}
