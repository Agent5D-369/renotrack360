import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/shell";
import { FlashToast } from "@/components/flash-toast";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Read uiMode from DB directly - JWT caching makes it stale after toggle
  let uiMode = "POWER";
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { uiMode: true } });
      uiMode = user?.uiMode ?? "POWER";
    } catch {
      // uiMode column may not exist yet if migration is pending — fall back to POWER
    }
  }
  return (
    <AppShell uiMode={uiMode}>
      {children}
      <Suspense>
        <FlashToast />
      </Suspense>
    </AppShell>
  );
}
