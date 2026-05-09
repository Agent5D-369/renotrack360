"use client";

import { useRef, useState } from "react";

const SPECS = [
  { icon: "📐", label: "Ideal size", value: "400 × 120 px minimum" },
  { icon: "🎨", label: "Format", value: "PNG with transparent background" },
  { icon: "📦", label: "Max size", value: "3 MB" },
  { icon: "↔️", label: "Shape", value: "Horizontal / landscape" },
];

const TIPS = [
  ["Transparent background", "Use a version of your logo without a white or colored box behind it — it will blend perfectly into your sidebar and PDF headers regardless of color."],
  ["Light-colored logo for the sidebar", "Your sidebar uses your brand color as its background. A white or light version of your logo will have the most visual impact there."],
  ["Tight crop", "Remove extra whitespace around the logo before uploading. RenoTrack360 sizes the logo automatically — padding wastes space."],
  ["Horizontal orientation", "A wide logo (like a wordmark or logo + company name side by side) fits perfectly in document headers. Square or stacked logos can be cropped."],
  ["High resolution", "Upload at least 400px wide. The same file is used in your sidebar, all PDFs, client portal, approval links, and weekly reports."],
];

export function LogoUpload({
  currentUrl,
  brandColor = "#183d29",
}: {
  currentUrl?: string | null;
  brandColor?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [drag, setDrag] = useState(false);

  async function uploadFile(file: File) {
    setStatus("uploading");
    setErrorMsg("");
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch("/api/org/logo", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error ?? "Upload failed.");
      setStatus("error");
      return;
    }
    setPreview(data.url);
    setStatus("idle");
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    // Local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    uploadFile(file);
  }

  async function handleRemove() {
    await fetch("/api/org/logo", { method: "DELETE" });
    setPreview(null);
  }

  const bg = brandColor ?? "#183d29";

  return (
    <div className="grid gap-6">
      {/* Live preview — sidebar + document */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Sidebar preview */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sidebar preview</p>
          <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: bg }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Logo" className="h-8 max-w-[120px] object-contain" />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/20 text-sm font-black text-white">RT</div>
            )}
            <div>
              <p className="text-sm font-bold text-white leading-tight">Your Company</p>
              <p className="text-xs text-white/50">Command Center</p>
            </div>
          </div>
        </div>

        {/* Document header preview */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Document header preview</p>
          <div className="flex items-center gap-4 rounded-lg px-4 py-3" style={{ backgroundColor: bg }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Logo" className="h-10 max-w-[160px] object-contain" />
            ) : (
              <p className="text-sm font-bold text-white">Your Company Name</p>
            )}
            <div className="border-l border-white/20 pl-4">
              <p className="text-xs font-bold text-white">RENOVATION ESTIMATE</p>
              <p className="text-[10px] text-white/50">EST-1001</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors",
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="text-3xl">{status === "uploading" ? "⏳" : "☁️"}</div>
        <div className="text-center">
          <p className="text-sm font-semibold">
            {status === "uploading" ? "Uploading…" : "Drop your logo here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PNG · JPG · WebP · SVG · up to 3 MB</p>
        </div>
      </div>

      {errorMsg && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{errorMsg}</p>
      )}

      {preview && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Current logo" className="h-10 max-w-[160px] rounded border border-border object-contain p-1" />
          <div className="flex gap-2">
            <button onClick={() => inputRef.current?.click()} className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">
              Replace
            </button>
            <button onClick={handleRemove} className="h-8 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SPECS.map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-xs font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tips */}
      <details className="group rounded-xl border border-border">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Tips for a perfect logo upload</span>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="grid gap-3 border-t border-border px-4 pb-4 pt-3">
          {TIPS.map(([title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </details>

      {!process.env.NEXT_PUBLIC_CLOUDINARY_CONFIGURED && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>File upload requires Cloudinary.</strong> Set <code className="rounded bg-amber-100 px-1">CLOUDINARY_URL</code> in your Railway environment variables to enable logo uploads. Until then, paste a public logo URL in the Company Identity form below.
        </p>
      )}
    </div>
  );
}
