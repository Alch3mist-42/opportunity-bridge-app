import { calculateETI } from "../lib/eti"
import { hourlyRate, placementLabourProblem } from "../lib/labour"
import { bodyOf, guard, num, send, str, type Req, type Res } from "./http"

// POST /api/eti – the server works out the Employment Tax Incentive for one placement month.
// Body: { dateOfBirth: "YYYY-MM-DD", claimMonth: "YYYY-MM", monthlyPay, paidHours, monthsAlreadyClaimed,
//         employerPayeRegistered?, employerTaxCompliant? }
export default function handler(req: Req, res: Res) {
  if (!guard(req, res, ["POST"])) return
  const b = bodyOf(req)
  const dateOfBirth = str(b.dateOfBirth, 10)
  const claimMonth = str(b.claimMonth, 7)
  const monthlyPay = num(b.monthlyPay, 0, 1_000_000)
  const paidHours = num(b.paidHours, 0, 744)
  const monthsAlreadyClaimed = num(b.monthsAlreadyClaimed ?? 0, 0, 120)
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !claimMonth || monthlyPay === null || paidHours === null || monthsAlreadyClaimed === null)
    return send(res, 400, { error: "Send dateOfBirth (YYYY-MM-DD), claimMonth (YYYY-MM), monthlyPay, paidHours and monthsAlreadyClaimed." })
  const result = calculateETI({
    dateOfBirth,
    claimMonth,
    monthlyPay,
    paidHours,
    monthsAlreadyClaimed,
    isConnectedPerson: b.isConnectedPerson === true,
    isDomesticWorker: b.isDomesticWorker === true,
    employerPayeRegistered: b.employerPayeRegistered !== false,
    employerTaxCompliant: b.employerTaxCompliant !== false,
  })
  send(res, 200, {
    ...result,
    hourlyRate: paidHours ? Math.round(hourlyRate(monthlyPay, paidHours) * 100) / 100 : null,
    minimumWageProblem: paidHours ? placementLabourProblem(monthlyPay, paidHours) : null,
    realCost: Math.max(0, monthlyPay - result.amount),
    calculatedBy: "server",
  })
}
