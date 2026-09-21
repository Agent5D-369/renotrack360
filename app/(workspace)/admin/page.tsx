import { requireStaffPage } from "@/lib/staff-access";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { dateShort } from "@/lib/format";

export default async function AdminPage() {
  await requireStaffPage();
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) redirect("/home");

  const [
    orgCount,
    userCount,
    waitlistCount,
    recentWaitlist,
    orgs,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, email: true, firstName: true, planInterest: true, createdAt: true, calcLeakTotal: true }
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        subscription: { select: { planTier: true, status: true } },
        _count: { select: { users: true, jobs: true, leads: true } }
      }
    })
  ]);

  return (
    <>
      <PageHeader
        title="Platform Admin"
        body="Super admin only. Manage waitlist, view organizations, and monitor platform health."
      />
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Super admin access active. Actions here affect all tenants.
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Organizations</p>
          <p className="mt-2 text-3xl font-black">{orgCount}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total users</p>
          <p className="mt-2 text-3xl font-black">{userCount}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Waitlist</p>
          <p className="mt-2 text-3xl font-black">{waitlistCount}</p>
          <Link href="/waitlist" className="mt-1 text-xs font-semibold text-primary hover:underline">Manage →</Link>
        </Panel>
      </div>

      {/* Orgs */}
      <Panel className="mb-6 overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Organizations ({orgCount})</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-bold">Name</th>
              <th className="px-4 py-2 font-bold">Plan</th>
              <th className="px-4 py-2 font-bold">Users</th>
              <th className="px-4 py-2 font-bold">Jobs</th>
              <th className="px-4 py-2 font-bold">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{org.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                    org.subscription?.planTier === "TEAM" ? "bg-primary/10 text-primary" :
                    org.subscription?.planTier === "ENTERPRISE" ? "bg-purple-100 text-purple-800" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {org.subscription?.planTier ?? "No plan"} {org.subscription?.status ? `· ${org.subscription.status}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3">{org._count.users}</td>
                <td className="px-4 py-3">{org._count.jobs}</td>
                <td className="px-4 py-3 text-muted-foreground">{dateShort(org.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Recent waitlist */}
      <Panel className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent waitlist signups</p>
          <Link href="/waitlist" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-bold">Email</th>
              <th className="px-4 py-2 font-bold">Name</th>
              <th className="px-4 py-2 font-bold">Plan interest</th>
              <th className="px-4 py-2 font-bold">Leak calc</th>
              <th className="px-4 py-2 font-bold">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {recentWaitlist.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-4 py-3">{w.email}</td>
                <td className="px-4 py-3">{w.firstName ?? "—"}</td>
                <td className="px-4 py-3">{w.planInterest ?? "—"}</td>
                <td className="px-4 py-3">{w.calcLeakTotal ? `$${Math.round(Number(w.calcLeakTotal)).toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{dateShort(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
