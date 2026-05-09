export function themeClass(theme: string | null | undefined) {
  const allowed = new Set([
    "flipside-field-light",
    "clean-contractor",
    "high-contrast-light",
    "jobsite-dark",
    "slate-office",
    "high-contrast-dark"
  ]);
  return allowed.has(theme ?? "") ? `theme-${theme}` : "theme-flipside-field-light";
}
