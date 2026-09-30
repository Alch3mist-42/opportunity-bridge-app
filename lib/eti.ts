import { ageOn } from "./sa-id"

// National minimum wage from 1 March 2026 (see lib/labour.ts).
export const MIN_WAGE_HOURLY: number | null = 30.23
export type ETIInput = {
  dateOfBirth: string
  claimMonth: string
  monthlyPay: number
  paidHours: number
  monthsAlreadyClaimed: number
  isConnectedPerson: boolean
  isDomesticWorker: boolean
  employerPayeRegistered: boolean
  employerTaxCompliant: boolean
}
export type ETIResult = {
  amount: number
  reasons: string[]
  eligible: boolean
}

export function calculateETI(input: ETIInput): ETIResult {
  const reasons: string[] = []
  const [year, month] = input.claimMonth.split("-").map(Number)
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(input.claimMonth)
  if (!validMonth) reasons.push("Enter a valid claim month.")
  const [birthYear, birthMonth, birthDay] = input.dateOfBirth
    .split("-")
    .map(Number)
  const birth = new Date(birthYear, birthMonth - 1, birthDay)
  const validBirth =
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(input.dateOfBirth) &&
    birth.getFullYear() === birthYear &&
    birth.getMonth() === birthMonth - 1 &&
    birth.getDate() === birthDay
  if (!validBirth) reasons.push("Enter a valid date of birth.")
  const age =
    validMonth && validBirth
      ? ageOn(input.dateOfBirth, new Date(year, month, 0))
      : -1
  if (validMonth && validBirth && (age < 18 || age > 29))
    reasons.push("Age must be 18 to 29 on the last day of the claim month.")
  if (input.monthsAlreadyClaimed >= 24)
    reasons.push("The 24 claim months have been used.")
  if (input.isConnectedPerson)
    reasons.push("Connected people, such as family members, are not eligible.")
  if (input.isDomesticWorker) reasons.push("Domestic workers are not eligible.")
  if (!input.employerPayeRegistered)
    reasons.push("The employer must be registered for PAYE.")
  if (!input.employerTaxCompliant)
    reasons.push("The employer must be tax compliant.")
  if (input.paidHours <= 0 || !Number.isFinite(input.paidHours))
    reasons.push("Paid hours must be greater than zero.")
  if (validMonth && input.claimMonth > "2029-02")
    reasons.push("The scheme ends on 28 February 2029.")
  if (input.monthlyPay < 0 || !Number.isFinite(input.monthlyPay))
    reasons.push("Pay must be a valid positive amount.")
  if (
    input.monthsAlreadyClaimed < 0 ||
    !Number.isInteger(input.monthsAlreadyClaimed)
  )
    reasons.push("Claim months must be a whole number of zero or more.")
  const bandPay =
    input.paidHours > 0
      ? input.monthlyPay * (input.paidHours < 160 ? 160 / input.paidHours : 1)
      : 0
  if (bandPay >= 7500) reasons.push("Adjusted monthly pay is R7,500 or more.")
  if (reasons.length) return { amount: 0, reasons, eligible: false }
  const first = input.monthsAlreadyClaimed < 12
  let base =
    bandPay < 2500
      ? bandPay * (first ? 0.6 : 0.3)
      : bandPay < 5500
        ? first
          ? 1500
          : 750
        : first
          ? 1500 - 0.75 * (bandPay - 5500)
          : 750 - 0.375 * (bandPay - 5500)
  base *= Math.min(input.paidHours / 160, 1)
  return {
    amount: Math.round(Math.max(0, base) * 100) / 100,
    reasons: [],
    eligible: true,
  }
}

export function claimMonthsSince(
  startDate: string,
  claimMonth: string,
): number {
  const [year, month] = claimMonth.split("-").map(Number)
  const [startYear, startMonth] = startDate.split("-").map(Number)
  return Math.max(0, (year - startYear) * 12 + month - startMonth)
}

export function summarizeETI(rows: { pay: number; eti: number }[]) {
  const gross = rows.reduce((total, row) => total + row.pay, 0)
  const total = rows.reduce((sum, row) => sum + row.eti, 0)
  return { gross, total, realCost: gross - total }
}
