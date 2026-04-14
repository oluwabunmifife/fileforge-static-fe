import { useEffect, useState } from "react";

const SESSION_STORAGE_KEY = "fileforge-session-id";

/**
 * Manages session ID for tracking uploads and results
 * Generates or retrieves a UUID and persists it in localStorage
 */
export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (existing) {
      setSessionId(existing);
      return;
    }

    const generated = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    setSessionId(generated);
  }, []);

  return sessionId;
}
