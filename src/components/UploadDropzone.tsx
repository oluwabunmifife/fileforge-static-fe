import { useMemo } from "react";
import { useDropzone } from "react-dropzone";

type UploadDropzoneProps = {
  onDrop: (files: File[]) => void | Promise<void>;
  isBusy: boolean;
};

export default function UploadDropzone({ onDrop, isBusy }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true
  });

  const stateClasses = useMemo(() => {
    if (isDragReject) {
      return "border-rose-300 bg-rose-50/80";
    }

    if (isDragActive) {
      return "border-accent bg-accentSoft/70 shadow-soft -translate-y-1";
    }

    return "border-slate-200 bg-white/75 hover:-translate-y-1 hover:border-accent/40 hover:shadow-soft";
  }, [isDragActive, isDragReject]);

  return (
    <section
      {...getRootProps()}
      className={`group relative overflow-hidden rounded-[32px] border border-dashed p-8 text-center shadow-glow backdrop-blur-xl transition-all duration-300 sm:p-12 ${stateClasses}`}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,111,237,0.12),transparent_45%)] opacity-80" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/80 bg-white/90 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
            FF
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Drop files to forge a new format
          </h2>
          <p className="mx-auto max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
            Drag and drop files here, or click to browse. Uploads go straight to cloud storage,
            then FileForge watches for converted results in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white/85 px-4 py-2">
            Multiple uploads
          </span>
          <span className="rounded-full border border-slate-200 bg-white/85 px-4 py-2">
            Presigned S3 transfer
          </span>
          <span className="rounded-full border border-slate-200 bg-white/85 px-4 py-2">
            Session aware
          </span>
        </div>
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-soft group-hover:bg-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {isBusy ? "Upload more files" : isDragActive ? "Release to upload" : "Choose files"}
        </div>
      </div>
    </section>
  );
}
