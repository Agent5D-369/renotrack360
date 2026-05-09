"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  label,
  href,
  Icon,
  compact = false
}: {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm font-medium transition",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        isActive
          ? "bg-white/20 font-semibold text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      )}
      title={label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function MobileNavLink({
  label,
  href,
  Icon
}: {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
      {label}
    </Link>
  );
}
