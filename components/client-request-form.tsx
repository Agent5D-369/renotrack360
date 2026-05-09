"use client";

import { useState } from "react";

export function ClientRequestForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch(`/api/portal/${token}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="font-bold text-green-700">Request sent.</p>
        <p className="mt-1 text-sm text-green-600">
          Your contractor will review your request and follow up with you soon.
        </p>
      </div>
    );
  }

  return (
    <details className="rounded-xl border border-border bg-white">
      <summary className="cursor-pointer select-none px-5 py-4 font-semibold text-[#0f172a] hover:bg-slate-50 rounded-xl list-none flex items-center justify-between">
        <span>Request a change or addition</span>
        <span className="text-muted-foreground text-sm">+</span>
      </summary>
      <div className="px-5 pb-5 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="change-request-message"
              className="block text-sm font-medium text-[#0f172a] mb-1.5"
            >
              Describe what you'd like to add or change
            </label>
            <textarea
              id="change-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. I'd like to add recessed lighting in the living room, or change the cabinet hardware to brushed nickel..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#183d29] focus:outline-none focus:ring-1 focus:ring-[#183d29] resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>
          {status === "error" && (
            <p className="text-sm text-red-600">
              Something went wrong. Please try again or contact your contractor directly.
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending" || !message.trim()}
            className="w-full rounded-md bg-[#183d29] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#143322] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending..." : "Send request to contractor"}
          </button>
        </form>
      </div>
    </details>
  );
}
