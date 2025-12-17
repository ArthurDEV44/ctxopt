"use client";

import { formatNumber, formatCost } from "@ctxopt/shared";

interface StatsCardsProps {
  totalTokens: number;
  totalCostMicros: number;
  totalRequests: number;
  potentialSavingsMicros: number;
  tokenLimit: number;
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

export function StatsCards({
  totalTokens,
  totalCostMicros,
  totalRequests,
  potentialSavingsMicros,
  tokenLimit,
  isLoading = false,
}: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Tokens Used</p>
        <p className="text-3xl font-bold">{formatNumber(totalTokens)}</p>
        <p className="text-xs text-muted-foreground">
          of {formatNumber(tokenLimit)} this month
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Estimated Cost</p>
        <p className="text-3xl font-bold">{formatCost(totalCostMicros)}</p>
        <p className="text-xs text-muted-foreground">this month</p>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Requests</p>
        <p className="text-3xl font-bold">{formatNumber(totalRequests)}</p>
        <p className="text-xs text-muted-foreground">this month</p>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Potential Savings</p>
        <p className="text-3xl font-bold text-green-600">
          {formatCost(potentialSavingsMicros)}
        </p>
        <p className="text-xs text-muted-foreground">based on suggestions</p>
      </div>
    </div>
  );
}
