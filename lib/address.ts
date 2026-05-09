/** Country / state / province data for international address forms */

export type CountryCode = string;

export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "OTHER", name: "Other" }
] as const;

export const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["AS", "American Samoa"], ["GU", "Guam"], ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"]
] as const;

export const CA_PROVINCES = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
  ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"],
  ["YT", "Yukon"]
] as const;

export const AU_STATES = [
  ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"],
  ["NT", "Northern Territory"], ["QLD", "Queensland"],
  ["SA", "South Australia"], ["TAS", "Tasmania"],
  ["VIC", "Victoria"], ["WA", "Western Australia"]
] as const;

export const MX_STATES = [
  ["AGU", "Aguascalientes"], ["BCN", "Baja California"], ["BCS", "Baja California Sur"],
  ["CAM", "Campeche"], ["CHP", "Chiapas"], ["CHH", "Chihuahua"],
  ["CMX", "Ciudad de México"], ["COA", "Coahuila"], ["COL", "Colima"],
  ["DUR", "Durango"], ["GUA", "Guanajuato"], ["GRO", "Guerrero"],
  ["HID", "Hidalgo"], ["JAL", "Jalisco"], ["MEX", "México"],
  ["MIC", "Michoacán"], ["MOR", "Morelos"], ["NAY", "Nayarit"],
  ["NLE", "Nuevo León"], ["OAX", "Oaxaca"], ["PUE", "Puebla"],
  ["QUE", "Querétaro"], ["ROO", "Quintana Roo"], ["SLP", "San Luis Potosí"],
  ["SIN", "Sinaloa"], ["SON", "Sonora"], ["TAB", "Tabasco"],
  ["TAM", "Tamaulipas"], ["TLA", "Tlaxcala"], ["VER", "Veracruz"],
  ["YUC", "Yucatán"], ["ZAC", "Zacatecas"]
] as const;

export type StateOption = { code: string; name: string };

/** Returns state/province options for countries that have a select, or null for free-text */
export function getStateOptions(country: string): StateOption[] | null {
  switch (country) {
    case "US": return US_STATES.map(([code, name]) => ({ code, name }));
    case "CA": return CA_PROVINCES.map(([code, name]) => ({ code, name }));
    case "AU": return AU_STATES.map(([code, name]) => ({ code, name }));
    case "MX": return MX_STATES.map(([code, name]) => ({ code, name }));
    default: return null;
  }
}

export function stateLabel(country: string): string {
  switch (country) {
    case "US": return "State";
    case "CA": return "Province / Territory";
    case "AU": return "State / Territory";
    case "MX": return "State";
    case "GB": return "County / Region";
    case "DE": return "State (Bundesland)";
    case "BR": return "State";
    case "IN": return "State / UT";
    default: return "State / Province / Region";
  }
}

export function zipLabel(country: string): string {
  switch (country) {
    case "US": return "ZIP code";
    case "CA": return "Postal code";
    case "GB": return "Postcode";
    case "AU": case "NZ": return "Postcode";
    case "DE": case "FR": case "ES": case "IT": return "Postal code";
    case "BR": return "CEP";
    case "IN": return "PIN code";
    case "JP": return "〒 Postal code";
    default: return "Postal / ZIP code";
  }
}
