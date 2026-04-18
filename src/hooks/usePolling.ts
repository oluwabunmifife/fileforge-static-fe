import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const POLL_INTERVAL_MS = 3000;
const MAX_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const MAX_RETRY_ATTEMPTS = 5;

export type ProcessedFile = {
  id: string;
  filename: string;
  size: number;
  downloadUrl: string;
};

export type PollingStatus = "idle" | "uploading" | "processing" | "completed" | "error" | "timeout";

type RawResult = {
  id?: string;
  key?: string;
  filename?: string;
  name?: string;
  originalFilename?: string;
  size?: number;
  fileSize?: number;
  bytes?: number;
  downloadUrl?: string;
  url?: string;
};

/**
 * Normalizes backend response to standard ProcessedFile format
 */
function normalizeResults(payload: unknown): ProcessedFile[] {
  const items = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && "files" in payload
      ? (payload as { files?: RawResult[] }).files ?? []
      : [];

  return items
    .map((item, index) => {
      const filename = item.filename ?? item.name ?? item.originalFilename ?? `file-${index + 1}`;
      const downloadUrl = item.downloadUrl ?? item.url ?? "";
      const size = item.size ?? item.fileSize ?? item.bytes ?? 0;
      const id = item.id ?? item.key ?? `${filename}-${downloadUrl}-${index}`;

      return { id, filename, size, downloadUrl };
    })
    .filter((item) => Boolean(item.downloadUrl));
}

/**
 * Polls backend for processed files every 3 seconds
 * Stops immediately when results found or max timeout reached
 */
export function usePolling(sessionId: string | null) {
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const [status, setStatus] = useState<PollingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pollInFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /**
   * Stops the polling interval and cleans up
   */
  const stopPolling = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  /**
   * Fetches results for current session
   */
  const fetchResults = useCallback(async (): Promise<void> => {
    if (!sessionId || pollInFlightRef.current) {
      return;
    }

    if (!API_BASE_URL) {
      return;
    }

    // Check if polling timeout exceeded
    if (startTimeRef.current && Date.now() - startTimeRef.current > MAX_TIMEOUT_MS) {
      setStatus("timeout");
      setError("Polling timeout: processing took too long");
      stopPolling();
      return;
    }

    pollInFlightRef.current = true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/results?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        // 404 is expected if no results exist yet, don't error
        if (response.status === 404) {
          setError(null);
          return;
        }

        throw new Error(
          `Results API returned ${response.status}. Check your backend is running.`
        );
      }

      const payload = (await response.json()) as unknown;
      const normalized = normalizeResults(payload);

      // Results found - stop polling immediately
      if (normalized.length > 0) {
        setResults(normalized);
        setError(null);
        setStatus("completed");
        stopPolling();
        retryCountRef.current = 0;
        return;
      }

      // No results yet, keep polling
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      retryCountRef.current += 1;

      const message = err instanceof Error ? err.message : "Unable to fetch results";

      // Only show error after multiple retries to avoid noise
      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        setStatus("error");
        setError(message);
        stopPolling();
      }
    } finally {
      pollInFlightRef.current = false;
    }
  }, [sessionId, stopPolling]);

  /**
   * Set up polling interval when session is available
   * Stop polling when results found, timeout, or error occurs
   */
  useEffect(() => {
    // Clear existing interval to avoid duplicates
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Reset when no session
    if (!sessionId) {
      setStatus("idle");
      setResults([]);
      setError(null);
      startTimeRef.current = null;
      retryCountRef.current = 0;
      return;
    }

    // Don't start new polling if already in terminal state
    if (status === "completed" || status === "error" || status === "timeout") {
      return;
    }

    // Start polling
    setStatus("processing");
    startTimeRef.current = Date.now();
    retryCountRef.current = 0;

    // Initial fetch
    void fetchResults();

    // Poll every 3 seconds
    intervalIdRef.current = setInterval(() => {
      void fetchResults();
    }, POLL_INTERVAL_MS);

    // Cleanup on unmount or when dependencies change
    return () => {
      stopPolling();
    };
  }, [sessionId, status, fetchResults, stopPolling]);

  const clearError = useCallback(() => setError(null), []);

  const clearResult = useCallback((fileId: string) => {
    setResults((current) => current.filter((f) => f.id !== fileId));
  }, []);

  const resetPolling = useCallback(() => {
    stopPolling();
    setStatus("idle");
    setResults([]);
    setError(null);
    startTimeRef.current = null;
    retryCountRef.current = 0;
  }, [stopPolling]);

  return {
    results,
    status,
    isPolling: status === "processing",
    error,
    clearError,
    clearResult,
    resetPolling,
    refetch: fetchResults
  };
}
