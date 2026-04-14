import FileCard, { type ProcessedFile } from "@/components/FileCard";

type ResultsListProps = {
  files: ProcessedFile[];
  isPolling: boolean;
};

export default function ResultsList({ files, isPolling }: ResultsListProps) {
  if (!files.length) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[28px] border border-white/65 bg-white/70 p-5 shadow-glow backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Ready to download</h2>
          <p className="text-sm text-slate-500">
            Processed files appear here automatically for this session.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500">
          <span className={`h-2 w-2 rounded-full ${isPolling ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
          {isPolling ? "Checking for updates" : "Idle"}
        </div>
      </div>
      <div className="grid gap-3">
        {files.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
    </section>
  );
}
