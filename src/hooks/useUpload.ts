import { useCallback, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type UploadItem = {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: "uploading" | "processing" | "error";
  error?: string;
};

type UploadUrlResponse = {
  uploadUrl?: string;
  presignedUrl?: string;
  url?: string;
  key?: string;
};

/**
 * Retrieves presigned upload URL from backend
 * @param filename - File name
 * @param contentType - MIME type
 * @param sessionId - Session ID for tracking
 */
async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  sessionId: string
): Promise<{ uploadUrl: string; key: string }> {
  const url = `${API_BASE_URL}/upload-url`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        contentType: contentType || "application/octet-stream",
        sessionId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Backend error (${response.status}):`, error);
      throw new Error(`Backend returned ${response.status}: ${error || response.statusText}`);
    }

    const data = (await response.json()) as UploadUrlResponse;
    const uploadUrl = data.uploadUrl ?? data.presignedUrl ?? data.url;
    const key = data.key ?? filename;

    if (!uploadUrl) {
      throw new Error("Invalid presigned URL response from backend");
    }

    return { uploadUrl, key };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Backend returned")) {
      throw err;
    }
    console.error(`Fetch error calling ${url}:`, err);
    throw new Error(`Failed to reach backend: ${err instanceof Error ? err.message : "Network error"}`);
  }
}

/**
 * Uploads file directly to S3 using presigned URL with progress tracking
 */
function uploadFileToS3(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 upload"));
    xhr.ontimeout = () => reject(new Error("Upload timeout"));

    xhr.send(file);
  });
}

export function useUpload() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles file upload flow:
   * 1. Get presigned URL from backend
   * 2. Upload file directly to S3
   * 3. Track progress and status
   */
  const uploadFiles = useCallback(
    async (files: File[], sessionId: string): Promise<void> => {
      if (!files.length || !sessionId) {
        return;
      }

      if (!API_BASE_URL) {
        setError("API base URL not configured. Set VITE_API_BASE_URL environment variable.");
        return;
      }

      setError(null);
      const uploadPromises = files.map((file) => uploadSingleFile(file, sessionId));
      await Promise.allSettled(uploadPromises);
    },
    []
  );

  const uploadSingleFile = useCallback(
    async (file: File, sessionId: string) => {
      if (!API_BASE_URL) {
        setError("API base URL not configured");
        return;
      }

      const uploadId = crypto.randomUUID();

      // Add to uploads list
      setUploads((current) => [
        {
          id: uploadId,
          filename: file.name,
          size: file.size,
          progress: 0,
          status: "uploading"
        },
        ...current
      ]);

      try {
        // Step 1: Get presigned URL
        const { uploadUrl, key } = await getPresignedUploadUrl(
          file.name,
          file.type || "application/octet-stream",
          sessionId
        );

        // Step 2: Upload to S3
        await uploadFileToS3(file, uploadUrl, (progress) => {
          setUploads((current) =>
            current.map((upload) =>
              upload.id === uploadId ? { ...upload, progress } : upload
            )
          );
        });

        // Step 3: Mark as processing (waiting for Lambda to process)
        setUploads((current) =>
          current.map((upload) =>
            upload.id === uploadId
              ? { ...upload, progress: 100, status: "processing" }
              : upload
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";

        setUploads((current) =>
          current.map((upload) =>
            upload.id === uploadId
              ? { ...upload, status: "error", error: message }
              : upload
          )
        );

        setError(message);
      }
    }, []);

  const clearError = useCallback(() => setError(null), []);

  const retryFailedUpload = useCallback(
    (uploadId: string, file: File, sessionId: string) => {
      // Remove failed upload
      setUploads((current) => current.filter((u) => u.id !== uploadId));
      // Retry upload
      void uploadSingleFile(file, sessionId);
    },
    [uploadSingleFile]
  );

  const clearUpload = useCallback((uploadId: string) => {
    setUploads((current) => current.filter((u) => u.id !== uploadId));
  }, []);

  return {
    uploads,
    error,
    uploadFiles,
    clearError,
    retryFailedUpload,
    clearUpload
  };
}
