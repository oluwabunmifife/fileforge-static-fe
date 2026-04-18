import { useCallback, useMemo } from "react";
import { useSessionId } from "@/hooks/useSessionId";
import { useUpload, type UploadItem } from "@/hooks/useUpload";
import { usePolling, type ProcessedFile } from "@/hooks/usePolling";
import { useConfig } from "@/providers/ConfigProvider";

/**
 * @deprecated Use individual hooks instead:
 * - useSessionId() for session management
 * - useUpload() for file uploads
 * - usePolling() for results polling
 *
 * This hook is maintained for backward compatibility.
 */
export function useFileUpload() {
  const { apiBaseUrl: API_BASE_URL } = useConfig();
  const sessionId = useSessionId();
  const { uploads: uploadItems, error: uploadError, uploadFiles, clearError: clearUploadError } = useUpload();
  const { results, isPolling, error: pollingError, clearError: clearPollingError, refetch: refreshResults } = usePolling(sessionId);

  const error = uploadError || pollingError;

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length || !sessionId) {
        return;
      }
      await uploadFiles(acceptedFiles, sessionId);
    },
    [uploadFiles, sessionId]
  );

  const activeUploads = useMemo(
    () => uploadItems.filter((u) => u.status === "uploading" || u.status === "processing"),
    [uploadItems]
  );

  const failedUploads = useMemo(
    () => uploadItems.filter((u) => u.status === "error"),
    [uploadItems]
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
    clearError: () => {
      clearUploadError();
      clearPollingError();
    },
    refreshResults,
    apiBaseUrl: API_BASE_URL
  };
}
