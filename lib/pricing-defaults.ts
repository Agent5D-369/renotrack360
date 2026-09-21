// Planning recommendations authorized by the owner, not surveyed contractor quotes.
export const replacementRateDefaults = {
  version: "austin-replacement-2026-09-21-v1", effectiveDate: "2026-09-21", reviewDate: "2026-12-21",
  ownerFieldRate: "55.00", projectManagementRate: "95.00",
  sources: [
    "https://www.onetonline.org/link/localwages/47-2031.00?st=TX",
    "https://www.onetonline.org/link/localwages/11-9021.00?st=TX",
    "https://www.bls.gov/news.release/ecec.htm",
  ],
} as const;
