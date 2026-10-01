// Client for our serverless API (/api on Vercel). Every call has a short timeout and returns null
// when the server can't be reached (for example when running locally without the API), so the
// app keeps working with the same rules running in the browser.
export async function api<T>(path: string, body?: unknown, timeoutMs = 4000): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.headers.get("content-type")?.includes("json")) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export type WeekVerdict = { allowed: boolean; errors: string[]; checkedBy: "server" }
export type PlacementVerdict = { allowed: boolean; problem: string | null; checkedBy: "server" }
export type ETIVerdict = { amount: number; eligible: boolean; realCost: number; calculatedBy: "server" }
export type ServerSelfCheck = { passed: number; total: number; ranOn: "server"; time: string }
