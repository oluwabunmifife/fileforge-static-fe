import type { UploadItem } from "@/hooks/useFileUpload";

type ProcessingStatusProps = {
  uploads: UploadItem[];
};

export default function ProcessingStatus({ uploads }: ProcessingStatusProps) {
  if (!uploads.length) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-white/65 bg-white/72 p-5 shadow-glow backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accentSoft text-accent">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">Processing file...</h2>
          <p className="text-sm text-slate-500">
            Uploads move straight into your conversion pipeline once they land in storage.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {uploads.map((upload) => {
          const isUploading = upload.status === "uploading";
          const width = isUploading ? `${Math.max(upload.progress, 6)}%` : "35%";

          return (
            <div
              key={upload.id}
              className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{upload.filename}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {isUploading ? `Uploading ${Math.round(upload.progress)}%` : "Processing file..."}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {isUploading ? "uploading" : "queued"}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                {isUploading ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400 transition-[width] duration-300 ease-out"
                    style={{ width }}
                  />
                ) : (
                  <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-accent/10 via-accent to-sky-400/10 animate-pulseLine" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
