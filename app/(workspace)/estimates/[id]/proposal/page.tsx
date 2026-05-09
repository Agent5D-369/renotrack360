import Link from "next/link";
import { deleteEstimateOption, saveEstimateOption } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const tiers = [
  {
    key: "GOOD",
    label: "Good",
    tagClass: "bg-emerald-100 text-emerald-800",
    borderClass: "border-emerald-200 hover:border-emerald-400",
    priceClass: "text-emerald-700",
    placeholder: "Essential scope. Core work done right at the most accessible price point.",
    buttonClass: "bg-emerald-700 text-white hover:bg-emerald-800"
  },
  {
    key: "BETTER",
    label: "Better",
    recommended: true,
    tagClass: "bg-blue-100 text-blue-800",
    borderClass: "border-blue-400 ring-2 ring-blue-100",
    priceClass: "text-blue-700",
    placeholder: "Our recommended package. Best balance of value, quality, and finish. Most clients choose this.",
    buttonClass: "bg-blue-700 text-white hover:bg-blue-800"
  },
  {
    key: "BEST",
    label: "Best",
    tagClass: "bg-purple-100 text-purple-800",
    borderClass: "border-purple-300 hover:border-purple-400",
    priceClass: "text-purple-700",
    placeholder: "Premium scope. All upgrades, best materials, white-glove execution. Built to last.",
    buttonClass: "bg-purple-700 text-white hover:bg-purple-800"
  }
] as const;

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUniqueOrThrow({
    where: { id },
    include: {
      clientProfile: true,
      property: true,
      options: { orderBy: { sortOrder: "asc" } }
    }
  });

  const optionsByTier = new Map(estimate.options.map((opt) => [opt.optionTier, opt]));
  const clientName = estimate.clientProfile?.profileName ?? "your client";
  const address = estimate.property?.propertyAddress;

  return (
    <>
      <PageHeader
        title="Good · Better · Best Proposal"
        body={`Present three investment tiers to ${clientName}. Each tier defines a different scope and price point so the client can choose their level of investment.${address ? ` Property: ${address}.` : ""}`}
        actionHref={`/estimates/${id}`}
        actionLabel="Back to estimate"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((tier) => {
          const option = optionsByTier.get(tier.key);
          return (
            <div key={tier.key} className={`relative rounded-xl border-2 bg-white p-6 shadow-sm transition ${tier.borderClass}`}>
              {/* Tier header */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${tier.tagClass}`}>
                  {tier.label}
                </span>
                {"recommended" in tier && (
                  <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">Most popular</span>
                )}
              </div>

              {option ? (
                <>
                  {/* Existing option - show details + edit */}
                  <p className="mt-4 text-xl font-bold">{option.optionName}</p>
                  <p className={`mt-1 text-4xl font-black tracking-tight ${tier.priceClass}`}>{money(option.total)}</p>
                  {option.included && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      ★ Recommended by contractor
                    </p>
                  )}
                  {option.description && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                  )}

                  {/* Edit panel */}
                  <details className="mt-5 rounded-md border border-border bg-muted/30">
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-primary">Edit {tier.label} package →</summary>
                    <form action={saveEstimateOption} className="grid gap-3 p-4 pt-0">
                      <input type="hidden" name="estimateId" value={id} />
                      <input type="hidden" name="optionId" value={option.id} />
                      <input type="hidden" name="optionTier" value={tier.key} />
                      <label className="grid gap-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Package name</span>
                        <input
                          name="optionName"
                          defaultValue={option.optionName}
                          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total price ($)</span>
                        <input
                          name="total"
                          type="number"
                          step="100"
                          defaultValue={Number(option.total)}
                          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What&apos;s included (client-facing)</span>
                        <textarea
                          name="description"
                          defaultValue={option.description ?? ""}
                          rows={6}
                          placeholder="List scope items, materials, upgrades, and any exclusions..."
                          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input name="included" type="checkbox" value="true" defaultChecked={option.included} className="h-4 w-4 accent-primary" />
                        Mark as recommended
                      </label>
                      <div className="flex items-center gap-3">
                        <button type="submit" className={`rounded-md px-4 py-2 text-sm font-semibold ${tier.buttonClass}`}>
                          Save changes
                        </button>
                      </div>
                    </form>
                    <form action={deleteEstimateOption} className="border-t border-border px-4 py-2">
                      <input type="hidden" name="optionId" value={option.id} />
                      <input type="hidden" name="estimateId" value={id} />
                      <button type="submit" className="text-xs text-muted-foreground hover:text-destructive hover:underline">
                        Remove this tier
                      </button>
                    </form>
                  </details>
                </>
              ) : (
                <>
                  {/* No option yet - create form */}
                  <p className="mt-4 text-sm text-muted-foreground">{tier.placeholder}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">No {tier.label.toLowerCase()} package created yet.</p>
                  <form action={saveEstimateOption} className="mt-4 grid gap-3">
                    <input type="hidden" name="estimateId" value={id} />
                    <input type="hidden" name="optionTier" value={tier.key} />
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Package name</span>
                      <input
                        name="optionName"
                        placeholder={`${tier.label} Package`}
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total price ($)</span>
                      <input
                        name="total"
                        type="number"
                        step="100"
                        placeholder="0"
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What&apos;s included (client-facing)</span>
                      <textarea
                        name="description"
                        rows={6}
                        placeholder="List scope items, materials, upgrades, and any exclusions..."
                        className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>
                    <button type="submit" className={`rounded-md px-4 py-2 text-sm font-semibold ${tier.buttonClass}`}>
                      Create {tier.label.toLowerCase()} package
                    </button>
                  </form>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* How-to guidance */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="font-bold text-blue-900">How to build a winning proposal</h3>
        <div className="mt-3 grid gap-2 text-sm text-blue-800 md:grid-cols-3">
          <div>
            <p className="font-bold">Good - Entry point</p>
            <p className="mt-1 text-blue-700">Essential work only. No frills. Functional finish. Sets a floor price that feels accessible without underselling your labor.</p>
          </div>
          <div>
            <p className="font-bold">Better - Your recommendation</p>
            <p className="mt-1 text-blue-700">Add upgrades clients care about: better tile, soft-close hardware, an extra fixture. Most clients choose this when it&apos;s clearly explained.</p>
          </div>
          <div>
            <p className="font-bold">Best - Premium experience</p>
            <p className="mt-1 text-blue-700">Everything included. Best materials, all the details, longest-lasting result. Anchors the conversation and makes Better look like a great deal.</p>
          </div>
        </div>
      </div>

      {/* Client presentation preview */}
      {estimate.options.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Client view preview</h3>
            <Link href={`/estimates/${id}/proposal/present`} className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">
              Open presentation →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {tiers.map((tier) => {
              const option = optionsByTier.get(tier.key);
              if (!option) return null;
              return (
                <div key={tier.key} className={`rounded-lg border-2 p-4 ${tier.borderClass}`}>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tier.tagClass}`}>{tier.label}</span>
                  <p className="mt-2 font-bold">{option.optionName}</p>
                  <p className={`text-2xl font-black ${tier.priceClass}`}>{money(option.total)}</p>
                  {option.included && <p className="mt-1 text-xs font-semibold text-amber-600">★ Recommended</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
