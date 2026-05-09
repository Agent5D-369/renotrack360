import { prisma } from "@/lib/prisma";
import { dateShort, money } from "@/lib/format";

export default async function WaitlistAdminPage() {
  const [entries, totalCount] = await Promise.all([
    prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.waitlistEntry.count(),
  ]);

  const calcEntries = entries.filter((e) => e.calcLeakTotal != null);
  const avgLeak = calcEntries.length
    ? calcEntries.reduce((sum, e) => sum + (e.calcLeakTotal ?? 0), 0) / calcEntries.length
    : 0;

  const planCounts = entries.reduce<Record<string, number>>((acc, e) => {
    const plan = e.planInterest || "Unknown";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Super Admin</p>
          <h1 className="mt-0.5 text-3xl font-bold">Waitlist</h1>
        </div>
        <a
          href="/api/waitlist/export"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Export CSV
        </a>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total signups", value: totalCount.toString() },
          { label: "Calculator submissions", value: calcEntries.length.toString() },
          { label: "Avg leak (calculator)", value: avgLeak > 0 ? money(avgLeak) : "N/A" },
          { label: "Top plan interest", value: Object.entries(planCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "N/A" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="rounded-xl border border-border bg-white p-5">
        <p className="mb-3 text-sm font-bold">Plan interest breakdown</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(planCounts).sort(([, a], [, b]) => b - a).map(([plan, count]) => (
            <span key={plan} className="rounded-full border border-border px-3 py-1 text-sm">
              {plan}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-bold">#</th>
                <th className="px-4 py-3 text-left font-bold">Email</th>
                <th className="px-4 py-3 text-left font-bold">Name</th>
                <th className="px-4 py-3 text-left font-bold">Plan</th>
                <th className="px-4 py-3 text-left font-bold">Leak total</th>
                <th className="px-4 py-3 text-left font-bold">Source</th>
                <th className="px-4 py-3 text-left font-bold">Ref code</th>
                <th className="px-4 py-3 text-left font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3 text-muted-foreground">{totalCount - i}</td>
                  <td className="px-4 py-3 font-medium">{entry.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.firstName || "-"}</td>
                  <td className="px-4 py-3">
                    {entry.planInterest ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {entry.planInterest}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 font-bold text-red-600">
                    {entry.calcLeakTotal ? money(entry.calcLeakTotal) : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {entry.utmSource || entry.utmCampaign || "direct"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{entry.referralCode || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{dateShort(entry.createdAt)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No signups yet. Share the waitlist page to get your first entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
