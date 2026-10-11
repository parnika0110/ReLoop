/**
 * Directory of Authorized Indian E-Waste Recyclers & Repair Centers.
 * Sourced from Central Pollution Control Board (CPCB) registered Producer Responsibility
 * Organizations (PROs) & authorized recyclers under E-Waste (Management) Rules, 2022.
 *
 * HONESTY CONTRACT:
 * - Every entity is an explicitly documented, real-world entity with verified status.
 * - If reliable hyperlocal street addresses or opening hours are unavailable, they are
 *   labeled 'Verification required' or omitted.
 */
export interface Destination {
  id: string;
  name: string;
  category: "recycle" | "repair" | "refurbish" | "donate" | "resell";
  city: string;
  state: string;
  isVerified: boolean;
  sourceNote: string;
  contactUrl?: string;
  acceptance: string[];
}

export const INDIAN_DESTINATIONS: Destination[] = [
  {
    id: "ecoreco_mumbai",
    name: "Eco Recycling Limited (Ecoreco)",
    category: "recycle",
    city: "Mumbai",
    state: "Maharashtra",
    isVerified: true,
    sourceNote: "CPCB Authorized R2/RIOS Certified Recycler (BSE: 530643)",
    contactUrl: "https://ecoreco.com",
    acceptance: ["Laptops", "Smartphones", "Tablets", "PCBs", "Lithium-ion Batteries"],
  },
  {
    id: "atrantero_noida",
    name: "Attero Recycling",
    category: "recycle",
    city: "Noida / Roorkee",
    state: "Uttar Pradesh / Uttarakhand",
    isVerified: true,
    sourceNote: "CPCB Authorized integrated electronic & lithium-ion battery extraction plant",
    contactUrl: "https://attero.in",
    acceptance: ["Smartphones", "Laptops", "Telecom Hardware", "Lithium Battery Packs"],
  },
  {
    id: "cere_bengaluru",
    name: "Cerebra Green (Cerebra Integrated Tech)",
    category: "refurbish",
    city: "Bengaluru",
    state: "Karnataka",
    isVerified: true,
    sourceNote: "CPCB compliant zero-landfill e-waste and refurbishment facility",
    contactUrl: "https://cerebragreen.com",
    acceptance: ["IT Assets", "Desktops", "Laptops", "Tablets"],
  },
  {
    id: "cashify_pan_india",
    name: "Cashify Buyback & Repair Kiosks",
    category: "resell",
    city: "Pan-India (200+ Cities)",
    state: "Multiple",
    isVerified: true,
    sourceNote: "Commercial secondary trade-in & doorstep pickup platform",
    contactUrl: "https://cashify.in",
    acceptance: ["Working & Damaged Smartphones", "Laptops", "Tablets"],
  },
  {
    id: "goonj_delhi",
    name: "Goonj — Dropping Centers",
    category: "donate",
    city: "Delhi / NCR & Major Metros",
    state: "National Network",
    isVerified: true,
    sourceNote: "Civil society community resource redistribution initiative",
    contactUrl: "https://goonj.org",
    acceptance: ["Functional Tablets & Laptops for educational programs"],
  },
];

export function filterDestinations(category?: string, city?: string): Destination[] {
  return INDIAN_DESTINATIONS.filter((d) => {
    if (category && d.category !== category) return false;
    if (city && !d.city.toLowerCase().includes(city.toLowerCase())) return false;
    return true;
  });
}
