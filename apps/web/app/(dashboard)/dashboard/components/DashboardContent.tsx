"use client";

import { useUsage, useSuggestions, useRecentActivity } from "@/lib/hooks/useUsage";
import { StatsCards } from "./StatsCards";
import { QuotaIndicator } from "./QuotaIndicator";
import { RecentActivity } from "./RecentActivity";
import { QuickActions } from "./QuickActions";
import { SuggestionsPreview } from "./SuggestionsPreview";

interface DashboardContentProps {
  userName: string;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const { data: usageData, isLoading: usageLoading, error: usageError } = useUsage({
    period: "this_month",
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions({
    status: "active",
    limit: 5,
  });

  const { data: recentRequests, isLoading: activityLoading } = useRecentActivity(5);

  const isLoading = usageLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {/* Error State */}
      {usageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{usageError}</p>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards
        totalTokens={usageData?.summary?.totalTokens ?? 0}
        totalCostMicros={usageData?.summary?.totalCostMicros ?? 0}
        totalRequests={usageData?.summary?.totalRequests ?? 0}
        potentialSavingsMicros={suggestionsData?.summary?.totalPotentialSavingsMicros ?? 0}
        tokenLimit={usageData?.quotaUsage?.limit ?? 100000}
        isLoading={isLoading}
      />

      {/* Quota Indicator */}
      <QuotaIndicator
        used={usageData?.quotaUsage?.used ?? 0}
        limit={usageData?.quotaUsage?.limit ?? 100000}
        percentage={usageData?.quotaUsage?.percentage ?? 0}
        resetDate={usageData?.quotaUsage?.resetDate ?? new Date().toISOString()}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Two Column Layout for Activity and Suggestions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity requests={recentRequests ?? []} isLoading={activityLoading} />
        <SuggestionsPreview
          suggestions={suggestionsData?.suggestions ?? []}
          isLoading={suggestionsLoading}
        />
      </div>

      {/* Quick Start Guide (shown when no data) */}
      {!isLoading && usageData?.summary?.totalRequests === 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Quick Start</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium">Create a Project</p>
                <p className="text-sm text-muted-foreground">
                  Go to Projects and create your first project to get an API key.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <div>
                <p className="font-medium">Install the MCP Server</p>
                <p className="text-sm text-muted-foreground">
                  Add CtxOpt MCP Server to Claude Code, Cursor, or Windsurf.
                </p>
                <pre className="mt-2 rounded bg-muted p-2 text-xs">
                  npx @ctxopt/mcp-server
                </pre>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <div>
                <p className="font-medium">Start Coding</p>
                <p className="text-sm text-muted-foreground">
                  Use your AI tool as normal. We'll track and analyze every request.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
