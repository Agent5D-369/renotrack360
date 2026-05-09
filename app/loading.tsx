export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-4 shadow-soft">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <div>
          <p className="text-sm font-bold">Loading workspace</p>
          <p className="text-xs text-muted-foreground">Getting the next view ready...</p>
        </div>
      </div>
    </div>
  );
}
