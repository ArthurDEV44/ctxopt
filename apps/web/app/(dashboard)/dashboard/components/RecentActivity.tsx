"use client";

import { formatCost, formatNumber } from "@ctxopt/shared";

interface RecentRequest {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostMicros: number;
  latencyMs: number;
  statusCode: number;
  createdAt: string;
  projectName?: string;
}

interface RecentActivityProps {
  requests: RecentRequest[];
  isLoading?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getModelShortName(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model.split("-")[0] || model;
}

function getModelColor(model: string): string {
  if (model.includes("opus")) return "bg-purple-100 text-purple-700";
  if (model.includes("sonnet")) return "bg-blue-100 text-blue-700";
  if (model.includes("haiku")) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
          <div className="h-6 w-16 bg-muted rounded" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted rounded mb-1" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-4 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export function RecentActivity({ requests, isLoading = false }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <ActivitySkeleton />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <p className="text-muted-foreground">
          No activity yet. Start using the MCP server to see your requests here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${getModelColor(request.model)}`}
            >
              {getModelShortName(request.model)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {formatNumber(request.inputTokens)} in / {formatNumber(request.outputTokens)} out
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(request.createdAt)}
                {request.projectName && ` · ${request.projectName}`}
              </p>
            </div>
            <span className="text-sm font-medium">{formatCost(request.totalCostMicros)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
