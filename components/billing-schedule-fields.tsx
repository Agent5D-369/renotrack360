"use client";

import { useMemo, useState } from "react";
import { calculateBillingMilestones } from "@/lib/billing-schedule";

export type BillingMilestoneField = {
  key: string;
  label: string;
  percent: string;
  triggerEvent: string;
  clientDescription: string;
};

export function BillingScheduleFields({
  contractTotal,
  initialMilestones,
}: {
  contractTotal: string;
  initialMilestones: BillingMilestoneField[];
}) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const totalPercent = useMemo(
    () => milestones.reduce((sum, milestone) => sum + (Number(milestone.percent) || 0), 0),
    [milestones],
  );
  const calculated = useMemo(() => {
    try { return calculateBillingMilestones(contractTotal, milestones); }
    catch { return []; }
  }, [contractTotal, milestones]);
  const amounts = new Map(calculated.map(milestone => [milestone.key, milestone.amount]));
  const deposit = calculated[0]?.amount ?? "";
  const field = "mt-1 block w-full rounded border border-border bg-white p-2";

  function update(index: number, name: keyof BillingMilestoneField, value: string) {
    setMilestones(current => current.map((milestone, itemIndex) =>
      itemIndex === index ? { ...milestone, [name]: value } : milestone));
  }

  function addMilestone() {
    if (milestones.length >= 12) return;
    const number = milestones.length + 1;
    setMilestones(current => [...current, {
      key: `draw-${crypto.randomUUID()}`,
      label: `Draw ${number}`,
      percent: "",
      triggerEvent: "",
      clientDescription: "",
    }]);
  }

  return (
    <fieldset className="grid gap-4 rounded-md border border-border p-4">
      <legend className="px-2 text-sm font-semibold">Retained payment milestones</legend>
      <input type="hidden" name="billingMilestones" value={JSON.stringify(milestones)} />
      <input type="hidden" name="requiredDeposit" value={deposit} />
      <p className="text-sm text-muted-foreground">
        Define the exact draws the client will review. A milestone describes when a draft invoice may be prepared; it does not send an invoice or record a payment.
      </p>
      {milestones.map((milestone, index) => (
        <div key={milestone.key} className="grid gap-3 rounded-md bg-muted/40 p-4 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Milestone {index + 1}{amounts.has(milestone.key) ? ` · ${Number(amounts.get(milestone.key)).toLocaleString("en-US", { style: "currency", currency: "USD" })}` : ""}</p>
            {milestones.length > 1 && (
              <button type="button" onClick={() => setMilestones(current => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-semibold text-muted-foreground underline">
                Remove
              </button>
            )}
          </div>
          <label className="text-sm">Client-facing label
            <input className={field} required maxLength={160} value={milestone.label} onChange={event => update(index, "label", event.target.value)} />
          </label>
          <label className="text-sm">Percent of contract
            <input className={field} required type="number" min="0.01" max="100" step="0.01" value={milestone.percent} onChange={event => update(index, "percent", event.target.value)} />
          </label>
          <label className="text-sm">When this draw becomes eligible
            <input className={field} required maxLength={300} value={milestone.triggerEvent} onChange={event => update(index, "triggerEvent", event.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">What the client should expect
            <textarea className={field} maxLength={1000} rows={2} value={milestone.clientDescription} onChange={event => update(index, "clientDescription", event.target.value)} />
          </label>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={addMilestone} disabled={milestones.length >= 12} className="font-semibold text-primary underline disabled:text-muted-foreground">
          Add payment milestone
        </button>
        <p className={Math.abs(totalPercent - 100) < 0.001 ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
          Scheduled total: {totalPercent.toFixed(2)}%
        </p>
      </div>
      <div className="rounded-md border border-border bg-white p-3 text-sm">
        <p className="font-semibold">Required deposit from first milestone: {deposit ? Number(deposit).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "Complete a 100% schedule to calculate"}</p>
        <p className="mt-1 text-xs text-muted-foreground">The retained proposal uses this exact amount as its documented deposit. Each draw is rounded to cents and the final draw carries the exact remaining balance.</p>
      </div>
    </fieldset>
  );
}
