export type ProcessedFile = {
  id: string;
  filename: string;
  size: number;
  downloadUrl: string;
};

type FileCardProps = {
  file: ProcessedFile;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function FileCard({ file }: FileCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-glow backdrop-blur-xl">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-base font-semibold text-ink">{file.filename}</p>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            {formatBytes(file.size)}
          </p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:bg-slate-800"
          href={file.downloadUrl}
          download
          rel="noreferrer"
          target="_blank"
        >
          Download
        </a>
      </div>
    </article>
  );
}
