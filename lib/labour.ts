// Fair-work limits from the Basic Conditions of Employment Act 75 of 1997 (BCEA) and the
// National Minimum Wage Act 9 of 2018. They protect young workers from exploitation and
// protect employers from claims for hours that break the law.
//
// BCEA s9: ordinary hours max 45 a week; 9 a day (5-day week) or 8 a day (more than 5 days).
// BCEA s10: overtime only by agreement, max 3 hours a day and 10 hours a week, paid at 1.5x.
// BCEA s14: meal interval of 1 hour after 5 hours of continuous work.
// BCEA s15: daily rest of 12 consecutive hours; weekly rest of 36 consecutive hours.
// BCEA s16: Sunday work at double pay (1.5x if the employee ordinarily works Sundays).
// National minimum wage from 1 March 2026: R30.23 an hour (Government Gazette 54075).

export const BCEA = {
  ordinaryHoursWeek: 45,
  ordinaryHoursDayFiveDayWeek: 9,
  ordinaryHoursDayLongerWeek: 8,
  overtimeHoursDay: 3,
  overtimeHoursWeek: 10,
  maxWorkDaysPerWeek: 6, // 36 consecutive hours of weekly rest means at least one full day off
  overtimeRate: 1.5,
  sundayRate: 2,
  mealBreakAfterHours: 5,
}
export const NATIONAL_MINIMUM_WAGE_HOURLY = 30.23
/** Most ordinary hours a month a placement may be advertised for: 45 h a week × 52 weeks ÷ 12. */
export const MAX_CONTRACTED_HOURS_MONTH = Math.floor((BCEA.ordinaryHoursWeek * 52) / 12)

export type WeekCheck = {
  errors: string[]
  warnings: string[]
  ordinary: number
  overtime: number
  total: number
}

/** days = hours Monday..Sunday. */
export function checkWorkWeek(days: number[]): WeekCheck {
  const errors: string[] = []
  const warnings: string[] = []
  const worked = days.filter((h) => h > 0).length
  const dayCap = worked <= 5 ? BCEA.ordinaryHoursDayFiveDayWeek : BCEA.ordinaryHoursDayLongerWeek
  let dailyOvertime = 0
  days.forEach((h, i) => {
    const over = Math.max(0, h - dayCap)
    if (over > BCEA.overtimeHoursDay) {
      const name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]
      errors.push(
        `${name}: ${h} hours is more than the legal maximum of ${dayCap + BCEA.overtimeHoursDay} (${dayCap} ordinary + ${BCEA.overtimeHoursDay} overtime).`,
      )
    }
    dailyOvertime += over
  })
  const ordinaryDays = days.reduce((sum, h) => sum + Math.min(h, dayCap), 0)
  const ordinary = Math.min(ordinaryDays, BCEA.ordinaryHoursWeek)
  const overtime = dailyOvertime + Math.max(0, ordinaryDays - BCEA.ordinaryHoursWeek)
  const total = days.reduce((a, b) => a + b, 0)
  if (worked > BCEA.maxWorkDaysPerWeek)
    errors.push("Everyone must get at least one full day off a week (36 hours of weekly rest).")
  if (overtime > BCEA.overtimeHoursWeek)
    errors.push(`${overtime} hours of overtime is more than the legal maximum of ${BCEA.overtimeHoursWeek} a week.`)
  if (overtime > 0 && overtime <= BCEA.overtimeHoursWeek)
    warnings.push(`Includes ${overtime} hours of overtime. Overtime needs a written agreement and is paid at 1.5 times the normal rate.`)
  if (days[6] > 0) warnings.push("Sunday work is paid at double the normal rate unless Sunday is a normal working day.")
  if (days.some((h) => h > BCEA.mealBreakAfterHours))
    warnings.push("Days longer than 5 hours must include a meal break of at least 30 minutes to 1 hour.")
  return { errors, warnings, ordinary, overtime, total }
}

export function hourlyRate(monthlyPay: number, hoursPerMonth: number): number {
  return hoursPerMonth > 0 ? monthlyPay / hoursPerMonth : 0
}

/** Error text if a placement's pay or hours break the minimum wage or ordinary-hours limits. */
export function placementLabourProblem(monthlyPay: number, hoursPerMonth: number): string | null {
  if (hoursPerMonth > MAX_CONTRACTED_HOURS_MONTH)
    return `Ordinary hours can't be more than ${MAX_CONTRACTED_HOURS_MONTH} a month (45 a week). Overtime must be agreed separately.`
  const rate = hourlyRate(monthlyPay, hoursPerMonth)
  if (rate < NATIONAL_MINIMUM_WAGE_HOURLY) {
    const needed = Math.ceil(NATIONAL_MINIMUM_WAGE_HOURLY * hoursPerMonth)
    return `R${rate.toFixed(2)} an hour is below the national minimum wage of R${NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)}. For ${hoursPerMonth} hours a month, pay at least R${needed.toLocaleString("en-ZA")}.`
  }
  return null
}
