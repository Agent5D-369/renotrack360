"use client";

import { useState } from "react";

interface LineItem {
  id: string;
  lineItemName: string;
  scopeArea: string;
  quantity: number;
  totalTarget: number;
}

interface EstimateAiReviewProps {
  quoteId: string;
  projectType?: string;
  quoteName: string;
  totalTarget: number;
  lineItems: LineItem[];
}

interface ReviewFlag {
  category: "UNDERPRICED" | "MISSING" | "CLARITY" | "LOOKS GOOD";
  item: string;
  reason: string;
}

function parseFlags(text: string): ReviewFlag[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(UNDERPRICED|MISSING|CLARITY|LOOKS GOOD):\s*(.+?)(?:\s+-\s+(.+))?$/i);
      if (!match) return null;
      return {
        category: match[1].toUpperCase() as ReviewFlag["category"],
        item: match[2].trim(),
        reason: match[3]?.trim() ?? "",
      };
    })
    .filter(Boolean) as ReviewFlag[];
}

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  UNDERPRICED: { bg: "border-red-200 bg-red-50", text: "text-red-700", label: "Possibly underpriced" },
  MISSING: { bg: "border-amber-200 bg-amber-50", text: "text-amber-800", label: "Possibly missing" },
  CLARITY: { bg: "border-blue-200 bg-blue-50", text: "text-blue-700", label: "Scope clarity" },
  "LOOKS GOOD": { bg: "border-green-200 bg-green-50", text: "text-green-700", label: "Looks solid" },
};

export function EstimateAiReview({ quoteId: _quoteId, projectType, quoteName, totalTarget, lineItems }: EstimateAiReviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flags, setFlags] = useState<ReviewFlag[] | null>(null);
  const [model, setModel] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function runReview() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "estimate-review",
          projectType,
          jobName: quoteName,
          total: Number(totalTarget),
          items: lineItems.map((item) => ({
            name: item.lineItemName,
            scopeArea: item.scopeArea,
            quantity: Number(item.quantity),
            total: Number(item.totalTarget),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "AI review failed."); return; }
      setFlags(parseFlags(data.text));
      setModel(data.model);
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!flags) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">AI Estimate Review</p>
            <p className="text-xs text-muted-foreground">
              Check for underpriced items, missing scope, and clarity issues before sending.
            </p>
          </div>
          {lineItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add line items first.</p>
          ) : (
            <button
              type="button"
              onClick={runReview}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Reviewing...
                </>
              ) : (
                <>✦ Review with AI</>
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">AI Estimate Review</p>
        <div className="flex items-center gap-3">
          {model && <p className="text-xs text-muted-foreground">{model}</p>}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        AI review only. Never auto-applied. You decide what to act on.
      </p>
      <div className="space-y-2">
        {flags.map((flag, i) => {
          const style = FLAG_STYLES[flag.category] ?? FLAG_STYLES.CLARITY;
          return (
            <div key={i} className={`rounded-lg border px-4 py-3 ${style.bg}`}>
              <div className="flex items-start gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${style.text} bg-white/60`}>
                  {style.label}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${style.text}`}>{flag.item}</p>
                  {flag.reason && (
                    <p className={`mt-0.5 text-xs ${style.text} opacity-80`}>{flag.reason}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={runReview}
        disabled={loading}
        className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
      >
        {loading ? "Re-reviewing..." : "Re-run review"}
      </button>
    </div>
  );
}
