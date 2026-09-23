import { requireStaffPage } from "@/lib/staff-access";
﻿import { updateSettings, updateSettingsTerms, saveAiProviderConfig, updateSmtpSettings, testSmtpConnection, checkAiProviderConnection } from "@/app/actions";
import { AiTestButton } from "@/components/ai-test-button";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { appThemes } from "@/lib/constants";
import { COUNTRIES } from "@/lib/address";
import { prisma } from "@/lib/prisma";
import { dateShort } from "@/lib/format";
import { TeamSection } from "@/components/team-section";
import { LogoUpload } from "@/components/logo-upload";

const PROVIDERS = [
  { value: "ANTHROPIC", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "OPENAI", label: "OpenAI (GPT-4o)", placeholder: "sk-..." },
  { value: "OPENROUTER", label: "OpenRouter", placeholder: "sk-or-..." },
  { value: "XAI", label: "xAI (Grok)", placeholder: "xai-..." },
  { value: "MISTRAL", label: "Mistral", placeholder: "..." },
  { value: "DEEPSEEK", label: "DeepSeek", placeholder: "sk-..." },
  { value: "OPENAI_COMPATIBLE", label: "OpenAI-compatible endpoint", placeholder: "Local or self-hosted key" },
] as const;

export default async function SettingsPage() {
  const actor = await requireStaffPage();
  const organizationId = actor.organizationId;
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId }
  });
  const [dropdowns, aiProviders, members] = await Promise.all([
    prisma.dropdownOption.findMany({ where: { organizationId, active: true }, orderBy: [{ optionSet: "asc" }, { sortOrder: "asc" }, { label: "asc" }] }),
    prisma.aiProviderConfig.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" } }),
    prisma.membership.findMany({ where: { organizationId, status: "ACTIVE", user: { organizationId } }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } })
  ]);
  const aiByProvider = new Map(aiProviders.map((p) => [p.provider, p]));
  const dropdownGroups = dropdowns.reduce<Record<string, typeof dropdowns>>((groups, option) => {
    groups[option.optionSet] = [...(groups[option.optionSet] ?? []), option];
    return groups;
  }, {});

  const brandColor = org.brandColor ?? "#16231f";
  const secondaryColor = org.brandSecondaryColor ?? "#ea580c";

  return (
    <>
      <PageHeader title="Settings" body="Company identity, brand kit, logo, and document templates." />

      {/* ── Brand Kit ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="mb-1 text-lg font-bold">Brand kit</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Your logo and brand colors appear in the sidebar, every PDF you generate (estimates, invoices, change orders, weekly reports, closeout packages), the client portal, approval links, and review requests.
        </p>

        {/* Logo upload */}
        <Panel className="mb-5 p-6">
          <h3 className="mb-1 text-base font-bold">Company logo</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Upload your logo once — it appears everywhere automatically.
          </p>
          <LogoUpload currentUrl={org.logoUrl} brandColor={brandColor} />
          {/* Fallback URL input for when Cloudinary isn't set up */}
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Or paste a public logo URL</p>
            <form action={updateSettings} className="flex gap-3">
              <input name="logoUrl" type="url" defaultValue={org.logoUrl ?? ""} placeholder="https://yoursite.com/logo.png"
                className="flex-1 h-9 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              {/* Hidden fields to preserve other settings */}
              <input type="hidden" name="name" value={org.name} />
              <input type="hidden" name="brandColor" value={brandColor} />
              <input type="hidden" name="brandSecondaryColor" value={secondaryColor} />
              <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Save URL
              </button>
            </form>
          </div>
        </Panel>

        {/* Color pickers + live preview */}
        <Panel className="overflow-hidden p-0">
          <div className="flex items-center gap-4 px-5 py-4" style={{ backgroundColor: brandColor }}>
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="Company logo" className="h-10 max-w-[160px] object-contain" />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/20 text-sm font-black text-white">
                {(org.name ?? "RT").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-lg font-bold text-white leading-tight">{org.name}</p>
              {org.companyTagline && <p className="text-sm text-white/70">{org.companyTagline}</p>}
            </div>
            <div className="hidden text-right md:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Estimate · Invoice · Report · Portal</p>
              <p className="text-sm font-semibold text-white/80">Document header preview</p>
            </div>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Primary brand color</label>
              <p className="text-xs text-muted-foreground">Sidebar background, PDF headers, section headings, buttons</p>
              <form action={updateSettings} className="mt-2 flex items-center gap-3">
                <input type="color" name="brandColor" defaultValue={brandColor}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border p-1" />
                <input type="hidden" name="name" value={org.name} />
                <input type="hidden" name="logoUrl" value={org.logoUrl ?? ""} />
                <input type="hidden" name="brandSecondaryColor" value={secondaryColor} />
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Save</button>
              </form>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Accent / secondary color</label>
              <p className="text-xs text-muted-foreground">Highlights, CTA buttons, badges, pricing callouts</p>
              <form action={updateSettings} className="mt-2 flex items-center gap-3">
                <input type="color" name="brandSecondaryColor" defaultValue={secondaryColor}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border p-1" />
                <input type="hidden" name="name" value={org.name} />
                <input type="hidden" name="logoUrl" value={org.logoUrl ?? ""} />
                <input type="hidden" name="brandColor" value={brandColor} />
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Save</button>
              </form>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Company Identity */}
        <div>
          <h2 className="mb-3 text-lg font-bold">Company identity</h2>
          <EntityForm
            formKey="settings"
            action={updateSettings}
            submitLabel="Save all settings"
            columns={1}
            fields={[
              { name: "name", label: "Company name", defaultValue: org.name },
              { name: "companyTagline", label: "Company tagline", defaultValue: org.companyTagline, placeholder: "Renovation operations from lead to closeout" },
              { name: "country", label: "Country", type: "select", defaultValue: (org as { country?: string }).country ?? "US", options: COUNTRIES.map((c) => ({ label: c.name, value: c.code })) },
              { name: "address", label: "Address", defaultValue: org.address },
              { name: "phone", label: "Phone", defaultValue: org.phone },
              { name: "email", label: "Email", defaultValue: org.email },
              { name: "website", label: "Website", defaultValue: org.website },
              { name: "brandColor", label: "Primary brand color", type: "color", defaultValue: brandColor, helpText: "Used in document headers, the sidebar, and primary buttons" },
              { name: "brandSecondaryColor", label: "Secondary / accent color", type: "color", defaultValue: secondaryColor, helpText: "Used for highlights and accents" },
              { name: "themePreference", label: "Interface theme", type: "select", defaultValue: org.themePreference, options: appThemes.map((theme) => ({ label: `${theme.name} (${theme.mode})`, value: theme.id })) },
              { name: "defaultMarkup", label: "Default markup %", type: "number", defaultValue: Number(org.defaultMarkup) },
              { name: "defaultContingency", label: "Default contingency %", type: "number", defaultValue: Number(org.defaultContingency) },
              { name: "reviewLink", label: "Google review link", defaultValue: org.reviewLink, placeholder: "https://g.page/r/your-review-link", helpText: "Sent to clients after job completion - paste your Google Business review URL" }
            ]}
          />
        </div>

        {/* Document Terms */}
        <div>
          <h2 className="mb-3 text-lg font-bold">Document terms &amp; footers</h2>
          <Panel className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">These appear on all PDFs you generate - estimates, invoices, change orders, and weekly reports.</p>
            <form action={updateSettingsTerms} className="grid gap-4">
              {[
                { name: "paymentTerms", label: "Payment terms", value: org.paymentTerms },
                { name: "estimateTerms", label: "Estimate terms", value: org.estimateTerms },
                { name: "invoiceTerms", label: "Invoice terms", value: org.invoiceTerms },
                { name: "weeklyReportFooter", label: "Weekly report footer", value: org.weeklyReportFooter }
              ].map(({ name, label, value }) => (
                <div key={name} className="grid gap-1">
                  <label htmlFor={name} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
                  <textarea id={name} name={name} defaultValue={value} rows={3} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
              ))}
              <button type="submit" className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Save terms</button>
            </form>
          </Panel>
        </div>
      </div>

      {/* AI Provider Configuration */}
      <div className="mt-6">
        <h2 className="mb-1 text-lg font-bold">AI provider</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Connect a supported provider using a deployment secret reference.
          Credentials stay on the server and AI runs only for features you trigger.
          AI drafts, you approve.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const config = aiByProvider.get(provider.value as Parameters<typeof aiByProvider.get>[0]);
            const hasKey = !!config?.apiKeySecretRef || !!config?.secretCiphertext;
            return (
              <Panel key={provider.value} className={`p-4 ${config?.enabled ? "border-primary/40" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-bold">{provider.label}</p>
                  {config?.enabled && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Active</span>
                  )}
                  {hasKey && !config?.enabled && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {config?.secretCiphertext ? "Company key saved" : "Key reference saved"}
                    </span>
                  )}
                </div>
                <form action={saveAiProviderConfig} className="grid gap-2">
                  <input type="hidden" name="provider" value={provider.value} />
                  <input
                    type="password"
                    name="apiKey"
                    placeholder={hasKey ? "Leave blank to keep the saved key" : provider.placeholder}
                    autoComplete="new-password"
                    className="h-9 rounded-md border border-border px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    name="apiKeySecretRef"
                    placeholder="Or reference a deployment secret: env:AI_PROVIDER_…"
                    className="h-9 rounded-md border border-border px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    A key you type here is encrypted with the operator key and is never shown again.
                    Leave both fields blank to keep the stored credential.
                  </p>
                  <label className="grid gap-1 text-xs font-semibold">
                    Endpoint type
                    <select name="endpointKind" defaultValue={config?.endpointKind ?? "HOSTED"} className="h-9 rounded-md border border-border px-2">
                      <option value="HOSTED">Hosted provider</option>
                      <option value="LOCAL">Local or self-hosted</option>
                    </select>
                  </label>
                  <input
                    type="text"
                    name="baseUrl"
                    placeholder="Inference base URL (hosted https or local http)"
                    defaultValue={config?.baseUrl ?? ""}
                    className="h-9 rounded-md border border-border px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    name="defaultModel"
                    placeholder="Default model, for example deepseek-flash"
                    defaultValue={config?.defaultModel ?? ""}
                    className="h-9 rounded-md border border-border px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <label className="grid gap-1 text-xs font-semibold">
                    Monthly AI budget (USD)
                    <input type="number" name="monthlyBudgetCents" min="0" step="0.01" defaultValue={config?.monthlyBudgetCents != null ? config.monthlyBudgetCents / 100 : ""} placeholder="No configured limit" className="h-9 rounded-md border border-border px-3" />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="allowClientData" defaultChecked={config?.allowClientData ?? false} />
                    Allow reviewed project and client text to be sent to this provider
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">
                    Provider retention policy
                    <select name="dataRetentionMode" defaultValue={config?.dataRetentionMode ?? "standard"} className="h-9 rounded-md border border-border px-2">
                      <option value="standard">Standard provider terms</option>
                      <option value="zero-retention">Require zero retention</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={config?.enabled ?? false}
                      className="h-4 w-4 accent-primary"
                    />
                    Enable as active provider
                  </label>
                  <button type="submit" className="h-8 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90">
                    {hasKey ? "Update" : "Save connection"}
                  </button>
                </form>
                {config && (
                  <div className="mt-3 border-t border-border pt-3">
                    <form action={checkAiProviderConnection.bind(null, config.id)}>
                      <button type="submit" className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">
                        Check connection
                      </button>
                    </form>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {config.lastCheckedAt
                        ? `${config.lastCheckStatus === "ok" ? "Verified" : "Check failed"} ${dateShort(config.lastCheckedAt)}: ${config.lastCheckMessage ?? ""}`
                        : "No reachability check recorded for this connection yet."}
                    </p>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
        <div className="mt-3 flex items-start gap-4">
          <AiTestButton />
          <p className="text-xs text-muted-foreground mt-2">
            One provider is active at a time. Budget checks use recorded estimated usage; provider billing remains authoritative.
          </p>
        </div>
      </div>

      {/* Dropdown library */}
      <div className="mt-6 rounded-lg border border-border bg-white p-5 shadow-soft">
        <h3 className="text-lg font-bold">Admin dropdown library</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Lead types, project types, sources, trades, and other lists. Database foundation in place - admin UI coming.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Object.entries(dropdownGroups).map(([name, options]) => (
            <div key={name} className="rounded-md border border-border p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">{name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {options.map((option) => <span key={option.id} className="rounded bg-muted px-2 py-1 text-xs font-semibold" title={option.description ?? undefined}>{option.label}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Email sender ── */}
      <Panel className="mt-6 p-6">
        <h2 className="text-lg font-bold">Email sender</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send invoices, weekly reports, and approval links directly from your Gmail address. Recipients see your name and email — not a platform address.
        </p>

        {/* Step-by-step instructions */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="mb-4 text-sm font-bold text-blue-900">How to get your Gmail App Password (one-time setup)</p>
          <ol className="grid gap-3 text-sm text-blue-800">
            {[
              ["Enable 2-Step Verification", "Go to myaccount.google.com → Security → 2-Step Verification → turn it On. This is required before App Passwords work."],
              ["Open App Passwords", "Go to myaccount.google.com → Security → scroll down to App Passwords (only visible after 2-Step is on)."],
              ["Create a new App Password", "Select app: Mail. Select device: Other (custom name). Type \"RenoTrack360\". Click Generate."],
              ["Copy the 16-character code", "Google shows a yellow box with a 16-character code like \"abcd efgh ijkl mnop\". Copy it exactly — spaces are fine."],
              ["Paste it below", "Enter your Gmail address and paste the code in the App Password field. Save. Done."],
            ].map(([title, detail], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-black text-blue-900">{i + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-blue-700">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-md bg-blue-100 px-3 py-2 text-xs text-blue-700">
            An App Password is a separate 16-character code Google generates for specific apps. It is not your Gmail password. You can revoke it at any time from Google Account → Security → App Passwords.
          </p>
        </div>

        {/* Status indicator */}
        {org.smtpFromEmail && org.smtpPassword ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Email configured — sending from {org.smtpFromEmail}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Not configured — emails will use fallback. Set up below to send from your Gmail.
          </div>
        )}

        {/* Save form */}
        <form action={updateSmtpSettings} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name (shown on emails)</label>
            <input name="smtpFromName" type="text" defaultValue={org.smtpFromName ?? ""} placeholder="Marcus Webb" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gmail address</label>
            <input name="smtpFromEmail" type="email" defaultValue={org.smtpFromEmail ?? ""} placeholder="marcus@gmail.com" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gmail App Password <span className="font-normal normal-case text-muted-foreground">(16 characters — not your real password)</span></label>
            <input name="smtpPassword" type="password" autoComplete="new-password" placeholder={org.smtpPassword ? "Leave blank to keep saved password" : "xxxx xxxx xxxx xxxx"} className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="h-10 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90">Save email settings</button>
          </div>
        </form>

        {/* Test form */}
        {org.smtpFromEmail && org.smtpPassword && (
          <form action={testSmtpConnection} className="mt-4 flex items-end gap-3 border-t border-border pt-4">
            <div className="flex-1 grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Send test email to</label>
              <input name="testTo" type="email" defaultValue={org.smtpFromEmail} className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button type="submit" className="h-10 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted">Send test →</button>
          </form>
        )}
      </Panel>

      {/* Billing */}

      {/* Team members */}
      <TeamSection members={members} orgId={organizationId} />
    </>
  );
}
