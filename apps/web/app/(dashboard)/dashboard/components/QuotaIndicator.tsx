"use client";

import { formatNumber } from "@ctxopt/shared";

interface QuotaIndicatorProps {
  used: number;
  limit: number;
  percentage: number;
  resetDate: string;
  isLoading?: boolean;
}

function QuotaIndicatorSkeleton() {
  return (
    <div className="rounded-lg border p-6 animate-pulse">
      <div className="flex justify-between items-center mb-2">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
      <div className="h-3 w-full bg-muted rounded mb-2" />
      <div className="h-3 w-48 bg-muted rounded" />
    </div>
  );
}

export function QuotaIndicator({
  used,
  limit,
  percentage,
  resetDate,
  isLoading = false,
}: QuotaIndicatorProps) {
  if (isLoading) {
    return <QuotaIndicatorSkeleton />;
  }

  // Determine color based on percentage
  let barColor = "bg-green-500";
  let textColor = "text-green-600";
  if (percentage >= 80) {
    barColor = "bg-red-500";
    textColor = "text-red-600";
  } else if (percentage >= 50) {
    barColor = "bg-yellow-500";
    textColor = "text-yellow-600";
  }

  // Format reset date
  const resetDateObj = new Date(resetDate);
  const formattedResetDate = resetDateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium">Monthly Quota</p>
        <p className={`text-sm font-bold ${textColor}`}>{percentage}%</p>
      </div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          {formatNumber(used)} / {formatNumber(limit)} tokens
        </span>
        <span>Resets {formattedResetDate}</span>
      </div>
    </div>
  );
}
