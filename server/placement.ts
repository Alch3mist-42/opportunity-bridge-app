import { hourlyRate, placementLabourProblem, NATIONAL_MINIMUM_WAGE_HOURLY } from "../lib/labour"
import { bodyOf, guard, num, send, type Req, type Res } from "./http"

// POST /api/placement – checks a placement's pay and hours against the minimum wage and BCEA.
// Body: { stipend: number (monthly rand), hours: number (per month) }
export default function handler(req: Req, res: Res) {
  if (!guard(req, res, ["POST"])) return
  const b = bodyOf(req)
  const stipend = num(b.stipend, 0, 1_000_000)
  const hours = num(b.hours, 1, 744)
  if (stipend === null || hours === null) return send(res, 400, { error: "Send stipend and hours as numbers." })
  const problem = placementLabourProblem(stipend, hours)
  send(res, 200, {
    allowed: !problem,
    problem,
    hourlyRate: Math.round(hourlyRate(stipend, hours) * 100) / 100,
    minimumWage: NATIONAL_MINIMUM_WAGE_HOURLY,
    checkedBy: "server",
  })
}
