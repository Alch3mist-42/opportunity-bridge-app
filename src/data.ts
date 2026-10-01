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
  province?: string
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
  province?: string
  photo?: string // small JPEG data URL the business uploaded
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
  province?: string
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
  weekStart?: string
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
  at?: string
}
export type Account = {
  id: string
  email: string
  role: "youth" | "business"
  salt: string
  hash: string
  profileId?: string // youth id or business id, set once setup is complete
  demo?: boolean
  recoveryHash?: string // hash of the one-time recovery code used by "Forgot password"
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
  accounts: Account[]
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
  { id: "DEMO-0011", name: "Mamelodi Tech Hub", sector: "IT support", suburb: "Mamelodi", location: { lat: -25.72, lng: 28.395 }, tier: "CIPC verified", paye: true, compliant: true, province: "Gauteng" },
  { id: "DEMO-0012", name: "Kasi Kitchen Café", sector: "Food", suburb: "Khayelitsha", location: { lat: -34.0405, lng: 18.678 }, tier: "ID verified", paye: true, compliant: true, province: "Western Cape" },
  { id: "DEMO-0013", name: "Woodstock Print Co.", sector: "Print & design", suburb: "Woodstock", location: { lat: -33.9275, lng: 18.447 }, tier: "CIPC verified", paye: true, compliant: true, province: "Western Cape" },
  { id: "DEMO-0014", name: "Bellville Phone Fix", sector: "Electronics", suburb: "Bellville", location: { lat: -33.9, lng: 18.629 }, tier: "ID verified", paye: true, compliant: true, province: "Western Cape" },
  { id: "DEMO-0015", name: "Umlazi Fresh Market", sector: "Fruit & vegetables", suburb: "Umlazi", location: { lat: -29.97, lng: 30.883 }, tier: "ID verified", paye: true, compliant: true, province: "KwaZulu-Natal" },
  { id: "DEMO-0016", name: "Durban Beachfront Tours", sector: "Tourism", suburb: "Durban CBD", location: { lat: -29.8587, lng: 31.0218 }, tier: "CIPC verified", paye: true, compliant: true, province: "KwaZulu-Natal" },
  { id: "DEMO-0017", name: "Gqeberha Auto Care", sector: "Automotive", suburb: "Gqeberha", location: { lat: -33.9608, lng: 25.6022 }, tier: "ID verified", paye: true, compliant: true, province: "Eastern Cape" },
]
const listings: [string, string, number, string[]][] = [
  [
    "Bakery assistant",
    "Help prepare orders, serve customers and keep the bakery running smoothly.",
    5000,
    ["customer service", "baking", "excel"],
  ],
  [
    "Repair assistant",
    "Help diagnose and repair everyday devices.",
    4900,
    ["soldering", "phone repair"],
  ],
  [
    "Design & print assistant",
    "Create layouts and help customers with print jobs.",
    4850,
    ["canva", "graphic design", "customer service"],
  ],
  [
    "Shop assistant",
    "Stock shelves and help neighbours at the counter.",
    4850,
    ["customer service", "stock taking"],
  ],
  [
    "Salon assistant",
    "Welcome clients and help prepare the salon.",
    4900,
    ["customer service", "hair styling"],
  ],
  [
    "Car wash assistant",
    "Care for vehicles and welcome customers.",
    4850,
    ["customer service", "car care"],
  ],
  [
    "Tailoring assistant",
    "Help with alterations, fittings and orders.",
    4950,
    ["sewing", "customer service"],
  ],
  [
    "Internet café assistant",
    "Support customers with printing and computers.",
    4850,
    ["excel", "customer service"],
  ],
  [
    "Market stall assistant",
    "Prepare fresh produce and serve customers.",
    4850,
    ["customer service", "stock taking"],
  ],
  [
    "Solar installation assistant",
    "Learn safe site preparation and support installers.",
    5400,
    ["electrical basics", "customer service"],
  ],
  ["IT support assistant", "Help set up computers and support customers with everyday tech problems.", 5200, ["excel", "customer service"]],
  ["Kitchen assistant", "Prepare food, keep the kitchen clean and serve customers.", 4900, ["customer service", "cooking"]],
  ["Print shop assistant", "Design simple layouts and run print jobs for customers.", 5000, ["canva", "graphic design", "customer service"]],
  ["Repair assistant", "Help diagnose and repair phones and small devices.", 4950, ["phone repair", "soldering"]],
  ["Stock & sales assistant", "Receive stock, keep the stock sheet and serve customers.", 4850, ["stock taking", "excel", "customer service"]],
  ["Tour desk assistant", "Welcome visitors, take bookings and post updates on social media.", 5000, ["customer service", "social media"]],
  ["Workshop assistant", "Support mechanics and keep the workshop running.", 4900, ["car care", "customer service"]],
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
    province: businesses[i].province || "Gauteng",
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
    accounts: structuredClone(demoAccounts),
  }
}
// Fictional demo logins (password Demo1234!). Only salted SHA-256 hashes are stored.
export const DEMO_PASSWORD = "Demo1234!"
export const DEMO_RECOVERY_CODE = "DEMO-RESET-2026"
const demoAccounts: Account[] = [
  { id: "acc-thandi", email: "thandi@demo.ob", role: "youth", salt: "demo-salt-thandi", hash: "7604baf9a9ec553dacd9599f4ce84d9b7153072d9aeb9a2825701cc6e476ca0c", profileId: "thandi", demo: true, recoveryHash: "be46cd215d388dead0a8d0412af2b866770b835f5cf88a90370d24800d95568e" },
  { id: "acc-sipho", email: "sipho@demo.ob", role: "youth", salt: "demo-salt-sipho", hash: "0b248500e674a642cbe31d120e153c1ef99390198a93ac9b215ad1ead804cdc7", profileId: "sipho", demo: true, recoveryHash: "c1ceace4ffe0c8c37ff06e050678f493e2dc90295d00a78479727afde57525e0" },
  { id: "acc-joy", email: "joy@demo.ob", role: "business", salt: "demo-salt-joy", hash: "1bdbf0aed7e92b37abf0272c44999572a5e3754d0ba4ebfa62db97d9f83b2ff2", profileId: "DEMO-0001", demo: true, recoveryHash: "f6816784506801bdace004cebf1042d991b3774dbea408b1af9cdb2fa84f772a" },
  { id: "acc-kasi", email: "kasifix@demo.ob", role: "business", salt: "demo-salt-kasi", hash: "aa1f1df8f37c5a93edc65abcf6e41cb6e2ed5c99a6d978bc8b4138e357b043fa", profileId: "DEMO-0002", demo: true, recoveryHash: "70cc07e1b3eb0d0b6547da23966ace7c50ec25cee83aa45a1107968a327feb36" },
]

const KEY = "opportunity-bridge-demo-v2"
export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Store
      // Older saved demos have no accounts yet: add the demo logins.
      if (!Array.isArray(stored.accounts)) stored.accounts = structuredClone(demoAccounts)
      // Demo logins saved before "Forgot password" existed get their recovery code.
      for (const a of stored.accounts) {
        const seed = demoAccounts.find((d) => d.id === a.id)
        if (seed && !a.recoveryHash && a.hash === seed.hash) a.recoveryHash = seed.recoveryHash
      }
      return stored
    }
  } catch {
    /* use seed */
  }
  return seedStore()
}
export function saveStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

// Session: who is signed in. Validated against the account list on every load.
export type Session =
  | { kind: "account"; accountId: string }
  | { kind: "admin"; until: number }
const SESSION_KEY = "opportunity-bridge-session"
export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as Session | null
  } catch {
    return null
  }
}
export function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
export function audit(actor: string, action: string): Audit {
  return {
    id: crypto.randomUUID(),
    actor,
    action,
    at: new Date().toISOString(),
  }
}
