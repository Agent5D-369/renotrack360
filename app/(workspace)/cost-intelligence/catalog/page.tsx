import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireStaffPage } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaffPage();
  const query = await searchParams, q = (query.q ?? "").slice(0, 120), kind = ["INSTALLATION", "MAINTENANCE", "MATERIAL", "PROJECT"].includes(query.kind) ? query.kind : "";
  const page = Math.max(1, Math.min(1000, Number.parseInt(query.page ?? "1", 10) || 1));
  const where: Prisma.CostSourceVersionWhereInput = { organizationId: DEFAULT_ORG_ID, ...(kind ? { kind } : {}), ...(q ? { AND: q.trim().split(/\s+/).filter(Boolean).map(word => ({ OR: [{ name: { contains: word, mode: "insensitive" as const } }, { category: { contains: word, mode: "insensitive" as const } }] })) } : {}) };
  const [total, count, records] = await Promise.all([prisma.costSourceVersion.count({ where: { organizationId: DEFAULT_ORG_ID } }), prisma.costSourceVersion.count({ where }), prisma.costSourceVersion.findMany({ where, orderBy: [{ name: "asc" }, { importedAt: "desc" }], skip: (page - 1) * 40, take: 40, select: { id: true, name: true, kind: true, category: true, sourceEdition: true, calculatorKind: true } })]);
  const pageUrl = (next: number) => `/cost-intelligence/catalog?${new URLSearchParams({ q, kind, page: String(next) })}`;
  return <>
    <PageHeader title="Cost and scope catalog" body={`${total.toLocaleString()} retained source versions for Flipside planning and estimating.`} />
    <Link href="/cost-intelligence" className="text-sm font-semibold text-primary">← Cost Intelligence</Link>
    <Panel className="my-5 p-5"><form className="flex flex-wrap items-end gap-3">
      <label className="grow text-sm">Search work, materials or category<input name="q" defaultValue={q} placeholder="shower pan, flooring, cabinets…" className="mt-1 block w-full rounded border p-2" /></label>
      <label className="text-sm">Catalog<select name="kind" defaultValue={kind} className="mt-1 block rounded border p-2"><option value="">All catalogs</option><option value="INSTALLATION">Installation</option><option value="MAINTENANCE">Maintenance</option><option value="MATERIAL">Materials</option><option value="PROJECT">Projects</option></select></label><Button type="submit">Search</Button>
    </form><p className="mt-3 text-sm text-muted-foreground">Quantity calculators use the retained source model and Austin ZIP 78704 factors. Reference entries retain scope and source options; their interactive price model is not yet translated. Source ranges inform planning and require job-specific review.</p></Panel>
    <p className="mb-3 text-sm">{count.toLocaleString()} matching versions</p>
    <div className="grid gap-3 md:grid-cols-2">{records.map(record => <Panel key={record.id} className="p-4"><Link href={`/cost-intelligence/catalog/${record.id}`} className="font-semibold text-primary hover:underline">{record.name}</Link><p className="mt-1 text-sm">{record.category}</p><p className="mt-2 text-xs text-muted-foreground">{record.sourceEdition} · {record.calculatorKind === "HOMEWYSE_UC1_V97" ? "Quantity calculator + scope" : "Scope and source reference"}</p></Panel>)}</div>
    {!count && <p className="py-5">No matching entries. Try a broader term.</p>}
    <nav aria-label="Catalog pages" className="my-5 flex gap-5">{page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}{page * 40 < count && <Link href={pageUrl(page + 1)}>Next →</Link>}</nav>
  </>;
}
