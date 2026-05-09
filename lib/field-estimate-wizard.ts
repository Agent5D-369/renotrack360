import { renovationPhases } from "@/lib/constants";

export const materialResponsibilityItems = [
  "Appliances",
  "Backsplash tile",
  "Bathroom accessories",
  "Bathroom accessory kit",
  "Cabinet hardware",
  "Cabinets",
  "Carpet",
  "Countertops",
  "Door hardware",
  "Doors",
  "Drywall materials",
  "Exterior fixtures",
  "Faucets",
  "Flooring",
  "Garbage disposal",
  "Grab bars / safety accessories",
  "Lighting fixtures",
  "Mirrors",
  "Paint",
  "Permit fees",
  "Plumbing fixtures",
  "Range hood",
  "Shower glass / enclosure",
  "Shower trim kit",
  "Sinks",
  "Tile",
  "Toilet",
  "Tub",
  "Vanities",
  "Vanity tops",
  "Waste disposal",
  "Windows",
  "Outlets / switches"
] as const;

export const fieldStandardChecks = [
  { key: "permits", label: "Permit review needed", category: "Permits" },
  { key: "pest", label: "Pest control concern", category: "Exterior" },
  { key: "mold", label: "Mold or moisture concern", category: "Drywall" },
  { key: "hvac", label: "HVAC replacement or repair", category: "Exterior" },
  { key: "panel", label: "Electrical panel review", category: "Electrical" },
  { key: "fixtures", label: "New light fixtures throughout", category: "Electrical" },
  { key: "devices", label: "Replace outlets and switches", category: "Electrical" },
  { key: "baseboards", label: "New baseboards throughout", category: "Trim" },
  { key: "windowTrim", label: "New window trim throughout", category: "Trim" },
  { key: "crownMolding", label: "Crown molding throughout", category: "Trim" },
  { key: "interiorPaint", label: "Interior prep, prime, paint", category: "Painting" },
  { key: "flooring", label: "New flooring throughout", category: "Flooring" },
  { key: "plumbing", label: "Water supply / drains need evaluation", category: "Plumbing" },
  { key: "sanitary", label: "Sanitary fixtures operational check", category: "Plumbing" }
] as const;

export const exteriorChecks = [
  { key: "roof", label: "Roof replacement or repair", category: "Roofing" },
  { key: "foundation", label: "Foundation repair review", category: "Masonry" },
  { key: "windows", label: "Replace exterior windows", category: "Windows" },
  { key: "doors", label: "Replace exterior doors", category: "Doors" },
  { key: "extLights", label: "Exterior light fixtures", category: "Electrical" },
  { key: "soffit", label: "Soffit, fascia, or wood rot repair", category: "Exterior" },
  { key: "stuccoSiding", label: "Stucco or siding scope", category: "Exterior" },
  { key: "exteriorPaint", label: "Exterior prep, prime, paint", category: "Painting" },
  { key: "landscape", label: "Landscape / curb appeal scope", category: "Landscaping" }
] as const;

export const garageChecks = [
  { key: "garageDrywall", label: "Garage drywall repair", category: "Drywall" },
  { key: "garageTexture", label: "Garage texture", category: "Drywall" },
  { key: "garagePaint", label: "Garage ceiling / wall / floor paint", category: "Painting" },
  { key: "garageDevices", label: "Garage outlets and switches", category: "Electrical" },
  { key: "garageDoor", label: "Garage door / exterior door", category: "Doors" },
  { key: "garageStorage", label: "Garage cabinets or storage", category: "Cabinets" },
  { key: "garageWindows", label: "Garage windows", category: "Windows" }
] as const;

export const roomPresets = [
  { key: "kitchen", label: "Kitchen", phases: ["Demo", "Rough Framing", "Rough Electric", "Rough Plumbing", "Rough HVAC", "Sec. Framing / Insulation", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "outdoorKitchen", label: "Outdoor kitchen", phases: ["Site Prep", "Exterior", "Rough Framing", "Rough Electric", "Rough Plumbing", "Rough HVAC", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "masterBath", label: "Primary bathroom", phases: ["Demo", "Rough Electric", "Rough Plumbing", "Sec. Framing / Insulation", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "bath1", label: "Bathroom 1", phases: ["Demo", "Rough Electric", "Rough Plumbing", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "bath2", label: "Bathroom 2", phases: ["Demo", "Rough Electric", "Rough Plumbing", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "bath3", label: "Bathroom 3", phases: ["Demo", "Rough Electric", "Rough Plumbing", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"] },
  { key: "hall", label: "Hall / common area", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "primaryBedroom", label: "Primary bedroom", phases: ["Demo", "Rough Electric", "Sec. Framing / Insulation", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "bedroom1", label: "Bedroom 1", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "bedroom2", label: "Bedroom 2 / office", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "bedroom3", label: "Bedroom 3", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "bedroom4", label: "Bedroom 4", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "bedroom5", label: "Bedroom 5", phases: ["Demo", "Rough Electric", "Wall Covering", "Paint", "Flooring", "Trim"] },
  { key: "flexArea", label: "Flex area", phases: renovationPhases }
] as const;

export const allowanceItems = [
  { name: "Dumpsters / waste disposal", unit: "each", quantityLabel: "dumpsters", category: "Demolition" },
  { name: "Roofing", unit: "sq ft / square", quantityLabel: "roof area or squares", category: "Roofing" },
  { name: "HVAC", unit: "system / zone", quantityLabel: "systems or zones", category: "Exterior" },
  { name: "Electrical work", unit: "fixture / opening / panel", quantityLabel: "openings or allowance units", category: "Electrical" },
  { name: "Plumbing work", unit: "fixture", quantityLabel: "fixtures", category: "Plumbing" },
  { name: "Landscaping", unit: "allowance area", quantityLabel: "areas", category: "Landscaping" },
  { name: "Exterior paint", unit: "sq ft", quantityLabel: "paintable exterior sq ft", category: "Painting" },
  { name: "Interior paint", unit: "room / sq ft", quantityLabel: "rooms or wall sq ft", category: "Painting" },
  { name: "Interior doors", unit: "each", quantityLabel: "doors", category: "Doors" },
  { name: "Exterior doors", unit: "each", quantityLabel: "doors", category: "Doors" },
  { name: "Hard surface flooring", unit: "sq ft", quantityLabel: "sq ft", category: "Flooring" },
  { name: "Carpet", unit: "sq ft", quantityLabel: "sq ft", category: "Flooring" },
  { name: "Tile", unit: "sq ft", quantityLabel: "sq ft", category: "Tile" },
  { name: "Baseboards", unit: "linear ft", quantityLabel: "linear ft", category: "Trim" },
  { name: "Kitchen cabinets", unit: "linear ft / cabinet count", quantityLabel: "linear ft or cabinet count", category: "Cabinets" },
  { name: "Kitchen countertop / sink", unit: "sq ft / each", quantityLabel: "counter sq ft plus sink count", category: "Countertops" },
  { name: "Kitchen appliances", unit: "each / package", quantityLabel: "appliances or package", category: "Appliances" },
  { name: "Bathroom vanity", unit: "each / width", quantityLabel: "vanities", category: "Cabinets" },
  { name: "Bathroom accessories", unit: "kit / each", quantityLabel: "kits or accessories", category: "Trim" },
  { name: "Shower glass", unit: "opening", quantityLabel: "openings", category: "Tile" }
] as const;

export function categoryForPhase(phaseName: string) {
  if (phaseName.includes("Demo")) return "Demolition";
  if (phaseName.includes("Electric")) return "Electrical";
  if (phaseName.includes("Plumbing")) return "Plumbing";
  if (phaseName.includes("HVAC")) return "Exterior";
  if (phaseName.includes("Framing")) return "Framing";
  if (phaseName.includes("Insulation")) return "Insulation";
  if (phaseName.includes("Wall")) return "Drywall";
  if (phaseName.includes("Paint")) return "Painting";
  if (phaseName.includes("Flooring")) return "Flooring";
  if (phaseName.includes("Cabinets")) return "Cabinets";
  if (phaseName.includes("Trim")) return "Trim";
  if (phaseName.includes("Exterior")) return "Exterior";
  return "Demolition";
}
