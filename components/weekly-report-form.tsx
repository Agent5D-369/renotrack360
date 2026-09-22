"use client";

import { useRef, useState, useTransition } from "react";

interface Job {
  id: string;
  jobName: string;
}

interface WeeklyReportFormProps {
  jobs: Job[];
  defaultJobId: string;
  defaultWeekEnding: string;
  action: (formData: FormData) => Promise<void | { error: string } | { redirectTo: string }>;
  canRememberCompany?: boolean;
  defaultValues?: {
    workCompleted?: string;
    issuesFound?: string;
    decisionsNeeded?: string;
    budgetNotes?: string;
    scheduleNotes?: string;
    nextWeekPlan?: string;
    clientSummary?: string;
    internalNotes?: string;
  };
}

interface ReportEvidence {
  jobId: string;
  jobName: string;
  range: { startDate: string; endDate: string; timeZone: string };
  draft: { workCompleted: string };
  sources: Array<{ type: "FIELD_REPORT"; id: string; date: string; label: string; clientSafeText: string }>;
  missingCoverage: string[];
}

interface ReportGuideReady {
  state: "ready";
  taskId: string;
  status: "NEEDS_REVIEW";
  clientSummary: string;
  sources: Array<{ type: "FIELD_REPORT"; id: string; date: string; label: string }>;
  missingCoverage: string[];
  configurationVersion: 1;
  known: string[];
  canRememberCompanyStyle: boolean;
}

type ReportGuideResponse = ReportGuideReady | {
  state: "pending";
  taskId: string;
  status: "IN_PROGRESS";
} | {
  state: "failed";
  taskId: string;
  status: "FAILED";
  error: string;
  manualFallback: true;
  requiresNewRequestId: true;
};

function guideInputFingerprint(input: {
  jobId: string;
  weekEnding: string;
  workCompleted: string;
  issuesFound: string;
  decisionsNeeded: string;
  nextWeekPlan: string;
}) {
  return JSON.stringify(input);
}

function Field({ label, name, children, help }: { label: string; name: string; children: React.ReactNode; help?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">{label}</label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

const TA_CLASS = "w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y";

export function WeeklyReportForm({ jobs, defaultJobId, defaultWeekEnding, action, canRememberCompany = false, defaultValues }: WeeklyReportFormProps) {
  const [selectedJobId, setSelectedJobId] = useState(defaultJobId);
  const [weekEnding, setWeekEnding] = useState(defaultWeekEnding);
  const [workCompleted, setWorkCompleted] = useState(defaultValues?.workCompleted ?? "");
  const [clientSummary, setClientSummary] = useState(defaultValues?.clientSummary ?? "");
  const [nextWeekPlan, setNextWeekPlan] = useState(defaultValues?.nextWeekPlan ?? "");
  const [issuesFound, setIssuesFound] = useState(defaultValues?.issuesFound ?? "");
  const [decisionsNeeded, setDecisionsNeeded] = useState(defaultValues?.decisionsNeeded ?? "");
  const [budgetNotes, setBudgetNotes] = useState(defaultValues?.budgetNotes ?? "");
  const [scheduleNotes, setScheduleNotes] = useState(defaultValues?.scheduleNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(defaultValues?.internalNotes ?? "");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [guideResult, setGuideResult] = useState<ReportGuideReady | null>(null);
  const [guideTaskId, setGuideTaskId] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [guidePending, setGuidePending] = useState(false);
  const [guideError, setGuideError] = useState("");
  const [rememberCorrection, setRememberCorrection] = useState(false);
  const [correctionCategory, setCorrectionCategory] = useState("formatting");
  const [correctionScope, setCorrectionScope] = useState("JOB");
  const [correctionInstruction, setCorrectionInstruction] = useState("");
  const [saveError, setSaveError] = useState("");
  const [evidence, setEvidence] = useState<ReportEvidence | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const [evidenceApplied, setEvidenceApplied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const evidenceRequest = useRef(0);
  const guideVersion = useRef(0);
  const guideIdentity = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  function currentGuideInput() {
    return { jobId: selectedJobId, weekEnding, workCompleted, issuesFound, decisionsNeeded, nextWeekPlan };
  }

  function clearGuideTracking() {
    setGuideTaskId("");
    setRememberCorrection(false);
    setCorrectionCategory("formatting");
    setCorrectionScope("JOB");
    setCorrectionInstruction("");
    setAiDrafted(false);
    setSaveError("");
  }

  function invalidateGuide() {
    guideVersion.current += 1;
    guideIdentity.current = null;
    setGuideLoading(false);
    setGuidePending(false);
    setGuideResult(null);
    setGuideError("");
    clearGuideTracking();
  }

  async function loadGuideDraft() {
    const input = currentGuideInput();
    if (!input.jobId || !input.weekEnding) return;
    const fingerprint = guideInputFingerprint(input);
    if (!guideIdentity.current || guideIdentity.current.fingerprint !== fingerprint) {
      guideIdentity.current = { fingerprint, requestId: window.crypto.randomUUID() };
    }
    const identity = guideIdentity.current;
    const requestVersion = guideVersion.current;
    setGuideLoading(true);
    setGuideError("");
    try {
      const result = await fetch("/api/weekly-reports/guide/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: identity.requestId, ...input }),
      });
      const body = await result.json() as ReportGuideResponse | { error?: string };
      if (requestVersion !== guideVersion.current || fingerprint !== guideInputFingerprint(currentGuideInput())) return;
      if ("state" in body && body.state === "ready") {
        setGuideResult(body);
        setGuidePending(false);
        return;
      }
      if ("state" in body && body.state === "pending") {
        setGuideResult(null);
        setGuidePending(true);
        return;
      }
      setGuideResult(null);
      setGuidePending(false);
      setGuideError("error" in body && body.error ? body.error : "Report guide could not prepare a draft. You can continue writing the summary yourself.");
      if (!result.ok || ("state" in body && body.state === "failed")) guideIdentity.current = null;
    } catch {
      if (requestVersion === guideVersion.current) {
        setGuideError("Connection error while preparing the guide draft. Your report text is still available to edit and save.");
      }
    } finally {
      if (requestVersion === guideVersion.current) setGuideLoading(false);
    }
  }

  function applyGuideDraft() {
    if (!guideResult) return;
    if (guideInputFingerprint(currentGuideInput()) !== guideIdentity.current?.fingerprint) {
      invalidateGuide();
      setGuideError("The report details changed. Prepare a new guide draft before applying it.");
      return;
    }
    if (clientSummary.trim() && clientSummary.trim() !== guideResult.clientSummary.trim() && !window.confirm("Replace the current client summary with the Report guide draft?")) return;
    setClientSummary(guideResult.clientSummary);
    setGuideTaskId(guideResult.taskId);
    setAiDrafted(true);
  }

  function evidenceInputsChanged(nextJobId = selectedJobId, nextWeekEnding = weekEnding) {
    evidenceRequest.current += 1;
    setEvidenceLoading(false);
    setSelectedJobId(nextJobId);
    setWeekEnding(nextWeekEnding);
    setEvidence(null);
    setEvidenceError("");
    setEvidenceApplied(false);
    invalidateGuide();
  }

  async function loadEvidence() {
    if (!selectedJobId || !weekEnding) return;
    const requestId = ++evidenceRequest.current;
    setEvidenceLoading(true);
    setEvidenceError("");
    setEvidenceApplied(false);
    try {
      const result = await fetch("/api/weekly-reports/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, weekEnding }),
      });
      const body = await result.json();
      if (requestId !== evidenceRequest.current) return;
      if (!result.ok) {
        setEvidence(null);
        setEvidenceError(body.error ?? "Unable to load report evidence.");
        return;
      }
      invalidateGuide();
      setEvidence(body as ReportEvidence);
    } catch {
      if (requestId === evidenceRequest.current) setEvidenceError("Connection error while loading report evidence.");
    } finally {
      if (requestId === evidenceRequest.current) setEvidenceLoading(false);
    }
  }

  function applyEvidence(mode: "append" | "replace") {
    const suggestion = evidence?.draft.workCompleted.trim();
    if (!suggestion) return;
    if (mode === "replace" && workCompleted.trim() && !window.confirm("Replace the current work-completed text with the reviewed evidence?")) return;
    invalidateGuide();
    setWorkCompleted((current) => mode === "append" && current.trim() ? `${current.trim()}\n\n${suggestion}` : suggestion);
    setEvidenceApplied(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    setSaveError("");
    startTransition(async () => {
      const result = await action(fd);
      if (result && "error" in result) setSaveError(result.error);
      if (result && "redirectTo" in result) window.location.assign(result.redirectTo);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-5 max-w-3xl">
      {/* Job + week */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Job" name="jobId">
          <select
            name="jobId"
            value={selectedJobId}
            onChange={(e) => evidenceInputsChanged(e.target.value, weekEnding)}
            className="h-11 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a job...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.jobName}</option>
            ))}
          </select>
        </Field>
        <Field label="Week ending" name="weekEnding">
          <input
            type="date"
            name="weekEnding"
            value={weekEnding}
            onChange={(e) => evidenceInputsChanged(selectedJobId, e.target.value)}
            required
            className="h-11 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>

      <section className="rounded-xl border border-border bg-muted/30 p-4" aria-labelledby="report-evidence-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="report-evidence-heading" className="text-sm font-bold">Job evidence</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Review dated, client-visible field reports for this Austin reporting week. Nothing is added to the report until you choose an action below.
            </p>
          </div>
          <button
            type="button"
            onClick={loadEvidence}
            disabled={evidenceLoading || !selectedJobId || !weekEnding}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {evidenceLoading ? "Loading evidence..." : evidence ? "Refresh evidence" : "Review job evidence"}
          </button>
        </div>
        {evidenceError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{evidenceError}</p>}
        {evidence && (
          <div className="mt-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {evidence.jobName} · {evidence.range.startDate} through {evidence.range.endDate} · Austin time
            </p>
            {evidence.sources.length > 0 ? (
              <ul className="space-y-3">
                {evidence.sources.map((source) => (
                  <li key={`${source.type}-${source.id}`} className="rounded-lg border border-border bg-white p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{source.date} · {source.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{source.clientSafeText}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">No eligible completed-work text is available to load.</p>
            )}
            {evidence.missingCoverage.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
                <p className="text-xs font-bold uppercase tracking-wide">Missing or excluded coverage</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {evidence.missingCoverage.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {evidence.draft.workCompleted && (
              <div className="flex flex-wrap items-center gap-2">
                {workCompleted.trim() ? (
                  <>
                    <button type="button" onClick={() => applyEvidence("append")} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                      Append to work completed
                    </button>
                    <button type="button" onClick={() => applyEvidence("replace")} className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold hover:bg-muted">
                      Replace work completed
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => applyEvidence("replace")} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Use in work completed
                  </button>
                )}
                {evidenceApplied && <span role="status" className="text-xs font-semibold text-primary">Evidence loaded. Review and edit it before saving.</span>}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Work completed + voice */}
      <Field label="Work completed this week" name="workCompleted" help="Describe progress made: completed tasks, inspections passed, milestones hit.">
        <textarea
          name="workCompleted"
          value={workCompleted}
          onChange={(e) => { invalidateGuide(); setWorkCompleted(e.target.value); }}
          required
          placeholder="What got done this week..."
          className={TA_CLASS}
          rows={4}
        />
      </Field>

      {/* Report guide */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">Report guide</p>
            <p className="text-xs text-muted-foreground">
              Prepare a client summary from this job, reporting week, your notes, and eligible field reports. You decide whether to use it.
            </p>
          </div>
          <button
            type="button"
            onClick={loadGuideDraft}
            disabled={guideLoading || !selectedJob || !weekEnding}
            className="shrink-0 rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {guideLoading ? "Preparing..." : guidePending ? "Check draft status" : guideResult ? "Refresh draft record" : "Prepare summary"}
          </button>
        </div>
        {guideError && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{guideError}</p>}
        {guidePending && (
          <p role="status" className="text-sm text-muted-foreground">The draft is still being prepared. Check again to retrieve the same request without starting another one.</p>
        )}
        {guideResult && (
          <div className="space-y-3 rounded-lg border border-border bg-white p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Suggested client summary</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{guideResult.clientSummary}</p>
            </div>
            {guideResult.known.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground">What the guide could confirm</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {guideResult.known.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {guideResult.sources.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground">Field report sources</p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {guideResult.sources.map((source) => <li key={`${source.type}-${source.id}`}>{source.date} · {source.label}</li>)}
                </ul>
              </div>
            )}
            {guideResult.missingCoverage.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
                <p className="text-xs font-bold uppercase tracking-wide">Missing or unconfirmed details</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  {guideResult.missingCoverage.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <button type="button" onClick={applyGuideDraft} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Use this summary
            </button>
          </div>
        )}
        <div>
          <label htmlFor="clientSummary" className="text-sm font-bold">Client summary (shown on PDF)</label>
          <p className="text-xs text-muted-foreground">Write it yourself, or review and apply the suggestion above.</p>
        </div>
        <textarea
          id="clientSummary"
          name="clientSummary"
          value={clientSummary}
          onChange={(e) => { setClientSummary(e.target.value); setAiDrafted(false); }}
          placeholder="A plain-language summary for the homeowner or investor. No jargon."
          className={`${TA_CLASS} ${aiDrafted ? "border-primary/50 bg-white" : ""}`}
          rows={3}
        />
        {guideTaskId && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-white p-3">
            <input type="hidden" name="guideTaskId" value={guideTaskId} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-primary">Guide draft applied. Edit it freely; the saved report remains your reviewed final version.</p>
              <button type="button" onClick={clearGuideTracking} className="text-xs font-semibold text-muted-foreground underline underline-offset-2">
                Continue without guide tracking
              </button>
            </div>
            {guideResult && clientSummary.trim() !== guideResult.clientSummary.trim() && (
              <div className="space-y-3 border-t border-border pt-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="guideRememberCorrection"
                    value="on"
                    checked={rememberCorrection}
                    onChange={(event) => setRememberCorrection(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span><span className="font-semibold">Remember this correction</span><span className="block text-xs text-muted-foreground">Save only an explicit writing preference. Do not add job facts here.</span></span>
                </label>
                {rememberCorrection && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-xs font-semibold">
                      What should change next time?
                      <select name="guideCorrectionCategory" value={correctionCategory} onChange={(event) => setCorrectionCategory(event.target.value)} className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal">
                        <option value="formatting">Formatting</option>
                        <option value="detail">Level of detail</option>
                        <option value="ordering">Order of information</option>
                        <option value="terminology">Preferred terms</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold">
                      Use this preference for
                      <select name="guideCorrectionScope" value={correctionScope} onChange={(event) => setCorrectionScope(event.target.value)} className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal">
                        <option value="JOB">This job</option>
                        {guideResult.canRememberCompanyStyle && canRememberCompany && <option value="COMPANY">All company reports</option>}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold md:col-span-2">
                      Instruction to remember
                      <textarea name="guideCorrectionInstruction" value={correctionInstruction} onChange={(event) => setCorrectionInstruction(event.target.value)} maxLength={500} required className={TA_CLASS} rows={2} placeholder="For example: Put schedule changes before next week's plan." />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remaining fields */}
      <Field label="Next week plan" name="nextWeekPlan">
        <textarea name="nextWeekPlan" value={nextWeekPlan} onChange={(e) => { invalidateGuide(); setNextWeekPlan(e.target.value); }}
          placeholder="What will the crew tackle next week?" className={TA_CLASS} rows={3} />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Issues found" name="issuesFound" help="Hidden conditions, code violations, material delays.">
          <textarea name="issuesFound" value={issuesFound} onChange={(e) => { invalidateGuide(); setIssuesFound(e.target.value); }}
            placeholder="Any issues encountered..." className={TA_CLASS} rows={3} />
        </Field>
        <Field label="Decisions needed" name="decisionsNeeded" help="Selections or approvals needed before work continues.">
          <textarea name="decisionsNeeded" value={decisionsNeeded} onChange={(e) => { invalidateGuide(); setDecisionsNeeded(e.target.value); }}
            placeholder="What does the client need to decide?" className={TA_CLASS} rows={3} />
        </Field>
        <Field label="Budget notes" name="budgetNotes">
          <textarea name="budgetNotes" value={budgetNotes} onChange={(e) => setBudgetNotes(e.target.value)}
            placeholder="Cost alerts, change order impacts..." className={TA_CLASS} rows={2} />
        </Field>
        <Field label="Schedule notes" name="scheduleNotes">
          <textarea name="scheduleNotes" value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)}
            placeholder="Timeline impacts, revised estimates..." className={TA_CLASS} rows={2} />
        </Field>
      </div>

      <Field label="Internal notes" name="internalNotes" help="Not shown to the client. Crew issues, profitability flags, internal context.">
        <textarea name="internalNotes" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Internal notes..." className={TA_CLASS} rows={2} />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !workCompleted.trim()}
          className="h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save report"}
        </button>
      </div>
      {saveError && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{saveError}</p>}
    </form>
  );
}
