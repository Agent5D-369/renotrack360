"use client";

import { useState } from "react";

interface AiDraftButtonProps {
  type: "weekly-report" | "estimate-review";
  getPayload: () => Record<string, unknown>;
  onResult: (text: string) => void;
  label?: string;
  disabled?: boolean;
}

export function AiDraftButton({ type, getPayload, onResult, label, disabled }: AiDraftButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    setModel("");
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...getPayload() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI draft failed.");
        return;
      }
      onResult(data.text);
      if (data.model) setModel(data.model);
    } catch {
      setError("Connection error. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            Drafting with AI...
          </>
        ) : (
          <>
            <span className="text-base">✦</span>
            {label ?? "Draft with AI"}
          </>
        )}
      </button>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {model && !loading && (
        <p className="text-xs text-muted-foreground">
          Drafted with {model}. Review before saving. AI drafts, you decide.
        </p>
      )}
    </div>
  );
}
