import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck, Star, Users } from "lucide-react";
import { GuideStepTracker } from "@/components/guide-step-tracker";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import {
  constructionLibrary,
  getLibraryStep,
  phaseLabels,
  type LibraryPhase
} from "@/lib/construction-library";

const phaseColors: Record<LibraryPhase, { badge: string; bg: string; border: string }> = {
  1: { badge: "bg-sky-100 text-sky-800", bg: "bg-sky-50", border: "border-sky-200" },
  2: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
  3: { badge: "bg-violet-100 text-violet-800", bg: "bg-violet-50", border: "border-violet-200" }
};

export default async function LibraryStepPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const step = getLibraryStep(slug);
  if (!step) notFound();

  const colors = phaseColors[step.phase];
  const allSteps = constructionLibrary;
  const currentIndex = allSteps.findIndex((s) => s.slug === slug);
  const prevStep = currentIndex > 0 ? allSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : null;

  return (
    <>
      {/* Saves current step to sessionStorage so the guide ribbon shows on other pages */}
      <GuideStepTracker
        slug={step.slug}
        title={step.title}
        globalStep={step.globalStepNumber}
        total={allSteps.length}
      />
      <PageHeader
        title={step.title}
        body={step.tagline}
        actionHref="/guided/library"
        actionLabel="All steps"
      />

      {/* Phase + step indicator */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors.badge}`}>
          Phase {step.phase} · Step {step.phaseNumber}
        </span>
        <span className="text-muted-foreground">{phaseLabels[step.phase]}</span>
        {step.clientFacing ? (
          <span className="flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
            <Users className="h-3 w-3" /> Client-facing
          </span>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Internal</span>
        )}
        <span className="text-xs text-muted-foreground">Global step {step.globalStepNumber} of {allSteps.length}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="grid gap-5">
          {/* Description */}
          <Panel className="p-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">What this step is</h3>
            <p className="text-sm leading-relaxed text-foreground">{step.description}</p>
            <div className={`mt-5 rounded-lg border ${colors.border} ${colors.bg} p-4`}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why it matters</p>
              <p className="mt-2 text-sm leading-relaxed">{step.whyItMatters}</p>
            </div>
          </Panel>

          {/* World class standard */}
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">World-class standard</h3>
            </div>
            <ul className="grid gap-3">
              {step.worldClass.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Common mistakes */}
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Common mistakes</h3>
            </div>
            <ul className="grid gap-3">
              {step.commonMistakes.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs font-bold text-red-500">✕</span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 self-start">
          {/* Proof required */}
          <Panel className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">Proof required</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">These deliverables confirm the step was completed to standard.</p>
            <ul className="grid gap-2">
              {step.proofRequired.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-border" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* App action */}
          {step.appAction && (
            <Panel className="p-5">
              <h3 className="mb-1 text-sm font-bold">Do this now in the app</h3>
              <p className="mb-3 text-xs text-muted-foreground">Opens in a new tab. This step stays open here so you can keep going when you are done.</p>
              <a
                href={`${step.appAction.href}${step.appAction.href.includes("?") ? "&" : "?"}returnTo=/guided/library/${step.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                {step.appAction.label}
                <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                A guide ribbon will appear at the top of every page so you can return here instantly.
              </p>
            </Panel>
          )}

          {/* Step nav */}
          <Panel className="p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Navigation</h3>
            <div className="grid gap-2">
              {prevStep && (
                <Link href={`/guided/library/${prevStep.slug}`} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted">
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="truncate font-semibold">{prevStep.title}</p>
                  </div>
                </Link>
              )}
              {nextStep && (
                <Link href={`/guided/library/${nextStep.slug}`} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Next</p>
                    <p className="truncate font-semibold">{nextStep.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              )}
            </div>
            <Link href="/guided/library" className="mt-3 block text-center text-xs font-semibold text-primary hover:underline">
              Browse all {allSteps.length} steps →
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
