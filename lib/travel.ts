export type Point = { lat: number; lng: number }
export type TravelMode = "walk" | "taxi" | "bus" | "train"
export const TRAVEL_AFFORDABILITY_THRESHOLD = 0.3
export const WORK_DAYS = 21
export const ROAD_FACTOR = 1.3
export const MODES = {
  walk: { speed: 5, baseFare: 0, perKm: 0, maxKm: 4, label: "Walk" },
  taxi: {
    speed: 25,
    baseFare: 10,
    perKm: 1.2,
    maxKm: 40,
    label: "Minibus taxi",
  },
  bus: { speed: 20, baseFare: 8, perKm: 0.9, maxKm: 40, label: "Bus" },
  // No train fare model is provided. Bus proxy is explicitly identified to the user.
  train: {
    speed: 20,
    baseFare: 8,
    perKm: 0.9,
    maxKm: 40,
    label: "Train (bus fare proxy)",
  },
} as const

export function haversine(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const lat = (b.lat - a.lat) * rad
  const lng = (b.lng - a.lng) * rad
  const x =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function estimateTravel(
  from: Point,
  to: Point,
  mode: TravelMode,
  stipend: number,
) {
  const directKm = haversine(from, to)
  const roadKm = directKm * ROAD_FACTOR
  const config = MODES[mode]
  const minutes = Math.round((roadKm / config.speed) * 60)
  const monthlyCost = Math.round(
    (config.baseFare + config.perKm * roadKm) * 2 * WORK_DAYS,
  )
  const share = stipend > 0 ? monthlyCost / stipend : Infinity
  return {
    directKm,
    roadKm,
    minutes,
    monthlyCost,
    share,
    unaffordable: share > TRAVEL_AFFORDABILITY_THRESHOLD,
    outOfRange: roadKm > config.maxKm,
  }
}
