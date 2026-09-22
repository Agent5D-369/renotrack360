import type { WorkItemContent } from "@/lib/work-item-pilot";
import { Panel } from "@/components/ui";

export function WorkItemPlan({ content }: { content: WorkItemContent }) {
  return <div className="grid gap-5">
    <Panel className="p-5"><h2 className="font-semibold">Planning and review</h2><p className="mt-2 text-sm">{content.purpose}</p><p className="mt-2 text-sm">{content.reviewerPolicy}</p></Panel>
    <div className="grid gap-5 lg:grid-cols-2">{([
      ["Included scope", content.scope], ["Excluded scope", content.exclusions], ["Site assumptions", content.assumptions], ["Cost inputs to measure", content.costInputs],
    ] as const).map(([title, values]) => <Panel key={title} className="p-5"><h2 className="font-semibold">{title}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{values.map(value => <li key={value}>{value}</li>)}</ul></Panel>)}</div>
    <Panel className="p-5"><h2 className="font-semibold">Ordered work and evidence</h2><p className="mt-2 text-sm text-muted-foreground">Hold points require documented review before the next stage. Conditional work needs a recorded applicability decision. This is the template, not a completed job checklist.</p>
      <ol className="mt-5 space-y-5">{content.steps.map((step, index) => <li key={step.key} className="rounded-md border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{index + 1}. {step.title}</h3>{step.holdPoint && <span className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">Hold point</span>}</div>
        {step.condition && <p className="mt-2 text-sm font-semibold">{step.condition}</p>}<p className="mt-2 text-sm">{step.instructions}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{step.evidence.map(item => <li key={item.key}>{item.label} ({item.kind.toLowerCase()})</li>)}</ul>
      </li>)}</ol>
    </Panel>
    <Panel className="p-5"><h2 className="font-semibold">Manufacturer reference</h2><a className="mt-2 inline-block text-sm font-semibold text-primary underline" href={content.source.url} target="_blank" rel="noreferrer">{content.source.title}, {content.source.edition}</a><p className="mt-2 text-sm">Pages {content.source.pages}. Verified {content.source.retrievedAt}. Confirm the applicable current instructions before each job.</p><p className="mt-2 break-all text-xs text-muted-foreground">Retained source fingerprint: {content.source.sha256}</p></Panel>
  </div>;
}
