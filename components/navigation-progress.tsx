"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(0);

  const clickTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  // Track whether we're mid-navigation so the pathname effect knows to complete
  const navigating = useRef(false);

  // Route committed — fill bar to 100% then fade out
  useEffect(() => {
    if (!navigating.current) return;
    navigating.current = false;
    window.clearTimeout(hideTimer.current);
    setWidth(100);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 380);
  // pathname/searchParams are the completion signal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function start() {
      window.clearTimeout(clickTimer.current);
      window.clearTimeout(hideTimer.current);
      // Small delay: skip the indicator for instant cache-hit navigations
      clickTimer.current = window.setTimeout(() => {
        navigating.current = true;
        setWidth(0);
        setVisible(true);
        // Two rAF ticks so browser paints width:0 before the transition fires
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setWidth(75));
        });
      }, 80);
    }

    function cancel() {
      window.clearTimeout(clickTimer.current);
      navigating.current = false;
    }

    function onClick(e: MouseEvent) {
      const a = (e.target as Element)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target || a.download) return;
      if (/^(mailto:|tel:|sms:)/.test(a.href)) return;
      if (a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      start();
    }

    function onSubmit() { start(); }
    function onPopstate() { cancel(); }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopstate);

    return () => {
      window.clearTimeout(clickTimer.current);
      window.clearTimeout(hideTimer.current);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopstate);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        height: "4px",
        width: `${width}%`,
        backgroundColor: "#4ade80",
        boxShadow: "0 0 12px #4ade80, 0 0 4px #4ade80",
        // Slow ease-out for the indeterminate 0→75%, fast ease-in for 75→100%
        transition: width >= 100
          ? "width 200ms ease-in"
          : width === 0
          ? "none"
          : "width 1600ms cubic-bezier(0.04, 0.6, 0.3, 1)",
        pointerEvents: "none",
      }}
    />
  );
}
