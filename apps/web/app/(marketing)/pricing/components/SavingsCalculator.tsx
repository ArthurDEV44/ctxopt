"use client";

import { useState, useMemo } from "react";
import { ANTHROPIC_MODELS } from "@ctxopt/shared";

const MODEL_OPTIONS = [
  { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
] as const;

const PRO_MONTHLY_PRICE = 19;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`;
  }
  return tokens.toString();
}

export function SavingsCalculator() {
  const [monthlyTokens, setMonthlyTokens] = useState(5_000_000);
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4-20250514");
  const [optimizationRate, setOptimizationRate] = useState(40);

  const calculations = useMemo(() => {
    const model = ANTHROPIC_MODELS[selectedModel as keyof typeof ANTHROPIC_MODELS];
    if (!model) return null;

    // Assume 50/50 input/output ratio for simplicity
    const inputTokens = monthlyTokens / 2;
    const outputTokens = monthlyTokens / 2;

    // Current cost (in dollars)
    const currentCost =
      (inputTokens / 1_000_000) * (model.inputPricePerMillion / 1_000_000) +
      (outputTokens / 1_000_000) * (model.outputPricePerMillion / 1_000_000);

    // Optimized cost (with reduction)
    const reduction = optimizationRate / 100;
    const optimizedTokens = monthlyTokens * (1 - reduction);
    const optimizedInputTokens = optimizedTokens / 2;
    const optimizedOutputTokens = optimizedTokens / 2;

    const optimizedCost =
      (optimizedInputTokens / 1_000_000) * (model.inputPricePerMillion / 1_000_000) +
      (optimizedOutputTokens / 1_000_000) * (model.outputPricePerMillion / 1_000_000);

    // Savings
    const monthlySavings = currentCost - optimizedCost;
    const yearlySavings = monthlySavings * 12;

    // ROI (savings vs Pro subscription)
    const roi = monthlySavings > 0 ? ((monthlySavings - PRO_MONTHLY_PRICE) / PRO_MONTHLY_PRICE) * 100 : 0;

    return {
      currentCost,
      optimizedCost,
      monthlySavings,
      yearlySavings,
      roi,
    };
  }, [monthlyTokens, selectedModel, optimizationRate]);

  return (
    <section className="border-t bg-muted/30 py-16">
      <div className="container">
        <h2 className="mb-2 text-center text-3xl font-bold">Calculate Your Savings</h2>
        <p className="mb-8 text-center text-muted-foreground">
          See how much you could save with intelligent context optimization
        </p>

        <div className="mx-auto max-w-3xl rounded-xl border bg-background p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inputs */}
            <div className="space-y-6">
              {/* Token Slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Monthly Token Usage</label>
                  <span className="text-sm font-mono">{formatTokens(monthlyTokens)}</span>
                </div>
                <input
                  type="range"
                  min={100_000}
                  max={50_000_000}
                  step={100_000}
                  value={monthlyTokens}
                  onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>100K</span>
                  <span>50M</span>
                </div>
              </div>

              {/* Model Select */}
              <div>
                <label className="mb-2 block text-sm font-medium">Primary Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optimization Rate Slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Estimated Optimization</label>
                  <span className="text-sm font-mono">{optimizationRate}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={60}
                  step={5}
                  value={optimizationRate}
                  onChange={(e) => setOptimizationRate(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>20%</span>
                  <span>60%</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="mb-4 font-semibold">Your Estimated Savings</h3>

              {calculations && (
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Current monthly cost</span>
                    <span className="font-mono">{formatCurrency(calculations.currentCost)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Optimized monthly cost</span>
                    <span className="font-mono">{formatCurrency(calculations.optimizedCost)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 text-green-600">
                    <span className="font-medium">Monthly savings</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(calculations.monthlySavings)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2 text-green-600">
                    <span className="font-medium">Annual savings</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(calculations.yearlySavings)}
                    </span>
                  </div>

                  {calculations.roi > 0 && (
                    <div className="mt-4 rounded-lg bg-green-500/10 p-3 text-center">
                      <span className="text-sm text-green-600">
                        Pro subscription ROI: <strong>{Math.round(calculations.roi)}%</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                * Estimates based on observed averages. Results may vary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
