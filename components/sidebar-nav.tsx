"use client";

import {
  AlertCircle,
  Banknote,
  Bell,
  BookOpen,
  Compass,
  ExternalLink,
  FileBarChart2,
  FileCheck,
  HandCoins,
  HardHat,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Palette,
  Receipt,
  Settings2,
  Sun,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
  Zap
} from "lucide-react";
import { NavLink, MobileNavLink } from "@/components/nav-link";

type NavItem = [string, string, React.ComponentType<{ className?: string }>];

const primaryNav: NavItem[] = [
  ["Home", "/home", LayoutDashboard],
  ["My Day", "/field", Sun]
];

const navGroups: Array<{ title: string; defaultOpen: boolean; items: NavItem[] }> = [
  {
    title: "Pipeline",
    defaultOpen: true,
    items: [
      ["Leads", "/leads", TrendingUp],
      ["Contacts", "/profiles", UserRound],
      ["Properties", "/properties", MapPin],
      ["Activities", "/activities", Bell]
    ]
  },
  {
    title: "Estimating",
    defaultOpen: true,
    items: [
      ["New Estimate", "/quotes/field-wizard", Zap],
      ["Estimates", "/estimates", FileCheck],
      ["Cost Catalog", "/cost-catalog", BookOpen]
    ]
  },
  {
    title: "Jobs",
    defaultOpen: true,
    items: [
      ["Jobs", "/jobs", HardHat],
      ["Weekly Reports", "/weekly-reports", FileBarChart2],
      ["Change Orders", "/change-orders", AlertCircle],
      ["Client Portal", "/client-portal", ExternalLink]
    ]
  },
  {
    title: "Money",
    defaultOpen: false,
    items: [
      ["Profit Leak", "/budget", TrendingDown],
      ["Invoices", "/invoices", Receipt],
      ["Payments", "/payments", Banknote],
      ["Financing", "/financing", HandCoins]
    ]
  },
  {
    title: "Admin",
    defaultOpen: false,
    items: [
      ["Settings", "/settings", Settings2],
      ["Waitlist", "/waitlist", UserRound],
      ["Guided Workflows", "/guided", Compass],
      ["Teaching Library", "/guided/library", BookOpen],
      ["Selections", "/selections", Palette],
      ["Service Templates", "/service-templates", LayoutTemplate],
      ["Imports", "/imports", Upload]
    ]
  }
];

const mobileNav: NavItem[] = [
  ["Home", "/", LayoutDashboard],
  ["Pipeline", "/leads", TrendingUp],
  ["Estimate", "/quotes/field-wizard", Zap],
  ["Jobs", "/jobs", HardHat],
  ["Money", "/invoices", Receipt]
];

const simpleNav: NavItem[] = [
  ["Home", "/home", LayoutDashboard],
  ["Pipeline", "/leads", TrendingUp],
  ["Estimate", "/quotes/field-wizard", Zap],
  ["Jobs", "/jobs", HardHat],
  ["Money", "/invoices", Receipt],
];

export function SidebarNav({ uiMode = "POWER" }: { uiMode?: string }) {
  const isSimple = uiMode === "SIMPLE";
  return (
    <nav className="grid gap-4 overflow-y-auto px-3 pb-6 pt-4" aria-label="Main navigation">
      {isSimple ? (
        <>
          <p className="px-1 text-xs font-bold uppercase tracking-widest text-white/25">Simple Mode</p>
          <div className="grid gap-0.5">
            {simpleNav.map(([label, href, Icon]) => (
              <NavLink key={href} label={label} href={href} Icon={Icon} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-0.5">
            {primaryNav.map(([label, href, Icon]) => (
              <NavLink key={href} label={label} href={href} Icon={Icon} />
            ))}
          </div>
        </>
      )}

      <div className={isSimple ? "hidden" : "grid gap-2"}>
        {navGroups.map((group) => (
          <details
            key={group.title}
            open={group.defaultOpen}
            suppressHydrationWarning
            className="rounded-lg border border-white/10 bg-white/[0.03]"
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/45 hover:text-white/80">
              {group.title}
            </summary>
            <div className="grid gap-0.5 px-1 pb-2 pt-0.5">
              {group.items.map(([label, href, Icon]) => (
                <NavLink key={href} label={label} href={href} Icon={Icon} compact />
              ))}
            </div>
          </details>
        ))}
      </div>
    </nav>
  );
}

export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white lg:hidden"
      aria-label="Mobile navigation"
    >
      {mobileNav.map(([label, href, Icon]) => (
        <MobileNavLink key={href} label={label} href={href} Icon={Icon} />
      ))}
    </nav>
  );
}
