/**
 * Auto-Optimize Tool
 *
 * Outil unifié qui auto-détecte le type de contenu et applique
 * l'optimisation appropriée automatiquement.
 */

import type { ToolDefinition } from "./registry.js";
import type { SessionState } from "../state/session.js";
import { detectContentType } from "../utils/content-detector.js";
import type { ContentType } from "../compressors/types.js";
import { compressContent } from "../compressors/index.js";
import { getSummarizer } from "../summarizers/index.js";
import { analyzeBuildOutput } from "../parsers/index.js";
import { groupBySignature, formatGroups, calculateStats } from "../utils/signature-grouper.js";

const autoOptimizeSchema = {
  type: "object" as const,
  properties: {
    content: {
      type: "string",
      description: "Le contenu à optimiser (output de commande, logs, erreurs, code, etc.)",
    },
    hint: {
      type: "string",
      enum: ["build", "logs", "errors", "code", "auto"],
      description: "Indice sur le type de contenu (optionnel, auto-détecté par défaut)",
    },
    aggressive: {
      type: "boolean",
      description: "Mode agressif: compression maximale même si perte d'information (default: false)",
    },
  },
  required: ["content"],
};

interface AutoOptimizeArgs {
  content: string;
  hint?: "build" | "logs" | "errors" | "code" | "auto";
  aggressive?: boolean;
}

interface OptimizationResult {
  optimizedContent: string;
  detectedType: string;
  originalTokens: number;
  optimizedTokens: number;
  savingsPercent: number;
  method: string;
}

function estimateTokens(text: string): number {
  // Approximation simple: ~4 caractères par token
  return Math.ceil(text.length / 4);
}

function isBuildOutput(content: string): boolean {
  // Détecter si c'est une sortie de build
  return (
    content.includes("error TS") ||
    content.includes("warning TS") ||
    content.includes("error[E") ||
    content.includes("error:") ||
    /\d+:\d+.*error/i.test(content) ||
    content.includes("npm ERR") ||
    content.includes("ERROR in")
  );
}

function optimizeBuildOutput(content: string): OptimizationResult {
  const originalTokens = estimateTokens(content);
  const result = analyzeBuildOutput(content);

  return {
    optimizedContent: result.summary,
    detectedType: `build-${result.buildTool}`,
    originalTokens,
    optimizedTokens: result.stats.tokensCompressed,
    savingsPercent: result.stats.reductionPercent,
    method: "error-grouping",
  };
}

function optimizeLogs(content: string): OptimizationResult {
  const originalTokens = estimateTokens(content);
  const summarizer = getSummarizer(content);
  const summaryResult = summarizer.summarize(content, { detail: "normal" });

  // Formater le résumé en texte
  const summaryText = formatLogSummary(summaryResult);
  const optimizedTokens = estimateTokens(summaryText);

  return {
    optimizedContent: summaryText,
    detectedType: `logs-${summarizer.logType}`,
    originalTokens,
    optimizedTokens,
    savingsPercent: Math.round((1 - optimizedTokens / originalTokens) * 100),
    method: "log-summarization",
  };
}

function formatLogSummary(summary: import("../summarizers/types.js").LogSummary): string {
  const parts: string[] = [];
  parts.push(`## ${summary.overview}`);
  parts.push("");

  if (summary.errors.length > 0) {
    parts.push("### Erreurs");
    for (const error of summary.errors.slice(0, 10)) {
      const count = error.count > 1 ? ` (×${error.count})` : "";
      parts.push(`- ${error.timestamp || ""} ${error.message}${count}`);
    }
    parts.push("");
  }

  if (summary.warnings.length > 0) {
    parts.push("### Warnings");
    for (const warning of summary.warnings.slice(0, 5)) {
      const count = warning.count > 1 ? ` (×${warning.count})` : "";
      parts.push(`- ${warning.timestamp || ""} ${warning.message}${count}`);
    }
    parts.push("");
  }

  if (summary.keyEvents.length > 0) {
    parts.push("### Événements clés");
    for (const event of summary.keyEvents.slice(0, 5)) {
      parts.push(`- ${event.timestamp || ""} ${event.message}`);
    }
  }

  return parts.join("\n");
}

function optimizeErrors(content: string): OptimizationResult {
  const originalTokens = estimateTokens(content);
  const lines = content.split("\n").filter((l) => l.trim());

  // Grouper les erreurs par signature
  const result = groupBySignature(lines);
  const stats = calculateStats(result);
  const formatted = formatGroups(result);

  const header = `**${stats.originalLines} lignes → ${stats.uniqueErrors} patterns uniques** (${stats.totalDuplicates} duplicates supprimés)\n\n`;
  const optimizedContent = header + formatted;
  const optimizedTokens = estimateTokens(optimizedContent);

  return {
    optimizedContent,
    detectedType: "errors",
    originalTokens,
    optimizedTokens,
    savingsPercent: stats.reductionPercent,
    method: "error-deduplication",
  };
}

function optimizeGeneric(content: string, aggressive: boolean): OptimizationResult {
  const originalTokens = estimateTokens(content);
  const result = compressContent(content, {
    detail: aggressive ? "minimal" : "normal",
  });

  return {
    optimizedContent: result.compressed,
    detectedType: "generic",
    originalTokens,
    optimizedTokens: result.stats.compressedTokens,
    savingsPercent: result.stats.reductionPercent,
    method: result.stats.technique,
  };
}

async function autoOptimize(
  args: AutoOptimizeArgs,
  _state: SessionState
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const { content, hint = "auto", aggressive = false } = args;

  // Seuil minimum pour l'optimisation (500 caractères ~ 125 tokens)
  if (content.length < 500) {
    return {
      content: [
        {
          type: "text",
          text: `## Contenu déjà optimal\n\nLe contenu est trop court (${content.length} chars) pour bénéficier d'une optimisation.\n\n${content}`,
        },
      ],
    };
  }

  let result: OptimizationResult;

  // Déterminer le type de contenu
  if (hint === "build" || (hint === "auto" && isBuildOutput(content))) {
    result = optimizeBuildOutput(content);
  } else if (hint === "logs" || (hint === "auto" && detectContentType(content) === "logs")) {
    result = optimizeLogs(content);
  } else if (hint === "errors") {
    result = optimizeErrors(content);
  } else {
    // Utiliser la détection automatique de type
    const detectedType: ContentType = detectContentType(content);

    switch (detectedType) {
      case "logs":
        result = optimizeLogs(content);
        break;
      case "stacktrace":
        result = optimizeErrors(content);
        break;
      default:
        result = optimizeGeneric(content, aggressive);
    }
  }

  // Formater la sortie
  const output = `## Contenu Optimisé

**Type détecté:** ${result.detectedType}
**Méthode:** ${result.method}
**Tokens:** ${result.originalTokens} → ${result.optimizedTokens} (${result.savingsPercent}% économisés)

---

${result.optimizedContent}`;

  return {
    content: [{ type: "text", text: output }],
  };
}

export const autoOptimizeTool: ToolDefinition = {
  name: "auto_optimize",
  description: `Optimise automatiquement n'importe quel contenu volumineux.

UTILISATION RECOMMANDÉE: Appeler cet outil après toute commande Bash qui produit un output > 500 caractères.

Auto-détecte le type de contenu et applique l'optimisation appropriée:
- Erreurs de build → groupage et déduplication (95%+ réduction)
- Logs → résumé intelligent (80-90% réduction)
- Erreurs répétitives → déduplication par pattern
- Autre contenu → compression intelligente (40-60% réduction)

Exemple: Après "npm run build" qui échoue, passer l'output à auto_optimize pour obtenir un résumé structuré des erreurs.`,
  inputSchema: autoOptimizeSchema,
  execute: async (args, state) => autoOptimize(args as AutoOptimizeArgs, state),
};
