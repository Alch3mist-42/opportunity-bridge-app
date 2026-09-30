// Anti-cheating and validation rules. The screens call these same functions,
// and the Admin self-check tests them, so what is tested is what users get.
import type { Role } from "./access"
import { checkWorkWeek, placementLabourProblem, MAX_CONTRACTED_HOURS_MONTH } from "./labour"

export type Actor = { role: Role; youthId?: string; businessId?: string }
type PlacementLike = { id: string; businessId: string }
type ApplicationLike = { id: string; youthId: string; placementId: string; status: string }
type WeekLike = { applicationId: string; status: string; weekStart?: string }
type StoreLike = { placements: PlacementLike[]; applications: ApplicationLike[]; blocked: string[] }

export const LIMITS = {
  maxHoursPerDay: 12, // 9 ordinary + 3 overtime (BCEA s9, s10)
  maxHoursPerWeek: 55, // 45 ordinary + 10 overtime (BCEA s9, s10)
  maxOpenApplications: 10,
  workNotesMax: 1000,
  nameMax: 80,
  bioMax: 2000,
  titleMax: 80,
  descriptionMax: 1000,
  stipendMin: 1000,
  stipendMax: 20000,
  hoursMin: 1,
  hoursMax: MAX_CONTRACTED_HOURS_MONTH,
  youthMinAge: 18,
  youthMaxAge: 35,
  reportsPerHour: 5,
}

/** Monday of the week containing `date`, as YYYY-MM-DD (local time). */
export function mondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const ownsPlacement = (actor: Actor, placementId: string, store: StoreLike) =>
  actor.role === "business" && !!actor.businessId &&
  store.placements.some((p) => p.id === placementId && p.businessId === actor.businessId)

export function canApply(actor: Actor, placementId: string, store: StoreLike): string | null {
  if (actor.role !== "youth" || !actor.youthId) return "Only young people can apply."
  const placement = store.placements.find((p) => p.id === placementId)
  if (!placement) return "This placement no longer exists."
  if (store.blocked.includes(placementId) || store.blocked.includes(placement.businessId)) return "You blocked this placement."
  if (store.applications.some((a) => a.youthId === actor.youthId && a.placementId === placementId)) return "You've already applied here."
  const open = store.applications.filter((a) => a.youthId === actor.youthId && (a.status === "Applied" || a.status === "Shortlisted"))
  if (open.length >= LIMITS.maxOpenApplications)
    return `You have ${open.length} open applications. Wait for replies or withdraw one before applying again.`
  return null
}

export function canDecideApplication(
  actor: Actor,
  application: ApplicationLike,
  store: StoreLike,
  decision?: string,
): string | null {
  if (!ownsPlacement(actor, application.placementId, store)) return "Only the business that posted this placement can decide."
  if (application.status === "Accepted" || application.status === "Declined") return "This decision has already been made."
  if (
    decision === "Accepted" &&
    store.applications.some((a) => a.youthId === application.youthId && a.status === "Accepted" && a.id !== application.id)
  )
    return "This person already has an active placement. One placement at a time keeps hours legal and the tax incentive honest."
  return null
}

export function canLogWeek(actor: Actor, application: ApplicationLike): string | null {
  if (actor.role !== "youth" || actor.youthId !== application.youthId) return "Only the young person on this placement can log their week."
  if (application.status !== "Accepted") return "You can log weeks once a business accepts you."
  return null
}

export function validateWeek(
  input: { days: number[]; work: string; weekStart: string },
  existingForApplication: WeekLike[],
  now = new Date(),
): string | null {
  if (input.days.length !== 7) return "Enter hours for each day."
  if (input.days.some((h) => !Number.isFinite(h) || h < 0 || h > 24)) return "Enter hours between 0 and 24 for each day."
  const total = input.days.reduce((a, b) => a + b, 0)
  if (total <= 0) return "Add the hours you worked."
  const labour = checkWorkWeek(input.days)
  if (labour.errors.length) return labour.errors[0]
  if (!input.work.trim()) return "Describe the work you did."
  if (input.work.length > LIMITS.workNotesMax) return `Keep the description under ${LIMITS.workNotesMax} characters.`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)) return "Choose the week."
  if (input.weekStart !== mondayOf(new Date(input.weekStart + "T12:00:00"))) return "Weeks start on a Monday."
  if (input.weekStart > mondayOf(now)) return "You can't log a week that hasn't started."
  if (existingForApplication.some((w) => w.weekStart === input.weekStart && w.status !== "Queried"))
    return "You've already logged this week."
  return null
}

export function canSignOffWeek(actor: Actor, week: WeekLike, store: StoreLike): string | null {
  const app = store.applications.find((a) => a.id === week.applicationId)
  if (!app) return "This placement no longer exists."
  if (actor.role === "youth") return "You can't sign off your own week."
  if (!ownsPlacement(actor, app.placementId, store)) return "Only the business running this placement can sign off."
  if (week.status !== "Submitted") return "Only submitted weeks can be signed off or queried."
  return null
}

export function canEditWeek(week: WeekLike): boolean {
  return week.status !== "Signed off"
}

export function canVerify(actor: Actor | null): boolean {
  return actor?.role === "admin"
}

export function validatePlacement(p: { title: string; description: string; stipend: number; hours: number; duration: number }): string | null {
  if (!p.title.trim() || p.title.length > LIMITS.titleMax) return `Give the placement a title (up to ${LIMITS.titleMax} characters).`
  if (p.description.length > LIMITS.descriptionMax) return `Keep the description under ${LIMITS.descriptionMax} characters.`
  if (!Number.isFinite(p.stipend) || p.stipend < LIMITS.stipendMin || p.stipend > LIMITS.stipendMax)
    return `The stipend must be between R${LIMITS.stipendMin.toLocaleString("en-ZA")} and R${LIMITS.stipendMax.toLocaleString("en-ZA")} a month.`
  if (!Number.isFinite(p.hours) || p.hours < LIMITS.hoursMin || p.hours > LIMITS.hoursMax)
    return `Hours must be between ${LIMITS.hoursMin} and ${LIMITS.hoursMax} a month (at most 45 ordinary hours a week).`
  const labour = placementLabourProblem(p.stipend, p.hours)
  if (labour) return labour
  if (!Number.isInteger(p.duration) || p.duration < 1 || p.duration > 24) return "Duration must be 1 to 24 months."
  return null
}

export function youthAgeProblem(age: number): string | null {
  return age < LIMITS.youthMinAge || age > LIMITS.youthMaxAge
    ? `Opportunity Bridge is for people aged ${LIMITS.youthMinAge} to ${LIMITS.youthMaxAge}.`
    : null
}

export function reportAllowed(previousReportTimes: string[], now = Date.now()): boolean {
  return previousReportTimes.filter((t) => now - Date.parse(t) < 3600_000).length < LIMITS.reportsPerHour
}
