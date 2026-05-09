import { titleFromEnum } from "@/lib/format";

export function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
      {titleFromEnum(value)}
    </span>
  );
}
