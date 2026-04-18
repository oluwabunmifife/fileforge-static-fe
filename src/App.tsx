import { useCallback, useMemo } from "react";
import ProcessingStatus from "@/components/ProcessingStatus";
import ResultsList from "@/components/ResultsList";
import UploadDropzone from "@/components/UploadDropzone";
import { useSessionId } from "@/hooks/useSessionId";
import { useUpload } from "@/hooks/useUpload";
import { usePolling } from "@/hooks/usePolling";
import { useConfig } from "@/providers/ConfigProvider";

export default function App() {
  const { apiBaseUrl } = useConfig();
  const sessionId = useSessionId();
  const { uploads, error: uploadError, uploadFiles, clearError: clearUploadError } = useUpload();
  const { results, isPolling, error: pollingError, clearError: clearPollingError, clearResult } = usePolling(sessionId);

  // Combine errors from both upload and polling
  const error = uploadError || pollingError;
  const clearError = uploadError ? clearUploadError : clearPollingError;

  const handleFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length || !sessionId) {
        return;
      }
      await uploadFiles(acceptedFiles, sessionId);
    },
    [uploadFiles, sessionId]
  );

  // Get only active uploads (uploading or processing)
  const activeUploads = useMemo(
    () => uploads.filter((u) => u.status === "uploading" || u.status === "processing"),
    [uploads]
  );

  // Get failed uploads for retry
  const failedUploads = useMemo(
    () => uploads.filter((u) => u.status === "error"),
    [uploads]
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="absolute bottom-8 right-8 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl sm:bottom-24 sm:right-20" />
      <div className="relative w-full max-w-5xl">
        <section className="rounded-[36px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.64))] p-5 shadow-glow backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-accent" />
              FileForge
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              FileForge
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Convert, compress, and optimize files instantly.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Upload directly to storage with presigned URLs, then watch processed assets roll in
              automatically for this session.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              <span className="rounded-full border border-white/90 bg-white/85 px-3 py-2 shadow-sm">
                Static frontend
              </span>
              <span className="rounded-full border border-white/90 bg-white/85 px-3 py-2 shadow-sm">
                Serverless ready
              </span>
              {sessionId ? (
                <span className="rounded-full border border-white/90 bg-white/85 px-3 py-2 font-mono normal-case tracking-normal shadow-sm">
                  Session {sessionId.slice(0, 8)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-4xl space-y-5">
            {!apiBaseUrl ? (
              <div className="rounded-[28px] border border-amber-100 bg-amber-50/85 p-4 text-sm text-amber-800 shadow-sm">
                Set <span className="font-mono">VITE_API_BASE_URL</span> to your backend URL.
                Example: <span className="font-mono">https://abc123.execute-api.us-east-1.amazonaws.com</span>
              </div>
            ) : null}

            <UploadDropzone onDrop={handleFiles} isBusy={activeUploads.length > 0} />

            {!sessionId ? (
              <div className="rounded-[28px] border border-white/60 bg-white/70 p-4 text-sm text-slate-500 shadow-glow backdrop-blur-xl">
                Initializing your session...
              </div>
            ) : null}

            {error ? (
              <div className="flex flex-col gap-3 rounded-[28px] border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700 hover:bg-rose-100"
                  onClick={clearError}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {failedUploads.length ? (
              <div className="rounded-[28px] border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-800 shadow-sm">
                <div className="mb-3">
                  {failedUploads.length} file{failedUploads.length > 1 ? "s" : ""} failed to upload.
                </div>
                <div className="space-y-2">
                  {failedUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between rounded-2xl bg-white/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {upload.filename}
                        {upload.error && <span className="text-xs"> - {upload.error}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <ProcessingStatus uploads={activeUploads} />
            <ResultsList files={results} isPolling={isPolling} onRemove={clearResult} />

            {!activeUploads.length && !results.length ? (
              <div className="rounded-[28px] border border-white/60 bg-white/65 p-5 text-sm text-slate-500 shadow-glow backdrop-blur-xl">
                Your converted files will appear here once processing finishes.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
