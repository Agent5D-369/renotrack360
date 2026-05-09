"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const KEY = "rt360_guide_step";

interface GuideState {
  slug: string;
  title: string;
  globalStep: number;
  total: number;
}

export function GuideProgressBar() {
  const pathname = usePathname();
  const [guide, setGuide] = useState<GuideState | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) setGuide(JSON.parse(stored));
    } catch {}
  }, [pathname]); // Re-check on every navigation

  function dismiss() {
    try { sessionStorage.removeItem(KEY); } catch {}
    setGuide(null);
  }

  // Don't show on the guide step page itself — you're already there
  if (!guide) return null;
  if (pathname === `/guided/library/${guide.slug}`) return null;

  const pct = Math.round((guide.globalStep / guide.total) * 100);

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      {/* Progress fill */}
      <div className="h-0.5 bg-primary/20">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/50">Guide</span>
          <span className="truncate text-sm font-semibold text-primary">{guide.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            Step {guide.globalStep} / {guide.total}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/guided/library/${guide.slug}`}
            className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            Return to guide →
          </Link>
          <button
            type="button"
            onClick={dismiss}
            title="End guide"
            className="text-lg leading-none text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
