import { checkWorkWeek } from "../lib/labour"
import { bodyOf, guard, send, type Req, type Res } from "./http"

// POST /api/week – checks a week of hours against the Basic Conditions of Employment Act.
// Body: { days: [mon, tue, wed, thu, fri, sat, sun] } (hours per day)
export default function handler(req: Req, res: Res) {
  if (!guard(req, res, ["POST"])) return
  const days = bodyOf(req).days
  if (!Array.isArray(days) || days.length !== 7 || !days.every((d) => typeof d === "number" && Number.isFinite(d) && d >= 0 && d <= 24))
    return send(res, 400, { error: "Send days: seven numbers from 0 to 24 (Monday to Sunday)." })
  const check = checkWorkWeek(days as number[])
  send(res, 200, { ...check, allowed: check.errors.length === 0, checkedBy: "server" })
}
