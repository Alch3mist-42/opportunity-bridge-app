import { estimateTravel, type Point, type TravelMode } from "./travel"

export function rankMatch(
  youth: { location: Point; skills: string[]; transport: TravelMode },
  placement: { location: Point; skills: string[]; stipend: number },
  aiSimilarity?: number,
) {
  const matches = placement.skills.filter((skill) =>
    youth.skills.some((s) => s.toLowerCase() === skill.toLowerCase()),
  )
  const overlap = placement.skills.length
    ? matches.length / placement.skills.length
    : 0
  const skillScore =
    aiSimilarity !== undefined &&
    Number.isFinite(aiSimilarity) &&
    aiSimilarity >= 0 &&
    aiSimilarity <= 1
      ? 0.5 * overlap + 0.5 * aiSimilarity
      : overlap
  const travel = estimateTravel(
    youth.location,
    placement.location,
    youth.transport,
    placement.stipend,
  )
  const travelScore =
    Math.max(0, 1 - travel.share / 0.5) * (travel.outOfRange ? 0.3 : 1)
  const score = 0.7 * skillScore + 0.3 * travelScore
  const mode =
    youth.transport === "taxi"
      ? "taxi"
      : youth.transport === "train"
        ? "train (bus fare proxy)"
        : youth.transport
  const why = `You have ${matches.length} of ${placement.skills.length} skills${
    matches.length ? ` (${matches.join(", ")})` : ""
  }. About ${travel.minutes} min by ${mode}, est. R${travel.monthlyCost.toLocaleString("en-ZA")}/month travel.`
  return { score, percent: Math.round(score * 100), matches, why, travel }
}
