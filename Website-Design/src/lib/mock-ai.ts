import type { ScanResult, ComparableListing, DiagnosticsData } from "@/context/ScanContext";

const EWASTE_FACTS = [
  "Americans throw away 9.4 million tons of electronics every year.",
  "Only 17.4% of e-waste produced globally is properly recycled.",
  "One metric ton of circuit boards contains 40–800 times more gold than one metric ton of ore.",
  "E-waste is the fastest growing waste stream in the world.",
  "A single smartphone contains over 60 different elements from the periodic table.",
  "Recycling 1 million laptops saves energy equivalent to electricity used by 3,500 US homes in a year.",
];

export const getRandomFact = () => EWASTE_FACTS[Math.floor(Math.random() * EWASTE_FACTS.length)];

const MOCK_COMPARABLES: ComparableListing[] = [
  { title: "Apple iPhone 12 64GB Black Unlocked - Good Condition", soldPrice: 115, condition: "Used - Good", soldDate: "Mar 28, 2026", variant: "64GB · Black", imageUrl: "", ebayUrl: "https://www.ebay.com" },
  { title: "iPhone 12 64GB Blue - Used, Works Perfectly", soldPrice: 98, condition: "Used - Acceptable", soldDate: "Mar 25, 2026", variant: "64GB · Blue", imageUrl: "", ebayUrl: "https://www.ebay.com" },
  { title: "Apple iPhone 12 64GB White Unlocked Smartphone", soldPrice: 108, condition: "Used - Very Good", soldDate: "Mar 22, 2026", variant: "64GB · White", imageUrl: "", ebayUrl: "https://www.ebay.com" },
  { title: "iPhone 12 Black 64GB Fully Functional No Cracks", soldPrice: 120, condition: "Used - Like New", soldDate: "Mar 20, 2026", variant: "64GB · Black", imageUrl: "", ebayUrl: "https://www.ebay.com" },
];

export function simulateAIDiagnostics(): DiagnosticsData {
  return {
    productName: "iPhone 12",
    brand: "Apple",
    modelNumber: "A2172",
    yearOfPurchase: 2021,
    powersOn: null,
    screenCondition: "",
    aiConfidence: {
      productName: true,
      brand: true,
      modelNumber: true,
      yearOfPurchase: true,
      powersOn: false,
      screenCondition: false,
    },
  };
}

export function simulateAIAnalysis(diag: DiagnosticsData): ScanResult {
  const value = 102;
  return {
    id: crypto.randomUUID(),
    deviceName: `${diag.productName} · 64GB · Black`,
    brand: diag.brand,
    modelNumber: diag.modelNumber,
    year: diag.yearOfPurchase,
    condition: "Good",
    conditionNotes: "Minor scuffs on back panel. Screen shows no visible damage. Charging port intact and functional. All buttons responsive.",
    estimatedValue: value,
    valueLow: 85,
    valueHigh: 120,
    comparables: MOCK_COMPARABLES,
    recommendation: "sell",
    recommendationReason: "Device is in Good condition and holds strong resale value on eBay. Similar listings sell consistently in the $85–$120 range.",
    scannedAt: new Date(),
    decision: "sell",
    adjustedPrice: value,
  };
}

export function generateListing(result: ScanResult): string {
  return `${result.deviceName}

TITLE: ${result.brand} ${result.deviceName} - ${result.condition} Condition - Tested & Working

CONDITION: ${result.condition}

DESCRIPTION:
${result.brand} ${result.deviceName} in ${result.condition} condition. ${result.conditionNotes}

Device has been tested and is fully functional. What you see is what you get. Ships within 1–2 business days with tracking.

TAGS: ${result.brand}, ${result.deviceName.split(" · ")[0]}, smartphone, electronics, used phone, unlocked

SUGGESTED PRICE: $${result.adjustedPrice} USD

SHIPPING: USPS Priority Mail · Free Shipping · Buyer Protection Included`;
}

export function getCO2ByDevice(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("laptop")) return 8.5;
  if (lower.includes("tablet") || lower.includes("ipad")) return 4.2;
  if (lower.includes("watch")) return 1.1;
  return 3.2;
}
