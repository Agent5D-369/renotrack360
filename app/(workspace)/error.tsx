"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WorkspaceError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Workspace error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="grid gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Something went wrong</p>
        <h1 className="text-2xl font-bold">This page failed to load</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          A server error occurred. If this keeps happening, restart the dev server and run{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npx prisma generate</code>.
        </p>
        {error.message && (
          <p className="max-w-lg rounded bg-muted px-3 py-2 font-mono text-xs text-left text-red-700 break-all">{error.message}</p>
        )}
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
