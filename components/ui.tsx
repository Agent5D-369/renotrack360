import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  className,
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "secondary" && "border border-border bg-white text-foreground hover:bg-muted",
        variant === "ghost" && "text-foreground hover:bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "secondary" && "border border-border bg-white text-foreground hover:bg-muted",
        variant === "ghost" && "text-foreground hover:bg-muted",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("overflow-hidden break-words rounded-lg border border-border bg-white shadow-soft", className)}>{children}</section>;
}

export function Field({
  label,
  name,
  children,
  error
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label htmlFor={name} className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
