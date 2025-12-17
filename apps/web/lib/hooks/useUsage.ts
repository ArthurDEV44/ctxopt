"use client";

import { useState, useEffect, useCallback } from "react";
import type { UsageResponse, DailyUsage, ModelUsage, QuotaUsage, UsageSummary } from "@ctxopt/shared";

type Period = "this_month" | "last_month" | "last_7_days" | "last_30_days";

interface UseUsageOptions {
  period?: Period;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseUsageResult {
  data: UsageResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUsage(options: UseUsageOptions = {}): UseUsageResult {
  const { period = "this_month", autoRefresh = false, refreshInterval = 60000 } = options;

  const [data, setData] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/usage?period=${period}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch usage data");
      }

      const usageData = await response.json();
      setData(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchUsage, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchUsage]);

  return { data, isLoading, error, refresh };
}

interface UseSuggestionsOptions {
  status?: "active" | "dismissed" | "applied";
  limit?: number;
}

interface Suggestion {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  estimatedTokenSavings: number | null;
  estimatedCostSavingsMicros: number | null;
  context: Record<string, unknown> | null;
  status: string;
  projectId: string;
  projectName: string;
  createdAt: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  summary: {
    total: number;
    active: number;
    totalPotentialSavingsMicros: number;
    totalPotentialTokenSavings: number;
  };
}

interface UseSuggestionsResult {
  data: SuggestionsResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSuggestions(options: UseSuggestionsOptions = {}): UseSuggestionsResult {
  const { status = "active", limit = 5 } = options;

  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (limit) params.set("limit", limit.toString());

      const response = await fetch(`/api/suggestions?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch suggestions");
      }

      const suggestionsData = await response.json();
      setData(suggestionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [status, limit]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { data, isLoading, error, refresh };
}

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

interface UseRecentActivityResult {
  data: RecentRequest[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecentActivity(limit: number = 5): UseRecentActivityResult {
  const [data, setData] = useState<RecentRequest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/requests/recent?limit=${limit}`);

      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array
        if (response.status === 404) {
          setData([]);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to fetch recent activity");
      }

      const activityData = await response.json();
      setData(activityData.requests || []);
    } catch (err) {
      // Don't show error if endpoint doesn't exist yet
      setData([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { data, isLoading, error, refresh };
}
