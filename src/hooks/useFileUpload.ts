import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProcessedFile } from "@/components/FileCard";

const SESSION_STORAGE_KEY = "fileforge-session-id";
const POLL_INTERVAL_MS = 3000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

type UploadStatus = "uploading" | "processing" | "error";

export type UploadItem = {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
};

type UploadUrlResponse = {
  uploadUrl?: string;
  presignedUrl?: string;
  url?: string;
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

function getClientSessionId() {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

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

      return {
        id,
        filename,
        size,
        downloadUrl
      };
    })
    .filter((item) => Boolean(item.downloadUrl));
}

function uploadToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Network error while uploading file"));
    xhr.send(file);
  });
}

function buildApiUrl(path: string) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export function useFileUpload() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollInFlight = useRef(false);

  useEffect(() => {
    setSessionId(getClientSessionId());
  }, []);

  const refreshResults = useCallback(async () => {
    if (!sessionId || pollInFlight.current) {
      return;
    }

    pollInFlight.current = true;
    setIsPolling(true);

    try {
      const response = await fetch(
        buildApiUrl(`/api/results?sessionId=${encodeURIComponent(sessionId)}`),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Unable to fetch processed files right now.");
      }

      const payload = (await response.json()) as unknown;
      const normalized = normalizeResults(payload);

      setResults(normalized);
      setUploads((currentUploads) =>
        currentUploads.filter((upload) => {
          if (upload.status === "error") {
            return true;
          }

          return !normalized.some((file) => file.filename === upload.filename);
        })
      );
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to fetch processed files right now.";
      setError(message);
    } finally {
      setIsPolling(false);
      pollInFlight.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    void refreshResults();
    const intervalId = window.setInterval(() => {
      void refreshResults();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshResults, sessionId]);

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) {
        return;
      }

      if (!sessionId) {
        setError("Your session is still initializing. Try again in a moment.");
        return;
      }

      setError(null);

      await Promise.allSettled(
        acceptedFiles.map(async (file) => {
          const uploadId = crypto.randomUUID();

          setUploads((currentUploads) => [
            {
              id: uploadId,
              filename: file.name,
              size: file.size,
              progress: 0,
              status: "uploading"
            },
            ...currentUploads
          ]);

          try {
            const uploadUrlResponse = await fetch(buildApiUrl("/api/upload-url"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                sessionId
              })
            });

            if (!uploadUrlResponse.ok) {
              throw new Error("Could not create an upload URL.");
            }

            const uploadData = (await uploadUrlResponse.json()) as UploadUrlResponse;
            const uploadUrl = uploadData.uploadUrl ?? uploadData.presignedUrl ?? uploadData.url;

            if (!uploadUrl) {
              throw new Error("Upload URL response did not include a valid URL.");
            }

            await uploadToPresignedUrl(file, uploadUrl, (progress) => {
              setUploads((currentUploads) =>
                currentUploads.map((upload) =>
                  upload.id === uploadId ? { ...upload, progress } : upload
                )
              );
            });

            setUploads((currentUploads) =>
              currentUploads.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, progress: 100, status: "processing" }
                  : upload
              )
            );

            void refreshResults();
          } catch (uploadError) {
            const message =
              uploadError instanceof Error
                ? uploadError.message
                : "Something went wrong while uploading your file.";

            setUploads((currentUploads) =>
              currentUploads.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, status: "error", error: message }
                  : upload
              )
            );
            setError(message);
          }
        })
      );
    },
    [refreshResults, sessionId]
  );

  const activeUploads = useMemo(
    () => uploads.filter((upload) => upload.status === "uploading" || upload.status === "processing"),
    [uploads]
  );

  const failedUploads = useMemo(
    () => uploads.filter((upload) => upload.status === "error"),
    [uploads]
  );

  return {
    sessionId,
    uploads: activeUploads,
    failedUploads,
    results,
    error,
    isPolling,
    isReady: Boolean(sessionId),
    handleFiles,
    clearError: () => setError(null),
    refreshResults,
    apiBaseUrl: API_BASE_URL
  };
}
