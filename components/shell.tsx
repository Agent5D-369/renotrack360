import { Suspense } from "react";
import Link from "next/link";
import { FLIPSIDE_NAME } from "@/lib/flipside-brand";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NavigationProgressIsland } from "@/components/navigation-progress-island";
import { GuideProgressBar } from "@/components/guide-progress-bar";
import { SidebarNav, MobileNav } from "@/components/sidebar-nav";
import { toggleUiMode } from "@/app/actions";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { themeClass } from "@/lib/themes";
import { cn, hexToHsl } from "@/lib/utils";

export async function AppShell({ children, uiMode = "POWER" }: { children: React.ReactNode; uiMode?: string }) {
  const [session, org] = await Promise.all([
    getServerSession(authOptions),
    prisma.organization.findUnique({
      where: { id: DEFAULT_ORG_ID },
      select: { themePreference: true, brandColor: true, brandSecondaryColor: true, name: true, companyTagline: true, logoUrl: true }
    })
  ]);

  const sidebarBg = "#171717";
  const brandHsl = org?.brandColor ? hexToHsl(org.brandColor) : null;
  const secondaryHsl = org?.brandSecondaryColor ? hexToHsl(org.brandSecondaryColor) : null;
  const cssVars = {
    ...(brandHsl ? { "--primary": brandHsl } : {}),
    ...(secondaryHsl ? { "--accent": secondaryHsl } : {})
  } as React.CSSProperties;

  return (
    <div
      className={cn("min-h-screen pb-20 lg:grid lg:grid-cols-[272px_1fr] lg:pb-0", themeClass(org?.themePreference))}
      style={Object.keys(cssVars).length ? cssVars : undefined}
    >
      <Suspense><NavigationProgressIsland /></Suspense>

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border text-white lg:block lg:min-h-screen" style={{ backgroundColor: sidebarBg }}>
        {/* Logo / brand */}
        <div className="flex min-h-24 items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0"><p className="text-xl font-bold tracking-tight">RenoTrack360</p><p className="mt-1 text-xs text-white/70">{FLIPSIDE_NAME}</p></div>
        </div>

        {/* Navigation */}
        <SidebarNav uiMode={uiMode} />
        {/* Mode toggle */}
        <div className="border-t border-white/10 px-3 py-2">
          <form action={toggleUiMode}>
            <button type="submit" className="w-full rounded-md px-3 py-2 text-xs font-semibold text-white/40 hover:text-white/70 text-left transition">
              {uiMode === "SIMPLE" ? "⚡ Switch to Power Mode" : "◎ Switch to Simple Mode"}
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main className="min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur-sm md:px-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground lg:hidden">RenoTrack360</span><span className="hidden lg:inline">{FLIPSIDE_NAME} · Austin</span>
          </p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/guided" className="hidden text-muted-foreground hover:text-foreground md:block">
              Guides
            </Link>
            {Boolean((session?.user as Record<string, unknown>)?.isSuperAdmin) && (
              <Link href="/admin" className="hidden rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 hover:bg-amber-200 md:block">
                Admin
              </Link>
            )}
            <span className="hidden text-muted-foreground md:block">{session?.user?.name ?? "Owner"}</span>
            <Link href="/api/auth/signout" className="text-muted-foreground hover:text-foreground">
              Sign out
            </Link>
          </div>
        </header>

        <Suspense><GuideProgressBar /></Suspense>
        <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
