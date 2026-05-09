import { ClipboardCheck, FileText, Home, Ruler, ShieldCheck } from "lucide-react";
import { createQuoteFromFieldWizard } from "@/app/actions";
import { FieldWizardControls } from "@/components/field-wizard-controls";
import { FormDraftAutosave } from "@/components/form-draft-autosave";
import { PageHeader } from "@/components/page-header";
import { RoomMeasurementGrid } from "@/components/room-measurement-grid";
import { Panel } from "@/components/ui";

import { allowanceItems, exteriorChecks, fieldStandardChecks, garageChecks, materialResponsibilityItems, roomPresets } from "@/lib/field-estimate-wizard";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

function inputClass() {
  return "h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";
}

function textareaClass() {
  return "min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";
}

function SelectOne() {
  return <option value="">Please select one</option>;
}

function SectionHeader({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function CheckGrid({ items, name }: { items: readonly { key: string; label: string }[]; name: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <label key={item.key} className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
          <input name={name} value={item.key} type="checkbox" className="h-5 w-5 accent-primary" />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
}

const extraRoomSlots = Array.from({ length: 6 }, (_, index) => index + 1);
const customRoomTypes = ["Bedroom", "Bathroom", "Kitchen", "Outdoor kitchen", "Living room", "Dining room", "Office", "Laundry room", "Garage", "Hall", "Flex area"] as const;

export default async function FieldQuoteWizardPage() {
  const [profiles, properties, leads] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.property.findMany({ select: { id: true, propertyAddress: true }, orderBy: { propertyAddress: "asc" } }),
    prisma.lead.findMany({ select: { id: true, leadName: true }, orderBy: { updatedAt: "desc" } })
  ]);

  return (
    <form id="field-quote-wizard" action={createQuoteFromFieldWizard} className="mx-auto grid max-w-5xl gap-5">
      <FormDraftAutosave formId="field-quote-wizard" storageKey="flipside:field-quote-draft" />
      <PageHeader
        title="Mobile Quote Wizard"
        body="A phone-first replacement for the printed field estimation sheet: capture client context, material responsibility, room measurements, phase notes, allowances, and draft quote lines before anything gets forgotten."
      />

      <section data-wizard-step="1">
      <Panel className="p-5">
        <SectionHeader icon={Home} title="1. Job context" body="Start with enough information to create the quote draft and tie the walkthrough to the right relationship, property, and lead." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">Quote name<input name="quoteName" required placeholder="Willow Bend field walkthrough" className={inputClass()} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Project type<input name="projectType" placeholder="Kitchen, baths, full turn, listing rescue..." className={inputClass()} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Client<select name="clientProfileId" defaultValue="" className={inputClass()}><SelectOne />{relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold">Property<select name="propertyId" defaultValue="" className={inputClass()}><SelectOne />{relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold">Lead<select name="leadId" defaultValue="" className={inputClass()}><SelectOne />{relationOptions(leads.map((l) => ({ id: l.id, label: l.leadName }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold">Target send date<input name="targetSendDate" type="date" className={inputClass()} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Budget range<input name="budgetRange" placeholder="$45k-$70k, unknown, investor cap..." className={inputClass()} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Risk level<select name="riskLevel" defaultValue="MEDIUM" className={inputClass()}>{options.riskLevels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold">GC markup %<input name="gcMarkup" type="number" defaultValue={18} className={inputClass()} /></label>
          <label className="grid gap-1.5 text-sm font-semibold">Contingency %<input name="contingency" type="number" defaultValue={8} className={inputClass()} /></label>
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">Walkthrough overview<textarea name="overview" className={textareaClass()} placeholder="Client goals, must-haves, budget posture, deadline, visible constraints..." /></label>
      </Panel>
      </section>

      <section data-wizard-step="2">
      <Panel className="p-5">
        <SectionHeader icon={ShieldCheck} title="2. Materials and responsibility" body="Clarify what the owner is supplying versus what the contractor is responsible for. This prevents estimate drift and change-order confusion." />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="font-bold">Owner provides</h3>
            <div className="mt-3 grid gap-2">
              {materialResponsibilityItems.map((item) => <label key={item} className="flex gap-3 rounded-md border border-border px-3 py-2 text-sm"><input name="ownerProvides" value={item} type="checkbox" className="h-5 w-5 accent-primary" />{item}</label>)}
            </div>
          </div>
          <div>
            <h3 className="font-bold">Contractor provides</h3>
            <div className="mt-3 grid gap-2">
              {materialResponsibilityItems.map((item) => <label key={item} className="flex gap-3 rounded-md border border-border px-3 py-2 text-sm"><input name="contractorProvides" value={item} type="checkbox" className="h-5 w-5 accent-primary" />{item}</label>)}
            </div>
          </div>
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">Selection notes<textarea name="selectionNotes" className={textareaClass()} placeholder="Known product choices, missing selections, allowance concerns, lead-time risk..." /></label>
      </Panel>
      </section>

      <section data-wizard-step="3">
      <Panel className="p-5">
        <SectionHeader icon={ClipboardCheck} title="3. Whole-property checks" body="Tap everything that may need scope, pricing, permit review, a vendor quote, or proof photos." />
        <div className="mt-5 grid gap-5">
          <div><h3 className="mb-3 font-bold">Standard components</h3><CheckGrid name="scopeChecks" items={fieldStandardChecks} /></div>
          <div><h3 className="mb-3 font-bold">Exterior</h3><CheckGrid name="scopeChecks" items={exteriorChecks} /></div>
          <div><h3 className="mb-3 font-bold">Garage</h3><CheckGrid name="scopeChecks" items={garageChecks} /></div>
        </div>
      </Panel>
      </section>

      <section data-wizard-step="4">
      <Panel className="p-5">
        <SectionHeader icon={Ruler} title="4. Room measurements and phase notes" body="Include only the rooms you walked. Measurements help estimate, and phase notes become internal quote-line notes for review." />
        <div className="mt-5 grid gap-4">
          {roomPresets.map((room, index) => (
            <details key={room.key} className="rounded-lg border border-border bg-white p-4" open={index < 2} suppressHydrationWarning>
              <summary className="cursor-pointer text-lg font-bold">{room.label}</summary>
              <label className="mt-4 flex items-center gap-3 rounded-md bg-muted/40 p-3 text-sm font-semibold">
                <input name={`${room.key}.include`} type="checkbox" className="h-5 w-5 accent-primary" />
                Include this room in the quote draft
              </label>
              <RoomMeasurementGrid prefix={room.key} inputClassName={inputClass()} />
              <label className="mt-4 grid gap-1.5 text-sm font-semibold">Room overview<textarea name={`${room.key}.overview`} className={textareaClass()} placeholder="Existing condition, client goal, access, damage, finish expectation..." /></label>
              <div className="mt-4 grid gap-3">
                {room.phases.map((phase) => (
                  <label key={phase} className="grid gap-1.5 text-sm font-semibold">
                    {phase}
                    <textarea name={`${room.key}.${phase}`} className="min-h-16 w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary md:text-sm" placeholder={`Notes for ${phase.toLowerCase()} in ${room.label.toLowerCase()}`} rows={2} />
                  </label>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Panel>
      </section>

      <section data-wizard-step="5">
      <Panel className="p-5">
        <SectionHeader icon={Home} title="5. Add custom rooms" body="Use these when the house does not match the preset list. Pick a basic room type, measure it, then capture phase notes." />
        <div className="mt-5 grid gap-4">
          {extraRoomSlots.map((slot) => (
            <details key={slot} className="rounded-lg border border-border bg-white p-4">
              <summary className="cursor-pointer text-lg font-bold">Additional room {slot}</summary>
              <label className="mt-4 flex items-center gap-3 rounded-md bg-muted/40 p-3 text-sm font-semibold">
                <input name={`customRoom${slot}.include`} type="checkbox" className="h-5 w-5 accent-primary" />
                Include this custom room
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
                  Room type
                  <select name={`customRoom${slot}.type`} className={inputClass()}>
                    <SelectOne />
                    {customRoomTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
                  Room label
                  <input name={`customRoom${slot}.label`} placeholder={`Example: Bedroom ${slot + 2}`} className={inputClass()} />
                </label>
                <div className="lg:col-span-4">
                  <RoomMeasurementGrid prefix={`customRoom${slot}`} inputClassName={inputClass()} />
                </div>
              </div>
              <label className="mt-4 grid gap-1.5 text-sm font-semibold">Room overview<textarea name={`customRoom${slot}.overview`} className={textareaClass()} placeholder="Existing condition, client goal, access, damage, finish expectation..." /></label>
              <div className="mt-4 grid gap-3">
                {["Demo", "Rough Electric", "Rough Plumbing", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"].map((phase) => (
                  <label key={phase} className="grid gap-1.5 text-sm font-semibold">
                    {phase}
                    <textarea name={`customRoom${slot}.${phase}`} className="min-h-16 w-full rounded-md border border-border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary md:text-sm" placeholder={`Notes for ${phase.toLowerCase()}`} rows={2} />
                  </label>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Panel>
      </section>

      <section data-wizard-step="6">
      <Panel className="p-5">
        <SectionHeader icon={Ruler} title="6. Cabinet and counter planning" body="Capture standard cabinet runs on site. This is not a CAD system yet, but it gives estimators enough structure to price and refine quickly." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["cabinet.wallLength", "Available wall length", "linear ft"],
            ["cabinet.baseCabinets", "Base cabinets", "linear ft"],
            ["cabinet.wallCabinets", "Wall cabinets", "linear ft"],
            ["cabinet.tallCabinets", "Tall/pantry cabinets", "each"],
            ["cabinet.islandLength", "Island length", "linear ft"],
            ["cabinet.countertopSqft", "Countertop", "sq ft"],
            ["cabinet.fillersPanels", "Fillers / panels", "each"],
            ["cabinet.applianceOpenings", "Appliance openings", "each"]
          ].map(([name, label, unit]) => (
            <label key={name} className="grid gap-1.5 text-sm font-semibold">
              {label}
              <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border border-border bg-white">
                <input name={name} type="number" min="0" step="0.01" className="h-11 min-w-0 px-3 text-base outline-none" />
                <span className="grid place-items-center bg-muted px-2 text-xs font-bold text-muted-foreground">{unit}</span>
              </div>
            </label>
          ))}
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">Cabinet design notes<textarea name="cabinet.notes" className={textareaClass()} placeholder="Layout constraints, standard sizes, appliance locations, sink wall, island, fillers, panels, crown, pulls..." /></label>
      </Panel>
      </section>

      <section data-wizard-step="7">
      <Panel className="p-5">
        <SectionHeader icon={FileText} title="7. Allowances and final risk notes" body="Capture early allowances with quantity and unit. The quote can later be tightened with vendor pricing, selections, photos, and change-order rules." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowanceItems.map((item) => (
            <div key={item.name} className="grid gap-2 rounded-md border border-border p-3">
              <p className="text-sm font-bold">{item.name}</p>
              <p className="text-xs font-semibold text-muted-foreground">Unit: {item.unit}</p>
              <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">Quantity / basis<input name={`allowanceQty.${item.name}`} placeholder={item.quantityLabel} className={inputClass()} /></label>
              <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">Allowance amount<input name={`allowance.${item.name}`} type="number" min="0" step="1" placeholder="0" className={inputClass()} /></label>
            </div>
          ))}
        </div>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">Risk notes<textarea name="riskNotes" className={textareaClass()} placeholder="Hidden damage, access limitations, permit concern, client decision risk, occupied-home logistics..." /></label>
      </Panel>
      </section>

      <FieldWizardControls formId="field-quote-wizard" totalSteps={7} />
    </form>
  );
}


