import type { Point, TravelMode } from "../lib/travel"

export type Youth = {
  id: string
  name: string
  dob: string
  suburb: string
  location: Point
  transport: TravelMode
  skills: string[]
  grade: number
  bio: string
  consent: { processing?: string; matching?: string; sharing?: string }
}
export type Business = {
  id: string
  name: string
  sector: string
  suburb: string
  location: Point
  tier: "Verification pending" | "CIPC verified" | "ID verified"
  paye: boolean
  compliant: boolean
}
export type Placement = {
  id: string
  businessId: string
  title: string
  description: string
  stipend: number
  hours: number
  duration: number
  startDate: string
  location: Point
  skills: string[]
}
export type Application = {
  id: string
  youthId: string
  placementId: string
  status: "Applied" | "Shortlisted" | "Accepted" | "Declined"
  date: string
}
export type Week = {
  id: string
  applicationId: string
  days: number[]
  work: string
  skills: string[]
  status: "Submitted" | "Signed off" | "Queried"
  submittedAt: string
  signedAt?: string
  supervisor?: string
  query?: string
}
export type Report = {
  id: string
  target: string
  by: string
  reason: string
  status: "Open" | "Resolved"
}
export type Audit = { id: string; actor: string; action: string; at: string }
export type Store = {
  youth: Youth[]
  businesses: Business[]
  placements: Placement[]
  applications: Application[]
  weeks: Week[]
  reports: Report[]
  blocked: string[]
  audit: Audit[]
  dataSaver: boolean
  aiEnabled: boolean
  savedPlacements?: Record<string, string[]>
}

const youth: Youth[] = [
  {
    id: "thandi",
    name: "Thandi Mokoena",
    dob: "2004-03-15",
    suburb: "Hillbrow",
    location: { lat: -26.189, lng: 28.05 },
    transport: "taxi",
    skills: ["customer service", "excel", "baking"],
    grade: 12,
    bio: "I love working with people, learning new things and making a good loaf of bread.",
    consent: {
      processing: "2026-09-01T09:00:00Z",
      matching: "2026-09-01T09:00:00Z",
    },
  },
  {
    id: "sipho",
    name: "Sipho Ndlovu",
    dob: "2002-07-02",
    suburb: "Orlando East",
    location: { lat: -26.238, lng: 27.91 },
    transport: "taxi",
    skills: ["soldering", "phone repair"],
    grade: 11,
    bio: "I repair phones and enjoy solving technical problems.",
    consent: {
      processing: "2026-09-01T09:00:00Z",
      matching: "2026-09-01T09:00:00Z",
    },
  },
  {
    id: "lerato",
    name: "Lerato Khumalo",
    dob: "2005-11-20",
    suburb: "Alexandra",
    location: { lat: -26.103, lng: 28.097 },
    transport: "bus",
    skills: ["graphic design", "canva", "social media"],
    grade: 12,
    bio: "I make posters and social posts for local events.",
    consent: {
      processing: "2026-09-01T09:00:00Z",
      matching: "2026-09-01T09:00:00Z",
    },
  },
]
const businesses: Business[] = [
  {
    id: "DEMO-0001",
    name: "Mama Joy's Bakery",
    sector: "Food & baking",
    suburb: "Braamfontein",
    location: { lat: -26.1929, lng: 28.0305 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0002",
    name: "Kasi Fix Electronics",
    sector: "Electronics",
    suburb: "Soweto",
    location: { lat: -26.2485, lng: 27.854 },
    tier: "CIPC verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0003",
    name: "Ubuntu Books & Print",
    sector: "Print & design",
    suburb: "Rosebank",
    location: { lat: -26.1467, lng: 28.0436 },
    tier: "CIPC verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0004",
    name: "Corner Basket Spaza",
    sector: "Retail",
    suburb: "Diepkloof",
    location: { lat: -26.2497, lng: 27.9529 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0005",
    name: "Lush Locs Salon",
    sector: "Beauty",
    suburb: "Melville",
    location: { lat: -26.1764, lng: 28.0082 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0006",
    name: "Sparkle Street Car Wash",
    sector: "Automotive",
    suburb: "Yeoville",
    location: { lat: -26.1822, lng: 28.0637 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0007",
    name: "Needle & Thread Studio",
    sector: "Tailoring",
    suburb: "Fordsburg",
    location: { lat: -26.2044, lng: 28.0152 },
    tier: "CIPC verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0008",
    name: "Connect Corner Café",
    sector: "Internet café",
    suburb: "Newtown",
    location: { lat: -26.2015, lng: 28.0318 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0009",
    name: "Fresh Start Produce",
    sector: "Fruit & vegetables",
    suburb: "Alexandra",
    location: { lat: -26.1034, lng: 28.0967 },
    tier: "ID verified",
    paye: true,
    compliant: true,
  },
  {
    id: "DEMO-0010",
    name: "Sunwise Solar Works",
    sector: "Solar installation",
    suburb: "Randburg",
    location: { lat: -26.0941, lng: 27.9823 },
    tier: "CIPC verified",
    paye: true,
    compliant: true,
  },
]
const listings: [string, string, number, string[]][] = [
  [
    "Bakery assistant",
    "Help prepare orders, serve customers and keep the bakery running smoothly.",
    4500,
    ["customer service", "baking", "excel"],
  ],
  [
    "Repair assistant",
    "Help diagnose and repair everyday devices.",
    4200,
    ["soldering", "phone repair"],
  ],
  [
    "Design & print assistant",
    "Create layouts and help customers with print jobs.",
    4000,
    ["canva", "graphic design", "customer service"],
  ],
  [
    "Shop assistant",
    "Stock shelves and help neighbours at the counter.",
    3800,
    ["customer service", "stock taking"],
  ],
  [
    "Salon assistant",
    "Welcome clients and help prepare the salon.",
    4100,
    ["customer service", "hair styling"],
  ],
  [
    "Car wash assistant",
    "Care for vehicles and welcome customers.",
    3900,
    ["customer service", "car care"],
  ],
  [
    "Tailoring assistant",
    "Help with alterations, fittings and orders.",
    4300,
    ["sewing", "customer service"],
  ],
  [
    "Internet café assistant",
    "Support customers with printing and computers.",
    4000,
    ["excel", "customer service"],
  ],
  [
    "Market stall assistant",
    "Prepare fresh produce and serve customers.",
    3700,
    ["customer service", "stock taking"],
  ],
  [
    "Solar installation assistant",
    "Learn safe site preparation and support installers.",
    5200,
    ["electrical basics", "customer service"],
  ],
]
const placements: Placement[] = listings.map(
  ([title, description, stipend, skills], i) => ({
    id: `placement-${i + 1}`,
    businessId: businesses[i].id,
    title,
    description,
    stipend,
    skills,
    hours: 160,
    duration: 3,
    startDate: "2026-10-01",
    location: businesses[i].location,
  }),
)

export function seedStore(): Store {
  return {
    youth: structuredClone(youth),
    businesses: structuredClone(businesses),
    placements: structuredClone(placements),
    applications: [],
    weeks: [],
    reports: [],
    blocked: [],
    audit: [],
    dataSaver: false,
    aiEnabled: false,
    savedPlacements: {},
  }
}
const KEY = "opportunity-bridge-demo-v1"
export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    /* use seed */
  }
  return seedStore()
}
export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}
export function audit(actor: string, action: string): Audit {
  return {
    id: crypto.randomUUID(),
    actor,
    action,
    at: new Date().toISOString(),
  }
}
