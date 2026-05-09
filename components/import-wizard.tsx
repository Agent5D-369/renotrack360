"use client";

import { useState } from "react";
import { processLeadImport, processContactImport, processJobImport, processCostCatalogImport } from "@/app/actions";

type ImportType = "leads" | "contacts" | "jobs" | "costCatalog";

const IMPORT_CONFIGS = {
  leads: {
    label: "Leads",
    description: "Import prospect leads from Buildertrend, Houzz Pro, or any CRM export.",
    columns: [
      { key: "col_name", label: "Lead name", required: true },
      { key: "col_type", label: "Lead type (optional)" },
      { key: "col_source", label: "Source (optional)" },
      { key: "col_budget", label: "Budget amount (optional)" },
      { key: "col_notes", label: "Notes (optional)" },
    ],
    action: processLeadImport,
  },
  contacts: {
    label: "Contacts",
    description: "Import clients, subs, vendors, or realtors from any CSV or Google Sheets.",
    columns: [
      { key: "col_name", label: "Full name", required: true },
      { key: "col_email", label: "Email (optional)" },
      { key: "col_phone", label: "Phone (optional)" },
      { key: "col_company", label: "Company (optional)" },
      { key: "col_notes", label: "Notes (optional)" },
    ],
    action: processContactImport,
  },
  jobs: {
    label: "Jobs",
    description: "Import active or past jobs from Buildertrend, CoConstruct, or any spreadsheet.",
    columns: [
      { key: "col_name", label: "Job name", required: true },
      { key: "col_contractAmount", label: "Contract amount (optional)" },
      { key: "col_status", label: "Status (optional)" },
      { key: "col_notes", label: "Notes (optional)" },
    ],
    action: processJobImport,
  },
  costCatalog: {
    label: "Cost Catalog",
    description: "Import your pricing library: services, units, and target costs.",
    columns: [
      { key: "col_category", label: "Category", required: true },
      { key: "col_serviceName", label: "Service name", required: true },
      { key: "col_unitType", label: "Unit type (optional)" },
      { key: "col_targetCost", label: "Target cost (optional)" },
      { key: "col_lowCost", label: "Low cost (optional)" },
      { key: "col_highCost", label: "High cost (optional)" },
    ],
    action: processCostCatalogImport,
  },
} as const;

function parseCsvHeaders(csv: string): string[] {
  const firstLine = csv.trim().split("\n")[0] ?? "";
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function guessColumn(headers: string[], hints: string[]): number {
  const h = headers.map((h) => h.toLowerCase());
  for (const hint of hints) {
    const idx = h.findIndex((col) => col.includes(hint));
    if (idx >= 0) return idx;
  }
  return -1;
}

function autoMap(headers: string[], importType: ImportType): Record<string, number> {
  if (importType === "leads") return {
    col_name: guessColumn(headers, ["name", "lead", "contact", "project"]),
    col_type: guessColumn(headers, ["type", "category"]),
    col_source: guessColumn(headers, ["source", "referral", "channel"]),
    col_budget: guessColumn(headers, ["budget", "amount", "value", "price"]),
    col_notes: guessColumn(headers, ["note", "comment", "description"]),
  };
  if (importType === "jobs") return {
    col_name: guessColumn(headers, ["job", "name", "project", "title"]),
    col_contractAmount: guessColumn(headers, ["contract", "amount", "value", "price", "total"]),
    col_status: guessColumn(headers, ["status", "stage", "phase"]),
    col_notes: guessColumn(headers, ["note", "comment", "description"]),
  };
  if (importType === "costCatalog") return {
    col_category: guessColumn(headers, ["category", "trade", "division", "type"]),
    col_serviceName: guessColumn(headers, ["service", "name", "item", "description", "task"]),
    col_unitType: guessColumn(headers, ["unit", "uom", "measure"]),
    col_targetCost: guessColumn(headers, ["target", "cost", "price", "amount"]),
    col_lowCost: guessColumn(headers, ["low", "min", "minimum"]),
    col_highCost: guessColumn(headers, ["high", "max", "maximum"]),
  };
  return {
    col_name: guessColumn(headers, ["name", "full name", "contact"]),
    col_email: guessColumn(headers, ["email", "e-mail"]),
    col_phone: guessColumn(headers, ["phone", "mobile", "cell", "tel"]),
    col_company: guessColumn(headers, ["company", "business", "organization", "employer"]),
    col_notes: guessColumn(headers, ["note", "comment"]),
  };
}

export function ImportWizard() {
  const [importType, setImportType] = useState<ImportType>("leads");
  const [step, setStep] = useState<"type" | "paste" | "map" | "confirm">("type");
  const [csvData, setCsvData] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [rowCount, setRowCount] = useState(0);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [loadingSheets, setLoadingSheets] = useState(false);

  const config = IMPORT_CONFIGS[importType];

  function parseCsv(csv: string) {
    const h = parseCsvHeaders(csv);
    const rows = csv.trim().split("\n").length - 1;
    setHeaders(h);
    setRowCount(rows);
    setMapping(autoMap(h, importType));
    setCsvData(csv);
    setStep("map");
  }

  async function loadFromSheets() {
    // Strict URL validation — only allow genuine Google Sheets URLs
    let parsedUrl: URL;
    try { parsedUrl = new URL(sheetsUrl); } catch { return; }
    if (parsedUrl.hostname !== "docs.google.com" || !parsedUrl.pathname.startsWith("/spreadsheets/")) {
      alert("Only Google Sheets URLs are supported (docs.google.com/spreadsheets/...)");
      return;
    }
    setLoadingSheets(true);
    try {
      const match = parsedUrl.pathname.match(/\/d\/([^/]+)/);
      if (!match) throw new Error("Could not parse Sheet ID from URL");
      const sheetId = encodeURIComponent(match[1]);
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("Sheet must be public (shared with 'Anyone with the link')");
      const csv = await res.text();
      parseCsv(csv);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load sheet");
    } finally {
      setLoadingSheets(false);
    }
  }

  if (step === "type") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-bold">What would you like to import?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select a type to begin.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.entries(IMPORT_CONFIGS) as [ImportType, { label: string; description: string; columns: readonly { key: string; label: string; required?: boolean }[]; action: unknown }][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setImportType(key); setStep("paste"); }}
              className="rounded-xl border border-border p-5 text-left hover:border-primary hover:bg-primary/5 transition"
            >
              <p className="font-bold">{cfg.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{cfg.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "paste") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep("type")} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back</button>
          <h2 className="font-bold">Import {config.label}</h2>
        </div>

        {/* Google Sheets */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-bold mb-2">From Google Sheets</p>
          <p className="text-xs text-muted-foreground mb-3">Paste a public Google Sheets URL. The sheet must be shared with "Anyone with the link."</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-10 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={loadFromSheets}
              disabled={loadingSheets || !sheetsUrl}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loadingSheets ? "Loading..." : "Load"}
            </button>
          </div>
        </div>

        {/* CSV paste */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-bold mb-2">Paste CSV data</p>
          <p className="text-xs text-muted-foreground mb-3">Copy from Excel, Google Sheets, or any CSV. Include the header row.</p>
          <textarea
            placeholder="Name,Email,Phone,Company&#10;John Smith,john@example.com,555-1234,Smith Co"
            rows={6}
            className="w-full rounded-md border border-border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => {
              if (e.target.value.includes(",") || e.target.value.includes("\t")) {
                // Auto-detect tab-delimited and convert
                const normalized = e.target.value.replace(/\t/g, ",");
                setCsvData(normalized);
              } else {
                setCsvData(e.target.value);
              }
            }}
            value={csvData}
          />
          <button
            type="button"
            onClick={() => csvData.trim() && parseCsv(csvData)}
            disabled={!csvData.trim()}
            className="mt-2 h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Continue to column mapping
          </button>
        </div>
      </div>
    );
  }

  if (step === "map") {
    const noneOption = { value: -1, label: "Skip this field" };
    const headerOptions = headers.map((h, i) => ({ value: i, label: `Column ${i + 1}: ${h}` }));
    const allOptions = [noneOption, ...headerOptions];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep("paste")} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back</button>
          <div>
            <h2 className="font-bold">Map columns · {rowCount} rows detected</h2>
            <p className="text-sm text-muted-foreground">We auto-detected likely matches. Adjust if needed.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          {config.columns.map((col) => (
            <div key={col.key} className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-sm font-semibold">{col.label}</label>
              <select
                value={mapping[col.key] ?? -1}
                onChange={(e) => setMapping((m) => ({ ...m, [col.key]: Number(e.target.value) }))}
                className="h-9 rounded-md border border-border px-2 text-sm"
              >
                {allOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStep("confirm")}
          disabled={mapping[config.columns[0].key] === -1}
          className="h-10 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Preview and confirm import
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    const preview = csvData.trim().split("\n").slice(1, 6);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep("map")} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back</button>
          <div>
            <h2 className="font-bold">Confirm import</h2>
            <p className="text-sm text-muted-foreground">{rowCount} {config.label.toLowerCase()} will be created. Duplicates are skipped.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">First {preview.length} rows preview</p>
          <div className="space-y-1">
            {preview.map((line, i) => (
              <p key={i} className="font-mono text-xs text-muted-foreground truncate">{line}</p>
            ))}
            {rowCount > 5 && <p className="text-xs text-muted-foreground">...and {rowCount - 5} more rows</p>}
          </div>
        </div>

        <form action={config.action} className="space-y-3">
          <input type="hidden" name="csvData" value={csvData} />
          {config.columns.map((col) => (
            <input key={col.key} type="hidden" name={col.key} value={mapping[col.key] ?? -1} />
          ))}
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary text-sm font-black text-primary-foreground hover:opacity-90"
          >
            Import {rowCount} {config.label.toLowerCase()}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
