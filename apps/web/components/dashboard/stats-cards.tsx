"use client";

import { formatNumber } from "@ctxopt/shared";

interface StatsCardsProps {
  tokensUsed: number;
  savingsPercent: number;
  isLoading?: boolean;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-2" />
      <div className="h-8 w-16 bg-muted rounded mb-1" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}

function getSavingsRateBadge(percent: number) {
  if (percent >= 30) {
    return {
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      label: "Excellent",
    };
  }
  if (percent >= 10) {
    return {
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      label: "Good",
    };
  }
  return {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Low",
  };
}

export function StatsCards({
  tokensUsed,
  savingsPercent,
  isLoading = false,
}: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  const badge = getSavingsRateBadge(savingsPercent);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Tokens Used */}
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Tokens Used</p>
        <p className="text-3xl font-bold">{formatNumber(tokensUsed)}</p>
        <p className="text-xs text-muted-foreground">input + output</p>
      </div>

      {/* Savings Rate */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Savings Rate</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${badge.bgColor} ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
        <p className={`text-3xl font-bold ${badge.color}`}>
          {savingsPercent.toFixed(1)}%
        </p>
        <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${savingsPercent >= 30 ? "bg-green-500" : savingsPercent >= 10 ? "bg-yellow-500" : "bg-gray-400"}`}
            style={{ width: `${Math.min(savingsPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
