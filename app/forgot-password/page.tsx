"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#16231f] px-5">
      <section className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <div className="mb-6">
          <a href="/login" className="text-xs text-muted-foreground hover:underline">← Back to sign in</a>
          <h1 className="mt-4 text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-bold">Check your email</p>
            <p className="mt-1">If an account exists for <strong>{email}</strong>, a reset link was sent. Check your spam folder if it doesn&apos;t arrive within a minute.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>
            {status === "error" && (
              <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
