"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  UsageStats,
  UsagePeriod,
  DailyData,
  ModelBreakdown,
} from "@ctxopt/shared";

interface UsageStatsWithCharts extends UsageStats {
  dailyData: DailyData[];
  modelBreakdown: ModelBreakdown;
}

interface UseUsageStatsOptions {
  projectId: string;
  period?: UsagePeriod;
}

interface UseUsageStatsResult {
  stats: UsageStatsWithCharts | null;
  period: UsagePeriod;
  isLoading: boolean;
  error: string | null;
  setPeriod: (period: UsagePeriod) => void;
  refresh: () => Promise<void>;
}

export function useUsageStats({
  projectId,
  period: initialPeriod = "30d",
}: UseUsageStatsOptions): UseUsageStatsResult {
  const [stats, setStats] = useState<UsageStatsWithCharts | null>(null);
  const [period, setPeriod] = useState<UsagePeriod>(initialPeriod);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/usage?period=${period}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch usage stats");
      }

      const data = await response.json();
      setStats({
        ...data.stats,
        dailyData: data.dailyData ?? [],
        modelBreakdown: data.modelBreakdown ?? {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, period]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (projectId) {
      fetchStats();
    }
  }, [projectId, period, fetchStats]);

  return { stats, period, isLoading, error, setPeriod, refresh };
}

/**
 * Hook to fetch usage stats for all user's projects combined
 */
interface UseAllProjectsUsageOptions {
  period?: UsagePeriod;
}

interface AllProjectsUsageStats extends UsageStats {
  projectCount: number;
  dailyData: DailyData[];
  modelBreakdown: ModelBreakdown;
}

interface UseAllProjectsUsageResult {
  stats: AllProjectsUsageStats | null;
  period: UsagePeriod;
  isLoading: boolean;
  error: string | null;
  setPeriod: (period: UsagePeriod) => void;
  refresh: () => Promise<void>;
}

export function useAllProjectsUsage({
  period: initialPeriod = "30d",
}: UseAllProjectsUsageOptions = {}): UseAllProjectsUsageResult {
  const [stats, setStats] = useState<AllProjectsUsageStats | null>(null);
  const [period, setPeriod] = useState<UsagePeriod>(initialPeriod);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);

      // First get all projects
      const projectsResponse = await fetch("/api/projects");
      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }
      const { projects } = await projectsResponse.json();

      if (!projects || projects.length === 0) {
        setStats({
          totalTokensUsed: 0,
          totalTokensSaved: 0,
          totalSavingsPercent: 0,
          totalCostMicros: 0,
          totalSavingsMicros: 0,
          sessionCount: 0,
          totalCommands: 0,
          topTools: [],
          projectCount: 0,
          dailyData: [],
          modelBreakdown: {},
        });
        return;
      }

      // Fetch usage for all projects and aggregate
      const usagePromises = projects.map(
        async (project: { id: string }) =>
          fetch(`/api/projects/${project.id}/usage?period=${period}`).then((r) =>
            r.ok ? r.json() : null
          )
      );

      const results = await Promise.all(usagePromises);
      const validResults = results.filter((r) => r?.stats);

      // Aggregate stats
      const aggregated: AllProjectsUsageStats = {
        totalTokensUsed: 0,
        totalTokensSaved: 0,
        totalSavingsPercent: 0,
        totalCostMicros: 0,
        totalSavingsMicros: 0,
        sessionCount: 0,
        totalCommands: 0,
        topTools: [],
        projectCount: projects.length,
        dailyData: [],
        modelBreakdown: {},
      };

      const toolsMap = new Map<
        string,
        { calls: number; tokensSaved: number; savingsPercent: number }
      >();

      // Maps for aggregating chart data
      const dailyMap = new Map<string, DailyData>();
      const modelMap = new Map<string, { requests: number; tokens: number; costMicros: number }>();

      for (const result of validResults) {
        const s = result.stats as UsageStats;
        aggregated.totalTokensUsed += s.totalTokensUsed;
        aggregated.totalTokensSaved += s.totalTokensSaved;
        aggregated.totalCostMicros += s.totalCostMicros;
        aggregated.totalSavingsMicros += s.totalSavingsMicros;
        aggregated.sessionCount += s.sessionCount;
        aggregated.totalCommands += s.totalCommands;

        // Aggregate tools
        for (const tool of s.topTools) {
          const existing = toolsMap.get(tool.name);
          if (existing) {
            existing.calls += tool.calls;
            existing.tokensSaved += tool.tokensSaved;
          } else {
            toolsMap.set(tool.name, {
              calls: tool.calls,
              tokensSaved: tool.tokensSaved,
              savingsPercent: 0,
            });
          }
        }

        // Aggregate daily data
        const dailyData = (result.dailyData ?? []) as DailyData[];
        for (const day of dailyData) {
          const existing = dailyMap.get(day.date);
          if (existing) {
            existing.tokens += day.tokens;
            existing.costMicros += day.costMicros;
            existing.requests += day.requests;
          } else {
            dailyMap.set(day.date, { ...day });
          }
        }

        // Aggregate model breakdown
        const modelBreakdown = (result.modelBreakdown ?? {}) as ModelBreakdown;
        for (const [model, data] of Object.entries(modelBreakdown)) {
          const existing = modelMap.get(model);
          if (existing) {
            existing.requests += data.requests;
            existing.tokens += data.tokens;
            existing.costMicros += data.costMicros;
          } else {
            modelMap.set(model, { ...data });
          }
        }
      }

      // Calculate overall savings percent
      const totalBefore = aggregated.totalTokensUsed + aggregated.totalTokensSaved;
      aggregated.totalSavingsPercent =
        totalBefore > 0
          ? Math.round((aggregated.totalTokensSaved / totalBefore) * 10000) / 100
          : 0;

      // Convert tools to sorted array
      const totalSaved = aggregated.totalTokensSaved;
      aggregated.topTools = Array.from(toolsMap.entries())
        .map(([name, stats]) => ({
          name,
          calls: stats.calls,
          tokensSaved: stats.tokensSaved,
          savingsPercent: totalSaved > 0 ? (stats.tokensSaved / totalSaved) * 100 : 0,
        }))
        .sort((a, b) => b.tokensSaved - a.tokensSaved)
        .slice(0, 10);

      // Convert daily data to sorted array
      aggregated.dailyData = Array.from(dailyMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // Convert model breakdown to record
      aggregated.modelBreakdown = Object.fromEntries(modelMap);

      setStats(aggregated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [period, fetchStats]);

  return { stats, period, isLoading, error, setPeriod, refresh };
}
