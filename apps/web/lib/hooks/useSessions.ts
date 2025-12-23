"use client";

import { useState, useEffect, useCallback } from "react";
import type { UsagePeriod } from "@ctxopt/shared";

export interface Session {
  id: string;
  sessionId: string;
  date: string;
  tokensUsed: number;
  tokensSaved: number;
  savingsPercent: number;
  costMicros: number;
  model: string | null;
  duration: string;
}

interface UseSessionsOptions {
  projectId?: string;
  period?: UsagePeriod;
  limit?: number;
}

interface UseSessionsResult {
  sessions: Session[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

export function useSessions({
  projectId,
  period = "30d",
  limit = 10,
}: UseSessionsOptions = {}): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchSessions = useCallback(
    async (newOffset: number, append: boolean = false) => {
      if (!projectId) {
        setSessions([]);
        setTotal(0);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        if (!append) {
          setIsLoading(true);
        }

        const url = `/api/projects/${projectId}/sessions?period=${period}&limit=${limit}&offset=${newOffset}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to fetch sessions");
        }

        const data = await response.json();

        if (append) {
          setSessions((prev) => [...prev, ...data.sessions]);
        } else {
          setSessions(data.sessions);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
        setOffset(newOffset + data.sessions.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, period, limit]
  );

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchSessions(offset, true);
    }
  }, [hasMore, isLoading, offset, fetchSessions]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchSessions(0, false);
  }, [fetchSessions]);

  useEffect(() => {
    setOffset(0);
    fetchSessions(0, false);
  }, [projectId, period, fetchSessions]);

  return { sessions, total, hasMore, isLoading, error, loadMore, refresh };
}

/**
 * Hook to fetch sessions for all user's projects combined
 */
export function useAllProjectsSessions({
  period = "30d",
  limit = 10,
}: { period?: UsagePeriod; limit?: number } = {}): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllSessions = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // First get all projects
      const projectsResponse = await fetch("/api/projects");
      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }
      const { projects } = await projectsResponse.json();

      if (!projects || projects.length === 0) {
        setSessions([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      // Fetch sessions for all projects
      const sessionPromises = projects.map(async (project: { id: string }) =>
        fetch(`/api/projects/${project.id}/sessions?period=${period}&limit=${limit}`).then(
          (r) => (r.ok ? r.json() : null)
        )
      );

      const results = await Promise.all(sessionPromises);
      const validResults = results.filter((r) => r?.sessions);

      // Merge and sort all sessions by date
      const allSessions: Session[] = [];
      let allTotal = 0;

      for (const result of validResults) {
        allSessions.push(...result.sessions);
        allTotal += result.total;
      }

      // Sort by date descending and take limit
      allSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const limitedSessions = allSessions.slice(0, limit);

      setSessions(limitedSessions);
      setTotal(allTotal);
      setHasMore(allSessions.length > limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [period, limit]);

  const loadMore = useCallback(() => {
    // For all projects, we don't support load more (would require complex pagination)
  }, []);

  const refresh = useCallback(() => {
    fetchAllSessions();
  }, [fetchAllSessions]);

  useEffect(() => {
    fetchAllSessions();
  }, [period, fetchAllSessions]);

  return { sessions, total, hasMore, isLoading, error, loadMore, refresh };
}
