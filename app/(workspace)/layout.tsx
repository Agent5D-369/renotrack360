import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell";
import { FlashToast } from "@/components/flash-toast";
import { DemoBanner } from "@/components/demo-banner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let uiMode = "POWER";
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { uiMode: true } });
      uiMode = user?.uiMode ?? "POWER";
    } catch {
      // uiMode column may not exist yet — fall back to POWER
    }
  }

  const isDemo = process.env.TENANT_MODE === "DEMO" || process.env.SHOW_DEMO_CREDENTIALS === "true";

  return (
    <>
      {isDemo && <DemoBanner />}
      <AppShell uiMode={uiMode}>
        {children}
        <Suspense>
          <FlashToast />
        </Suspense>
      </AppShell>
    </>
  );
}
