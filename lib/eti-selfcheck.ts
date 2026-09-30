import { calculateETI, type ETIInput } from "./eti"
import { birthDateFromSAID } from "./sa-id"
import { estimateTravel, TRAVEL_AFFORDABILITY_THRESHOLD } from "./travel"

// Automated checks of the tax and travel rules. They run in the Admin
// page every time it loads, so anyone can see the rules still hold.
const base: ETIInput = {
  dateOfBirth: "2004-03-15", claimMonth: "2026-10", monthlyPay: 4000, paidHours: 160,
  monthsAlreadyClaimed: 0, isConnectedPerson: false, isDomesticWorker: false,
  employerPayeRegistered: true, employerTaxCompliant: true,
}

const ETI_CASES: { name: string; input: Partial<ETIInput>; expected: number }[] = [
  { name: "R4,000 full-time, first year", input: {}, expected: 1500 },
  { name: "R6,500 tapers down", input: { monthlyPay: 6500 }, expected: 750 },
  { name: "R4,000 in month 13 halves", input: { monthsAlreadyClaimed: 12 }, expected: 750 },
  { name: "R2,000 for 80 hours (pro-rated)", input: { monthlyPay: 2000, paidHours: 80 }, expected: 750 },
  { name: "R2,000 full-time is 60%", input: { monthlyPay: 2000 }, expected: 1200 },
  { name: "R7,500 or more gets nothing", input: { monthlyPay: 7500 }, expected: 0 },
  { name: "Turns 30 this month: not eligible", input: { dateOfBirth: "1996-10-10" }, expected: 0 },
  { name: "Turns 18 this month: eligible", input: { dateOfBirth: "2008-10-31" }, expected: 1500 },
  { name: "Scheme ends February 2029", input: { claimMonth: "2029-03" }, expected: 0 },
]

export type Check = { name: string; detail: string; pass: boolean }

export function runSelfCheck(): { checks: Check[]; allPass: boolean } {
  const checks: Check[] = ETI_CASES.map((c) => {
    const actual = calculateETI({ ...base, ...c.input }).amount
    return { name: c.name, detail: `expected R${c.expected}, got R${actual}`, pass: actual === c.expected }
  })
  checks.push(
    { name: "Valid SA ID keeps date of birth only", detail: "0403155000082 → 2004-03-15", pass: birthDateFromSAID("0403155000082") === "2004-03-15" },
    { name: "Wrong ID checksum is rejected", detail: "0403155000083 → rejected", pass: birthDateFromSAID("0403155000083") === null },
  )
  const far = estimateTravel({ lat: -26.189, lng: 28.05 }, { lat: -25.9992, lng: 28.1263 }, "taxi", 4000)
  checks.push({
    name: `Travel over ${Math.round(TRAVEL_AFFORDABILITY_THRESHOLD * 100)}% of stipend is flagged`,
    detail: `Hillbrow → Midrand by taxi: ${Math.round(far.share * 100)}% of R4,000`,
    pass: far.unaffordable,
  })
  return { checks, allPass: checks.every((c) => c.pass) }
}
