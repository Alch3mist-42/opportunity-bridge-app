import { BCEA, NATIONAL_MINIMUM_WAGE_HOURLY } from "../lib/labour"
import { guard, send, type Req, type Res } from "./http"

// GET /api/health – is the server up, and which rule set is it running?
export default function handler(req: Req, res: Res) {
  if (!guard(req, res, ["GET"])) return
  send(res, 200, {
    ok: true,
    service: "Opportunity Bridge API",
    time: new Date().toISOString(),
    rules: {
      eti: "SARS ETI amounts effective 1 April 2025",
      labour: `BCEA: ${BCEA.ordinaryHoursWeek} ordinary hours a week, overtime max ${BCEA.overtimeHoursDay}/day and ${BCEA.overtimeHoursWeek}/week`,
      minimumWage: `R${NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)} an hour`,
    },
    endpoints: ["/api/health", "/api/eti", "/api/week", "/api/placement", "/api/places", "/api/selfcheck"],
  })
}
