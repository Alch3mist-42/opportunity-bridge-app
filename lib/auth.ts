// Prototype credentials. Everything runs in the browser, so these rules stop casual misuse
// and tampering, and the same rules move to a server in production.

export const ADMIN_CODE_HASH = "14e5d2360b9af7b600f4d001c2ff9da21ad85a393548bbbefa6a07b0d9276631"
export const MAX_ATTEMPTS = 5
export const LOCK_MS = 5 * 60 * 1000
export const ADMIN_SESSION_MS = 30 * 60 * 1000

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function newSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${salt}:${password}`)
}

export async function isAdminCode(code: string): Promise<boolean> {
  return (await sha256(code.trim())) === ADMIN_CODE_HASH
}

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters."
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number."
  if (password.length > 128) return "Use at most 128 characters."
  return null
}

export function emailProblem(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 120 ? null : "Enter a valid email address."
}

// Lockout after repeated failures, kept per form (e.g. "signin", "admin").
const lockKey = (form: string) => `opportunity-bridge-lock-${form}`
type LockState = { failures: number[]; lockedUntil?: number }
function readLock(form: string): LockState {
  try { return JSON.parse(localStorage.getItem(lockKey(form)) || "") as LockState } catch { return { failures: [] } }
}
function writeLock(form: string, s: LockState) {
  try { localStorage.setItem(lockKey(form), JSON.stringify(s)) } catch { /* ignore */ }
}
/** Milliseconds left on a lock, or 0 if the form is usable. */
export function lockRemaining(form: string, now = Date.now()): number {
  const s = readLock(form)
  return s.lockedUntil && s.lockedUntil > now ? s.lockedUntil - now : 0
}
export function recordFailure(form: string, now = Date.now()): number {
  const s = readLock(form)
  const recent = (s.failures || []).filter((t) => now - t < LOCK_MS)
  recent.push(now)
  const next: LockState = { failures: recent }
  if (recent.length >= MAX_ATTEMPTS) { next.lockedUntil = now + LOCK_MS; next.failures = [] }
  writeLock(form, next)
  return next.lockedUntil ? LOCK_MS : 0
}
export function clearFailures(form: string) { writeLock(form, { failures: [] }) }
