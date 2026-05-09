"use client";

import { useState } from "react";

export function AiTestButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function test() {
    setState("loading");
    setDetail("");
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setState("ok");
        setDetail(`${data.provider} / ${data.model}`);
      } else {
        setState("error");
        setDetail(data.error ?? "Connection failed");
      }
    } catch {
      setState("error");
      setDetail("Network error");
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        type="button"
        onClick={test}
        disabled={state === "loading"}
        className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50 transition"
      >
        {state === "loading" ? "Testing..." : "Test connection"}
      </button>
      {state === "ok" && (
        <span className="text-xs font-semibold text-green-700">Connected: {detail}</span>
      )}
      {state === "error" && (
        <span className="text-xs font-semibold text-red-600">{detail}</span>
      )}
    </div>
  );
}
