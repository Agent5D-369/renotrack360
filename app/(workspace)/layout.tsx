import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/staff-access";
import { AppShell } from "@/components/shell";
import { FlashToast } from "@/components/flash-toast";
import { DemoBanner } from "@/components/demo-banner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect("/login?error=AccessDenied");
  const uiMode = staff.uiMode;

  const isDemo = false;

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
