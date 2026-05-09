interface ClientBrandHeaderProps {
  orgName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  tagline?: string | null;
  docLabel?: string;    // e.g. "Estimate Review", "Client Portal", "Approve Change Order"
  docNumber?: string;
}

export function ClientBrandHeader({
  orgName,
  logoUrl,
  brandColor,
  tagline,
  docLabel,
  docNumber,
}: ClientBrandHeaderProps) {
  const bg = brandColor ?? "#183d29";

  return (
    <header className="w-full" style={{ backgroundColor: bg }}>
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={orgName} className="h-10 max-w-[180px] shrink-0 object-contain" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/20 text-base font-black text-white">
              {orgName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{orgName}</p>
              {tagline && <p className="text-xs text-white/60">{tagline}</p>}
            </div>
          </div>
        )}
        {logoUrl && (
          <div className="border-l border-white/20 pl-4">
            <p className="text-sm font-bold text-white leading-tight">{orgName}</p>
            {tagline && <p className="text-xs text-white/60">{tagline}</p>}
          </div>
        )}
        {docLabel && (
          <div className="ml-auto text-right">
            <p className="text-xs font-black uppercase tracking-wider text-white/60">{docLabel}</p>
            {docNumber && <p className="text-sm font-semibold text-white/80">{docNumber}</p>}
          </div>
        )}
      </div>
    </header>
  );
}
