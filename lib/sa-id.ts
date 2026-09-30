export function ageOn(dateOfBirth: string, on: Date): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number)
  return (
    on.getFullYear() -
    year -
    (on.getMonth() + 1 < month ||
    (on.getMonth() + 1 === month && on.getDate() < day)
      ? 1
      : 0)
  )
}

/** Returns only the birth date. Never persist the input ID. */
export function birthDateFromSAID(id: string, now = new Date()): string | null {
  if (!/^\d{13}$/.test(id)) return null
  let sum = 0
  let double = false
  for (let i = id.length - 1; i >= 0; i--) {
    let digit = Number(id[i])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  if (sum % 10 !== 0) return null
  const yy = Number(id.slice(0, 2))
  const year = (yy > now.getFullYear() % 100 ? 1900 : 2000) + yy
  const month = Number(id.slice(2, 4))
  const day = Number(id.slice(4, 6))
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > now
  )
    return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
