import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "@/providers/ConfigProvider";

const POLL_INTERVAL_MS = 3000;
const MAX_RETRY_ATTEMPTS = 5;

export type ProcessedFile = {
  id: string;
  filename: string;
  size: number;
  downloadUrl: string;
};

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
 * Handles retry logic and error states
 */
export function usePolling(sessionId: string | null) {
  const { apiBaseUrl } = useConfig();
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollInFlightRef = useRef(false);
  const retryCountRef = useRef(0);

  /**
   * Fetches results for current session
   */
  const fetchResults = useCallback(async (): Promise<void> => {
    if (!sessionId || pollInFlightRef.current) {
      return;
    }

    if (!apiBaseUrl) {
      return;
    }

    pollInFlightRef.current = true;
    setIsPolling(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/results?sessionId=${encodeURIComponent(sessionId)}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Results API returned ${response.status}. Check your backend is running.`
        );
      }

      const payload = (await response.json()) as unknown;
      const normalized = normalizeResults(payload);

      setResults(normalized);
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      retryCountRef.current += 1;

      const message = err instanceof Error ? err.message : "Unable to fetch results";

      // Only show error after multiple retries to avoid noise
      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        setError(message);
      }
    } finally {
      setIsPolling(false);
      pollInFlightRef.current = false;
    }
  }, [sessionId, apiBaseUrl]);

  /**
   * Set up polling interval
   */
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    // Initial fetch
    void fetchResults();

    // Poll every 3 seconds
    const intervalId = window.setInterval(() => {
      void fetchResults();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessionId, fetchResults]);

  const clearError = useCallback(() => setError(null), []);

  const clearResult = useCallback((fileId: string) => {
    setResults((current) => current.filter((f) => f.id !== fileId));
  }, []);

  return {
    results,
    isPolling,
    error,
    clearError,
    clearResult,
    refetch: fetchResults
  };
}
