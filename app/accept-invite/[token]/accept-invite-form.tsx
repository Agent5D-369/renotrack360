"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) { setErrorMsg("Password must be at least 12 characters."); return; }
    setErrorMsg("");
    setStatus("loading");

    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }
    // Sign in with credentials
    await signIn("credentials", { email, password, callbackUrl: "/home" });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <div className="grid gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name</label>
        <input type="text" required value={name} onChange={e => setName(e.target.value)}
          className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
        <input type="email" value={email} readOnly
          className="h-10 rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground" />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Create password</label>
        <input type="password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)}
          className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
      </div>
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      <button type="submit" disabled={status === "loading"}
        className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
        {status === "loading" ? "Setting up account…" : "Accept invitation"}
      </button>
    </form>
  );
}
