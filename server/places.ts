import { describePoint, matchPlaces, searchPlacesOnline } from "../lib/places"
import { guard, num, one, send, type Req, type Res } from "./http"

// GET /api/places?q=rosebank        – search any place in South Africa (typo-tolerant + OpenStreetMap)
// GET /api/places?lat=-26.1&lng=28  – name and province for a point ("Near me")
export default async function handler(req: Req, res: Res) {
  if (!guard(req, res, ["GET"])) return
  const q = one(req.query?.q).trim().slice(0, 80)
  const lat = num(Number(one(req.query?.lat)), -35, -22)
  const lng = num(Number(one(req.query?.lng)), 16, 33)
  if (q) {
    const local = matchPlaces(q, 6)
    const online = q.length >= 3 ? await searchPlacesOnline(q, undefined, { direct: true }) : []
    const seen = new Set<string>()
    const places = [...local, ...online].filter((p) => {
      const key = `${p.name.toLowerCase()}|${p.province}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 8)
    return send(res, 200, { places, source: online.length ? "local+openstreetmap" : "local" }, 86_400)
  }
  if (lat !== null && lng !== null) {
    const found = await describePoint({ lat, lng }, { direct: true })
    return send(res, 200, found, 86_400)
  }
  send(res, 400, { error: "Send q (a place name) or lat and lng inside South Africa." })
}
