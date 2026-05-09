"use client";

// Drop the real image at public/images/[assetId].png (or .jpg/.webp) and this
// component automatically renders it. Until then it shows the prompt as a
// visual placeholder so layout is always correct.
export function PlaceholderImg({
  width,
  height,
  prompt,
  alt,
  assetId,
  className = "",
}: {
  width: number;
  height: number;
  prompt: string;
  alt: string;
  assetId: string;
  className?: string;
}) {
  // Real asset path convention: /images/{assetId}.png
  // The browser will 404 silently on the img src if the file doesn't exist,
  // so we always render the placeholder div as the fallback layer underneath.
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ aspectRatio: `${width}/${height}` }}
    >
      {/* Placeholder background — visible until the real image loads */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-center">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex flex-col gap-2 p-4 max-w-xs">
          <p className="text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest">[{assetId}]</p>
          <p className="text-xs font-bold text-white/60">{width} × {height}px</p>
          <p className="text-[11px] leading-snug text-white/40 italic">{prompt}</p>
        </div>
      </div>
      {/* Real image — renders on top when the file exists */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/${assetId}.png`}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}
