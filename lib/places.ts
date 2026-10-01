// Places, provinces and search. Built-in places work offline; any other place in
// South Africa is found through OpenStreetMap's free Nominatim search (no key, no card).
import type { Point } from "./travel"
import { SUBURBS } from "./suburbs"

export const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
] as const
export type Province = (typeof PROVINCES)[number]

export type Place = Point & { name: string; province: Province; detail?: string }

// Built-in places: every Johannesburg suburb in lib/suburbs.ts plus main towns in each province.
const TOWNS: Place[] = [
  { name: "Johannesburg CBD", lat: -26.2041, lng: 28.0473, province: "Gauteng" },
  { name: "Pretoria", lat: -25.7479, lng: 28.2293, province: "Gauteng" },
  { name: "Mamelodi", lat: -25.72, lng: 28.395, province: "Gauteng" },
  { name: "Soshanguve", lat: -25.5236, lng: 28.1047, province: "Gauteng" },
  { name: "Tembisa", lat: -25.9964, lng: 28.2268, province: "Gauteng" },
  { name: "Midrand", lat: -25.9992, lng: 28.1263, province: "Gauteng" },
  { name: "Ekurhuleni (Germiston)", lat: -26.2173, lng: 28.1671, province: "Gauteng" },
  { name: "Vereeniging", lat: -26.6731, lng: 27.9261, province: "Gauteng" },
  { name: "Cape Town CBD", lat: -33.9249, lng: 18.4241, province: "Western Cape" },
  { name: "Khayelitsha", lat: -34.0405, lng: 18.678, province: "Western Cape" },
  { name: "Mitchells Plain", lat: -34.0488, lng: 18.6186, province: "Western Cape" },
  { name: "Woodstock", lat: -33.9275, lng: 18.447, province: "Western Cape" },
  { name: "Bellville", lat: -33.9, lng: 18.629, province: "Western Cape" },
  { name: "Gugulethu", lat: -33.9786, lng: 18.5711, province: "Western Cape" },
  { name: "Stellenbosch", lat: -33.9321, lng: 18.8602, province: "Western Cape" },
  { name: "George", lat: -33.963, lng: 22.4617, province: "Western Cape" },
  { name: "Durban CBD", lat: -29.8587, lng: 31.0218, province: "KwaZulu-Natal" },
  { name: "Umlazi", lat: -29.97, lng: 30.883, province: "KwaZulu-Natal" },
  { name: "Pinetown", lat: -29.8167, lng: 30.85, province: "KwaZulu-Natal" },
  { name: "Pietermaritzburg", lat: -29.6006, lng: 30.3794, province: "KwaZulu-Natal" },
  { name: "Richards Bay", lat: -28.783, lng: 32.0377, province: "KwaZulu-Natal" },
  { name: "Gqeberha (Port Elizabeth)", lat: -33.9608, lng: 25.6022, province: "Eastern Cape" },
  { name: "East London", lat: -33.0153, lng: 27.9116, province: "Eastern Cape" },
  { name: "Mthatha", lat: -31.5889, lng: 28.7844, province: "Eastern Cape" },
  { name: "Bloemfontein", lat: -29.0852, lng: 26.1596, province: "Free State" },
  { name: "Welkom", lat: -27.9774, lng: 26.7351, province: "Free State" },
  { name: "Polokwane", lat: -23.9045, lng: 29.4689, province: "Limpopo" },
  { name: "Thohoyandou", lat: -22.9456, lng: 30.4849, province: "Limpopo" },
  { name: "Mbombela (Nelspruit)", lat: -25.4753, lng: 30.9694, province: "Mpumalanga" },
  { name: "eMalahleni (Witbank)", lat: -25.8713, lng: 29.2333, province: "Mpumalanga" },
  { name: "Mahikeng", lat: -25.8652, lng: 25.6442, province: "North West" },
  { name: "Rustenburg", lat: -25.6676, lng: 27.2421, province: "North West" },
  { name: "Kimberley", lat: -28.7282, lng: 24.7499, province: "Northern Cape" },
  { name: "Upington", lat: -28.4478, lng: 21.2561, province: "Northern Cape" },
]
export const PLACES: Place[] = [
  ...SUBURBS.map((s) => ({ ...s, province: "Gauteng" as Province })),
  ...TOWNS,
]

/** Rough centre of each province, used for the map when a province is chosen. */
export const PROVINCE_CENTRES: Record<Province, Point> = {
  Gauteng: { lat: -26.1, lng: 28.1 },
  "Western Cape": { lat: -33.95, lng: 18.6 },
  "KwaZulu-Natal": { lat: -29.85, lng: 30.95 },
  "Eastern Cape": { lat: -33.2, lng: 26.5 },
  "Free State": { lat: -28.8, lng: 26.5 },
  Limpopo: { lat: -23.9, lng: 29.5 },
  Mpumalanga: { lat: -25.6, lng: 30.0 },
  "North West": { lat: -25.8, lng: 26.5 },
  "Northern Cape": { lat: -28.7, lng: 24.7 },
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** Built-in places matching what was typed, tolerant of small typos ("Braamfontei", "rosebnk"). */
export function matchPlaces(query: string, limit = 8): Place[] {
  const q = norm(query)
  if (!q) return PLACES.slice(0, limit)
  const scored = PLACES.map((p) => {
    const n = norm(p.name)
    if (n.includes(q)) return { p, score: n.startsWith(q) ? 0 : 1 }
    const words = n.split(" ")
    const prefixDist = Math.min(...words.map((w) => editDistance(w.slice(0, q.length), q)), editDistance(n.slice(0, q.length), q))
    const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0
    return { p, score: prefixDist <= allowed ? 2 + prefixDist : 99 }
  })
  return scored.filter((x) => x.score < 99).sort((a, b) => a.score - b.score).map((x) => x.p).slice(0, limit)
}

export function toProvince(state: string | undefined): Province | null {
  if (!state) return null
  const s = norm(state)
  const found = PROVINCES.find((p) => norm(p) === s || s.includes(norm(p)))
  if (found) return found
  if (s.includes("natal")) return "KwaZulu-Natal"
  return null
}

/** Nearest built-in place's province, used when online lookup isn't available. */
export function nearestProvince(point: Point): Province {
  let best = PLACES[0]
  let bestD = Infinity
  for (const p of PLACES) {
    const d = (p.lat - point.lat) ** 2 + (p.lng - point.lng) ** 2
    if (d < bestD) { bestD = d; best = p }
  }
  return best.province
}

const NOMINATIM = "https://nominatim.openstreetmap.org"

/** Any real place in South Africa, via OpenStreetMap. Returns [] if offline or blocked. */
// In the browser we ask our own server first (/api/places), which calls OpenStreetMap with a
// proper identifying header and caches results. If the server isn't there, we call OSM directly.
const SERVER_UA = "OpportunityBridge/1.0 (Wits Social Good Hackathon 2026)"
type Opts = { direct?: boolean }
const inBrowser = typeof window !== "undefined"

export async function searchPlacesOnline(query: string, signal?: AbortSignal, opts: Opts = {}): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  if (inBrowser && !opts.direct) {
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal })
      if (res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = (await res.json()) as { places?: Place[] }
        if (Array.isArray(data.places)) return data.places
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return []
    }
  }
  try {
    const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=za&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { signal, headers: inBrowser ? { "Accept-Language": "en" } : { "Accept-Language": "en", "User-Agent": SERVER_UA } })
    if (!res.ok) return []
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; name?: string; address?: Record<string, string> }>
    return rows.map((r) => {
      const point = { lat: Math.round(Number(r.lat) * 1000) / 1000, lng: Math.round(Number(r.lon) * 1000) / 1000 }
      const a = r.address || {}
      const name = r.name || a.suburb || a.town || a.city || r.display_name.split(",")[0]
      const place = a.city || a.town || a.municipality || ""
      return {
        ...point,
        name,
        province: toProvince(a.state) || nearestProvince(point),
        detail: [place && place !== name ? place : "", a.state].filter(Boolean).join(", "),
      }
    })
  } catch {
    return []
  }
}

/** Name and province for a point (e.g. from "Use my location"). Falls back to the nearest built-in place. */
export async function describePoint(point: Point, opts: Opts = {}): Promise<{ name: string; province: Province }> {
  if (inBrowser && !opts.direct) {
    try {
      const res = await fetch(`/api/places?lat=${point.lat}&lng=${point.lng}`)
      if (res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = (await res.json()) as { name?: string; province?: Province }
        if (data.name && data.province) return { name: data.name, province: data.province }
      }
    } catch { /* fall back */ }
  }
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=${point.lat}&lon=${point.lng}`, {
      headers: inBrowser ? { "Accept-Language": "en" } : { "Accept-Language": "en", "User-Agent": SERVER_UA },
    })
    if (res.ok) {
      const r = (await res.json()) as { address?: Record<string, string> }
      const a = r.address || {}
      const province = toProvince(a.state)
      const name = a.suburb || a.neighbourhood || a.town || a.city || a.village
      if (province && name) return { name, province }
    }
  } catch { /* fall back */ }
  let best = PLACES[0]
  let bestD = Infinity
  for (const p of PLACES) {
    const d = (p.lat - point.lat) ** 2 + (p.lng - point.lng) ** 2
    if (d < bestD) { bestD = d; best = p }
  }
  return { name: `Near ${best.name}`, province: best.province }
}

// Remember the province of places chosen in the picker, so saving a profile stores the right one.
const chosen = new Map<string, Province>()
const keyOf = (p: Point) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
export function rememberProvince(point: Point, province: Province) {
  chosen.set(keyOf(point), province)
}
/** Province for a saved thing: its stored province, else what the picker found, else the nearest built-in place. */
export function provinceOf(thing: { location: Point; province?: string }): Province {
  const stored = PROVINCES.find((p) => p === thing.province)
  return stored || chosen.get(keyOf(thing.location)) || nearestProvince(thing.location)
}
