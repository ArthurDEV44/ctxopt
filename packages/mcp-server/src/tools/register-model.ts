/**
 * Register Model Tool
 *
 * Allows Claude to register which model it's using at the start of a session.
 * This information is used in usage reports to correctly identify the model.
 */

import { z } from "zod";
import type { SessionState } from "../state/session.js";
import { setModel } from "../state/session.js";
import type { ToolDefinition, ToolExecuteResult } from "./registry.js";

export const registerModelSchema = {
  type: "object" as const,
  properties: {
    model: {
      type: "string" as const,
      description:
        "The model ID being used (e.g., 'claude-opus-4-5-20251101', 'claude-sonnet-4-20250514')",
    },
  },
  required: ["model"] as const,
};

const inputSchema = z.object({
  model: z.string(),
});

type RegisterModelInput = z.infer<typeof inputSchema>;

export async function executeRegisterModel(
  args: unknown,
  state: SessionState
): Promise<ToolExecuteResult> {
  const input = inputSchema.parse(args);

  setModel(state, input.model);

  return {
    content: [
      {
        type: "text",
        text: `Model registered: ${input.model}`,
      },
    ],
  };
}

export const registerModelTool: ToolDefinition = {
  name: "register_model",
  description:
    "Register the Claude model being used for this session. Call this at the start of each session to ensure accurate usage tracking. The model ID should match the exact model identifier (e.g., 'claude-opus-4-5-20251101').",
  inputSchema: registerModelSchema,
  execute: executeRegisterModel,
};
