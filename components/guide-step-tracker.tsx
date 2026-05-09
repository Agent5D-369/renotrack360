"use client";

import { useEffect } from "react";

const KEY = "rt360_guide_step";

export function GuideStepTracker({
  slug,
  title,
  globalStep,
  total,
}: {
  slug: string;
  title: string;
  globalStep: number;
  total: number;
}) {
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ slug, title, globalStep, total }));
    } catch {}
  }, [slug, title, globalStep, total]);

  return null;
}
