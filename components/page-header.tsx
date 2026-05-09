import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { LinkButton } from "@/components/ui";

export function PageHeader({
  eyebrow = "Workspace",
  title,
  body,
  actionHref,
  actionLabel
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 break-words text-3xl font-bold">{title}</h2>
        {body ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{body}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/help" className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold hover:bg-muted">
          <CircleHelp className="h-4 w-4" />
          Help
        </Link>
        {actionHref && actionLabel ? <LinkButton href={actionHref}>{actionLabel}</LinkButton> : null}
      </div>
    </div>
  );
}
