// Single source of truth for who may open which page.
export type Role = "youth" | "business" | "admin"

const PUBLIC = ["/", "/signin", "/signup/youth", "/signup/business", "/admin-access", "/privacy"]
const YOUTH = ["/matches", "/applications", "/week", "/profile", "/record", "/opportunities", "/setup/youth"]

export function isPublic(path: string): boolean {
  return PUBLIC.includes(path) || path.startsWith("/shared/")
}

export function canAccess(role: Role | null, path: string): boolean {
  if (isPublic(path)) return true
  if (!role) return false
  if (role === "youth") return YOUTH.includes(path)
  if (role === "business") return path === "/business" || path.startsWith("/business/") || path === "/setup/business"
  if (role === "admin") return path === "/admin" || path.startsWith("/admin/")
  return false
}

export function homeFor(role: Role | null): string {
  return role === "youth" ? "/matches" : role === "business" ? "/business" : role === "admin" ? "/admin" : "/"
}

export function ownerLabel(path: string): string {
  if (path.startsWith("/business")) return "businesses"
  if (path.startsWith("/admin")) return "admins"
  return "young people looking for experience"
}
