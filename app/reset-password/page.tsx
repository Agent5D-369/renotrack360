"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErrorMsg("Passwords do not match."); return; }
    if (password.length < 8) { setErrorMsg("Password must be at least 8 characters."); return; }
    setErrorMsg("");
    setStatus("loading");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
      setErrorMsg(error ?? "Something went wrong.");
      setStatus("error");
    }
  }

  if (!token) {
    return <p className="text-sm text-destructive">Invalid reset link. Please request a new one.</p>;
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-bold">Password updated!</p>
        <p className="mt-1">
          <a href="/login" className="underline">Sign in</a> with your new password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">New password</label>
        <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
          className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Confirm password</label>
        <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
          className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      {(errorMsg || status === "error") && (
        <p className="text-sm text-destructive">{errorMsg || "Something went wrong."}</p>
      )}
      <button type="submit" disabled={status === "loading"}
        className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
        {status === "loading" ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#16231f] px-5">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <div className="mb-6">
          <a href="/login" className="text-xs text-muted-foreground hover:underline">← Back to sign in</a>
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        </div>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </section>
    </main>
  );
}
