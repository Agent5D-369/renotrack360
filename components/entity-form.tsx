"use client";

import React, { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import dynamic from "next/dynamic";
import { Button, Field } from "@/components/ui";
import {
  catalogSchema,
  changeOrderSchema,
  estimateSchema,
  financingSchema,
  invoiceSchema,
  jobSchema,
  leadSchema,
  paymentSchema,
  profileSchema,
  propertySchema,
  quoteLineItemSchema,
  quoteSchema,
  settingsSchema,
  taskSchema,
  weeklyReportSchema
} from "@/lib/validators";

const RichTextEditor = dynamic(() => import("@/components/rich-text-editor").then((m) => ({ default: m.RichTextEditor })), { ssr: false, loading: () => <div className="min-h-[140px] animate-pulse rounded-md border border-border bg-muted" /> });

const schemas = {
  profile: profileSchema,
  lead: leadSchema,
  property: propertySchema,
  quote: quoteSchema,
  quoteLineItem: quoteLineItemSchema,
  catalog: catalogSchema,
  estimate: estimateSchema,
  job: jobSchema,
  task: taskSchema,
  weeklyReport: weeklyReportSchema,
  changeOrder: changeOrderSchema,
  invoice: invoiceSchema,
  payment: paymentSchema,
  financing: financingSchema,
  settings: settingsSchema
};

type FormKey = keyof typeof schemas;

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "color" | "textarea" | "richtext" | "select" | "checkbox" | "checkbox-group" | "hidden" | "slider" | "section";
  options?: Array<{ label: string; value: string; checked?: boolean }>;
  /** Link shown as "+ New" next to a select, opens in new tab so form context is kept */
  newHref?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | null;
  /** For "section" type - set false to suppress the top border separator */
  divided?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SliderField({ field, register }: { field: FormField; register: any }) {
  const [val, setVal] = useState(Number(field.defaultValue ?? 0));
  return (
    <div className="flex items-center gap-3 py-1.5">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        {...register(field.name as never)}
        name={field.name}
        defaultValue={val}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVal(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer accent-primary"
      />
      <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-primary">{val}</span>
    </div>
  );
}

export function EntityForm({
  formKey,
  fields,
  action,
  submitLabel = "Save",
  columns = 2,
  children
}: {
  formKey: FormKey;
  fields: FormField[];
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  columns?: 1 | 2 | 3;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const schema = schemas[formKey];
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur"
  });

  // Split fields at section markers into groups
  const groups: Array<{ title?: string; helpText?: string; divided?: boolean; items: FormField[] }> = [];
  let current: FormField[] = [];
  let currentSection: { title?: string; helpText?: string; divided?: boolean } = {};
  for (const field of fields) {
    if (field.type === "section") {
      if (current.length || currentSection.title) groups.push({ ...currentSection, items: current });
      current = [];
      currentSection = { title: field.label, helpText: field.helpText, divided: field.divided };
    } else {
      current.push(field);
    }
  }
  groups.push({ ...currentSection, items: current });
  const nonEmpty = groups.filter((g) => g.items.length > 0 || g.title);

  const colClass = columns === 3 ? "grid gap-4 md:grid-cols-3" : columns === 2 ? "grid gap-4 md:grid-cols-2" : "grid gap-4";

  function renderField(field: FormField) {
    if (field.type === "hidden") {
      return <input key={field.name} type="hidden" name={field.name} value={String(field.defaultValue ?? "")} />;
    }
    const error = form.formState.errors[field.name as keyof typeof form.formState.errors]?.message as string | undefined;
    return (
      <Field key={field.name} label={field.label} name={field.name} error={error}>
        {field.type === "richtext" ? (
          <RichTextEditor
            name={field.name}
            defaultValue={String(field.defaultValue ?? "")}
            placeholder={field.placeholder ?? field.helpText}
          />
        ) : field.type === "textarea" ? (
          <textarea
            id={field.name}
            {...form.register(field.name as never)}
            name={field.name}
            rows={4}
            defaultValue={String(field.defaultValue ?? "")}
            placeholder={field.placeholder ?? field.helpText}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        ) : field.type === "select" ? (
          <div className="flex items-center gap-2">
            <select
              id={field.name}
              {...form.register(field.name as never)}
              name={field.name}
              defaultValue={String(field.defaultValue ?? "")}
              className="h-11 flex-1 rounded-md border border-border bg-white px-3 text-base outline-none focus:ring-2 focus:ring-primary md:h-10 md:text-sm"
              title={field.helpText}
            >
              <option value="">Select</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.newHref && (
              <a href={field.newHref} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-bold hover:bg-muted" title="Create new record (opens in new tab)">+ New</a>
            )}
          </div>
        ) : field.type === "checkbox-group" ? (
          <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm font-semibold">
                <input name={field.name} value={option.value} type="checkbox" defaultChecked={option.checked} className="h-4 w-4 accent-primary" />
                {option.label}
              </label>
            ))}
          </div>
        ) : field.type === "checkbox" ? (
          <input
            id={field.name}
            {...form.register(field.name as never)}
            name={field.name}
            type="checkbox"
            defaultChecked={Boolean(field.defaultValue)}
            value="true"
            className="h-5 w-5 rounded border-border text-primary"
            title={field.helpText}
          />
        ) : field.type === "color" ? (
          <div className="flex items-center gap-3">
            <input
              id={field.name}
              {...form.register(field.name as never)}
              name={field.name}
              type="color"
              defaultValue={String(field.defaultValue ?? "#16231f")}
              className="h-11 w-16 cursor-pointer rounded-md border border-border bg-white p-1 outline-none focus:ring-2 focus:ring-primary"
              title={field.helpText}
            />
            <span className="text-sm text-muted-foreground">{field.helpText ?? "Click to choose a color"}</span>
          </div>
        ) : field.type === "slider" ? (
          <SliderField field={field} register={form.register} />
        ) : (
          <input
            id={field.name}
            {...form.register(field.name as never)}
            name={field.name}
            type={field.type ?? "text"}
            defaultValue={String(field.defaultValue ?? "")}
            placeholder={field.placeholder}
            title={field.helpText}
            className="h-11 rounded-md border border-border bg-white px-3 text-base outline-none focus:ring-2 focus:ring-primary md:h-10 md:text-sm"
          />
        )}
      </Field>
    );
  }

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="grid gap-6"
      onSubmit={() => form.trigger()}
    >
      {nonEmpty.map((group, i) => (
        <div key={i} className="grid gap-4">
          {group.title && (
            <div className={group.divided !== false && i > 0 ? "border-t border-border pt-2" : ""}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
              {group.helpText && <p className="mt-0.5 text-xs text-muted-foreground">{group.helpText}</p>}
            </div>
          )}
          <div className={colClass}>
            {group.items.map((field) => renderField(field))}
          </div>
        </div>
      ))}
      {children}
      <Button className="w-fit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
