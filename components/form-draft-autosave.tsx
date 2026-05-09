"use client";

import { useEffect } from "react";

export function FormDraftAutosave({ formId, storageKey }: { formId: string; storageKey: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const restore = () => {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}") as Record<string, string | string[]>;
      for (const element of Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        if (!element.name || !(element.name in saved)) continue;
        const savedValue = saved[element.name];
        if (element instanceof HTMLInputElement && element.type === "checkbox") {
          element.checked = Array.isArray(savedValue) ? savedValue.includes(element.value) : savedValue === element.value || savedValue === "true";
        } else if (typeof savedValue === "string") {
          element.value = savedValue;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new CustomEvent("draft-restore", { bubbles: true, detail: savedValue }));
        }
      }
    };

    const save = () => {
      const data: Record<string, string | string[]> = {};
      for (const element of Array.from(form.elements) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        if (!element.name) continue;
        if (element instanceof HTMLInputElement && element.type === "checkbox") {
          const existing = Array.isArray(data[element.name]) ? data[element.name] as string[] : [];
          if (element.checked) data[element.name] = [...existing, element.value];
        } else {
          data[element.name] = element.value;
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(data));
    };

    restore();
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", () => localStorage.removeItem(storageKey));
    return () => {
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
    };
  }, [formId, storageKey]);

  return null;
}
