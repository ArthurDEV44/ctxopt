/**
 * SDK Entry Point
 *
 * All SDK functions available in the sandbox.
 * Exports both Result-based APIs (new) and legacy throwing APIs (backward compat).
 */

// Compress functions (both legacy and Result-based)
export * from "./compress.js";

// Code/AST functions (both legacy and Result-based)
export * from "./code.js";

// Files API (Result-based with legacy wrapper)
export { createFilesAPI, createFilesAPILegacy } from "./files.js";

// Git API (Result-based with legacy wrapper)
export { createGitAPI, createGitAPILegacy } from "./git.js";

// Search API (Result-based with legacy wrapper)
export { createSearchAPI, createSearchAPILegacy } from "./search.js";

// Analyze API
export { createAnalyzeAPI } from "./analyze.js";

// Pipeline API
export { createPipelineAPI } from "./pipeline.js";

// Multifile API
export { createMultifileAPI } from "./multifile.js";

// Conversation API
export { createConversationAPI } from "./conversation.js";

// Fluent Pipeline Builder API (new)
export { createFluentPipelineAPI, Pipeline } from "./pipeline-builder.js";
export type {
  PipelineBuilder,
  PipelineFactory,
  PipelineError,
  PipelineStepDef,
  PipelineStats,
  PipelineBuildResult,
  FileContent,
  ParsedFile,
  CompressOptions,
  CompressMode,
  PipelinePresets,
  DeadCodeResult,
  SignatureResult,
} from "./pipeline-builder.types.js";

// Utils
export * from "./utils.js";
