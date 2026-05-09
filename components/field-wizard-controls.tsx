"use client";

import { useEffect, useState } from "react";

export function FieldWizardControls({ formId, totalSteps }: { formId: string; totalSteps: number }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const sections = Array.from(form.querySelectorAll<HTMLElement>("[data-wizard-step]"));
    sections.forEach((section) => {
      section.hidden = Number(section.dataset.wizardStep) !== step;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [formId, step]);

  return (
    <div className="sticky bottom-20 z-30 grid gap-2 rounded-lg border border-border bg-white p-3 shadow-soft lg:bottom-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} className="h-11 rounded-md border border-border px-4 text-sm font-bold" disabled={step === 1}>
          Back
        </button>
        <p className="text-sm font-bold text-muted-foreground">Step {step} of {totalSteps}</p>
        {step < totalSteps ? (
          <button type="button" onClick={() => setStep((current) => Math.min(totalSteps, current + 1))} className="h-11 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
            Continue
          </button>
        ) : (
          <button type="submit" className="h-11 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
            Create quote draft
          </button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>
    </div>
  );
}
