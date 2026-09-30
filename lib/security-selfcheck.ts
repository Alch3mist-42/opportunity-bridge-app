// Tests the real access, credential and anti-cheating functions the screens use.
import type { Check } from "./eti-selfcheck"
import { canAccess } from "./access"
import { ADMIN_CODE_HASH, hashPassword, isAdminCode } from "./auth"
import { canApply, canDecideApplication, canEditWeek, canSignOffWeek, mondayOf, validateWeek } from "./rules"

export async function runSecurityCheck(): Promise<Check[]> {
  const store = {
    placements: [{ id: "p1", businessId: "B1" }],
    applications: [{ id: "a1", youthId: "Y1", placementId: "p1", status: "Accepted" }],
    blocked: [] as string[],
  }
  const youth = { role: "youth" as const, youthId: "Y1" }
  const owner = { role: "business" as const, businessId: "B1" }
  const other = { role: "business" as const, businessId: "B2" }
  const week = { applicationId: "a1", status: "Submitted", weekStart: mondayOf(new Date()) }
  const day = (h: number) => [h, 8, 8, 8, 8, 0, 0]
  const nextMonday = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return mondayOf(d) })()
  const hash1 = await hashPassword("Demo1234!", "salt-a")
  const hash2 = await hashPassword("Demo1234!", "salt-a")

  const c = (name: string, pass: boolean, detail: string): Check => ({ name, pass, detail })
  return [
    c("Youth can't open business pages", canAccess("youth", "/business/eti") === false, "youth → #/business/eti is refused"),
    c("Business can't open admin pages", canAccess("business", "/admin") === false, "business → #/admin is refused"),
    c("Signed-out users can't open youth pages", canAccess(null, "/matches") === false, "no session → #/matches is refused"),
    c("Youth can open their own pages", canAccess("youth", "/matches") === true, "youth → #/matches is allowed"),
    c("Passwords are stored hashed", hash1 !== "Demo1234!" && hash1 === hash2 && hash1.length === 64, "SHA-256 with a per-user salt"),
    c("Admin code is stored only as a hash", ADMIN_CODE_HASH.length === 64 && !(await isAdminCode("admin")) , "wrong code is refused"),
    c("Youth can't sign off their own week", canSignOffWeek(youth, week, store) !== null, "refused"),
    c("Only the placement's business can sign off", canSignOffWeek(other, week, store) !== null && canSignOffWeek(owner, week, store) === null, "other business refused, owner allowed"),
    c("Signed-off weeks are locked", canEditWeek({ ...week, status: "Signed off" }) === false, "no edits after sign-off"),
    c("Impossible hours are rejected", validateWeek({ days: day(13), work: "x", weekStart: week.weekStart }, []) !== null, "13 hours in a day is refused"),
    c("Future weeks are rejected", validateWeek({ days: day(8), work: "x", weekStart: nextMonday }, []) !== null, `week of ${nextMonday} is refused`),
    c("Only the owner decides on applicants", canDecideApplication(other, { ...store.applications[0], status: "Applied" }, store) !== null, "another business is refused"),
    c("No duplicate applications", canApply(youth, "p1", { ...store, applications: [{ id: "a2", youthId: "Y1", placementId: "p1", status: "Applied" }] }) !== null, "second application is refused"),
  ]
}

// Fair-work checks (BCEA and National Minimum Wage Act), using the same functions as the screens.
import { checkWorkWeek, placementLabourProblem } from "./labour"
export function runFairWorkCheck(): Check[] {
  const c = (name: string, pass: boolean, detail: string): Check => ({ name, pass, detail })
  const normal = checkWorkWeek([8, 8, 8, 8, 8, 0, 0])
  const longDay = checkWorkWeek([13, 8, 8, 8, 8, 0, 0])
  const sevenDays = checkWorkWeek([6, 6, 6, 6, 6, 6, 6])
  const tooMuchOvertime = checkWorkWeek([12, 12, 12, 12, 9, 0, 0])
  const someOvertime = checkWorkWeek([10, 10, 9, 9, 9, 0, 0])
  return [
    c("A normal 5 × 8 hour week is allowed", normal.errors.length === 0 && normal.overtime === 0, "40 ordinary hours, no overtime"),
    c("More than 3 hours overtime in a day is refused", longDay.errors.length > 0, "13 hours on Monday (max 9 + 3)"),
    c("A 7-day week is refused", sevenDays.errors.length > 0, "36 hours of weekly rest means one full day off"),
    c("More than 10 hours overtime a week is refused", tooMuchOvertime.errors.length > 0, `${tooMuchOvertime.overtime} hours of overtime`),
    c("Legal overtime is flagged for agreement and 1.5× pay", someOvertime.errors.length === 0 && someOvertime.overtime === 2 && someOvertime.warnings.length > 0, "2 hours of overtime"),
    c("Pay below the minimum wage is refused", placementLabourProblem(4000, 160) !== null, "R4,000 for 160 hours = R25.00/h"),
    c("Lawful pay is allowed", placementLabourProblem(5000, 160) === null, "R5,000 for 160 hours = R31.25/h"),
    c("More than 45 ordinary hours a week is refused", placementLabourProblem(9000, 200) !== null, "200 hours a month"),
  ]
}
