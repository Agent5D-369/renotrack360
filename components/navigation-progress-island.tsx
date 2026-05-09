"use client";

import dynamic from "next/dynamic";

const NavigationProgress = dynamic(
  () => import("@/components/navigation-progress").then((m) => ({ default: m.NavigationProgress })),
  { ssr: false }
);

export function NavigationProgressIsland() {
  return <NavigationProgress />;
}
