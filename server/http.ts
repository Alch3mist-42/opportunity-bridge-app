// Small helpers shared by the API functions in /api (Vercel serverless functions).
// Sources live in /server and are bundled into /api by `node server/build.mjs`.

export type Req = {
  method?: string
  query?: Record<string, string | string[] | undefined>
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}
export type Res = {
  status: (code: number) => Res
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
}

// Basic per-instance rate limit: 60 requests a minute per IP.
const hits = new Map<string, number[]>()
export function rateLimited(req: Req, limit = 60): boolean {
  const ip = String(req.headers["x-forwarded-for"] || "local").split(",")[0].trim()
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > limit
}

export function send(res: Res, code: number, body: unknown, cacheSeconds = 0) {
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Cache-Control", cacheSeconds ? `public, s-maxage=${cacheSeconds}` : "no-store")
  res.status(code).json(body)
}

export function guard(req: Req, res: Res, methods: string[]): boolean {
  if (!methods.includes(req.method || "GET")) {
    res.setHeader("Allow", methods.join(", "))
    send(res, 405, { error: "Method not allowed" })
    return false
  }
  if (rateLimited(req)) {
    send(res, 429, { error: "Too many requests. Try again in a minute." })
    return false
  }
  return true
}

export function bodyOf(req: Req): Record<string, unknown> {
  const b = typeof req.body === "string" ? safeJson(req.body) : req.body
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {}
}
function safeJson(s: string): unknown {
  try {
    return s.length > 10_000 ? {} : JSON.parse(s)
  } catch {
    return {}
  }
}

export const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null
export const str = (v: unknown, max = 100): string | null =>
  typeof v === "string" && v.length <= max ? v : null
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ""
