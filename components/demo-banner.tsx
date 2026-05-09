"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "renotrack_demo_banner_dismissed";

function getDismissedUntil(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function dismissUntilTomorrow() {
  // Dismiss until next 3 AM CST (UTC-6 = 9 AM UTC)
  const now = new Date();
  const next3amCST = new Date();
  next3amCST.setUTCHours(9, 0, 0, 0); // 3 AM CST = 9 AM UTC
  if (next3amCST <= now) next3amCST.setUTCDate(next3amCST.getUTCDate() + 1);
  try {
    localStorage.setItem(STORAGE_KEY, String(next3amCST.getTime()));
  } catch {
    // ignore
  }
}

export function DemoBanner() {
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissedUntil = getDismissedUntil();
    if (Date.now() < dismissedUntil) {
      setShowBanner(true); // still show the small persistent strip
      return;
    }
    setShowModal(true);
    setShowBanner(true);
  }, []);

  function handleDismiss() {
    dismissUntilTomorrow();
    setShowModal(false);
  }

  if (!showBanner) return null;

  return (
    <>
      {/* Persistent top strip — always visible in demo mode */}
      <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white">
        <span>
          <span className="font-black uppercase tracking-wider">DEMO ENVIRONMENT</span>
          {" · "}Do not enter real client data · Database resets nightly at 3:00 AM CST
        </span>
        {!showModal && (
          <button onClick={() => setShowModal(true)} className="shrink-0 underline hover:no-underline">
            Details
          </button>
        )}
      </div>

      {/* First-visit modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleDismiss}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl">
                🔒
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">Shared demo environment</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  This is a live demo of RenoTrack360 shared with everyone who visits. You&apos;re welcome to explore every feature — just keep these ground rules in mind:
                </p>
                <ul className="mt-4 grid gap-2 text-sm">
                  {[
                    ["🚫", "Don't enter real client names, emails, or phone numbers"],
                    ["🚫", "Don't enter real job addresses or financial data"],
                    ["✅", "Create fake leads, estimates, and jobs freely — that's what it's here for"],
                    ["🔄", "The database resets every night at 3:00 AM CST — all changes are cleared"],
                  ].map(([icon, text]) => (
                    <li key={text} className="flex items-start gap-2">
                      <span className="shrink-0 text-base">{icon}</span>
                      <span className="text-muted-foreground">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 rounded-lg bg-[#183d29] py-3 text-sm font-bold text-white hover:opacity-90"
              >
                Got it — explore the demo
              </button>
              <a
                href="/pricing"
                onClick={handleDismiss}
                className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-semibold hover:bg-muted"
              >
                See pricing →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
