"use client";

import { useState } from "react";

interface Member {
  id: string;
  role: string;
  user: { name: string | null; email: string | null };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  ESTIMATOR: "Estimator",
  FIELD_CREW: "Field Crew",
  CLIENT: "Client"
};

export function TeamSection({ members, orgId }: { members: Member[]; orgId: string }) {
  const [email, setEmail] = useState("");
  const role = "ADMIN";
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role })
    });
    if (res.ok) {
      setStatus("sent");
      setEmail("");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-bold">Team members</h2>
      <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
        {/* Current members */}
        <div className="grid gap-2 mb-5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold">{m.user.name ?? m.user.email}</p>
                {m.user.name && <p className="text-xs text-muted-foreground">{m.user.email}</p>}
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="border-t border-border pt-5">
          <p className="text-sm font-bold mb-3">Invite a team member</p>
          {status === "sent" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Invite sent! They&apos;ll get an email with a link to join.
              <button onClick={() => setStatus("idle")} className="ml-3 underline text-xs">Invite another</button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px] grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Role</label>
                <p className="flex h-10 items-center text-sm">Administrator access</p>
              </div>
              <button type="submit" disabled={status === "loading"}
                className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {status === "loading" ? "Sending…" : "Send invite"}
              </button>
              {errorMsg && <p className="w-full text-sm text-destructive">{errorMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
