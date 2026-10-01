// Real photos for the demo businesses (free Unsplash licence). A business that signs up can
// upload its own shop photo; otherwise we pick one that fits its sector.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=240&h=240&q=70`

const BY_ID: Record<string, string> = {
  "DEMO-0001": u("1509440159596-0249088772ff"), // bakery
  "DEMO-0002": u("1550041473-d296a3a8a18a"), // electronics repair
  "DEMO-0003": u("1532012197267-da84d127e765"), // books & print
  "DEMO-0004": u("1641440616173-7241e6fe6be9"), // spaza / corner shop
  "DEMO-0005": u("1634449571010-02389ed0f9b0"), // salon
  "DEMO-0006": u("1633014041037-f5446fb4ce99"), // car wash
  "DEMO-0007": u("1578353022142-09264fd64295"), // tailoring
  "DEMO-0008": u("1495474472287-4d71bcdd2085"), // café
  "DEMO-0009": u("1611693424421-3db00de93a89"), // fresh produce
  "DEMO-0010": u("1668097613572-40b7c11c8727"), // solar
  "DEMO-0011": u("1719159381981-1327b22aff9b"), // tech hub
  "DEMO-0012": u("1542372147193-a7aca54189cd"), // kitchen café
  "DEMO-0013": u("1503694978374-8a2fa686963a"), // print shop
  "DEMO-0014": u("1611396000732-f8c9a933424f"), // phone repair
  "DEMO-0015": u("1589483233144-795633bf597c"), // market
  "DEMO-0016": u("1682065936841-6bb7f68207b7"), // beachfront tours
  "DEMO-0017": u("1615906655593-ad0386982a0f"), // auto care
}

const BY_SECTOR: [RegExp, string][] = [
  [/bak|bread|cake/i, BY_ID["DEMO-0001"]],
  [/phone|electr|repair|cell/i, BY_ID["DEMO-0014"]],
  [/print|design|book/i, BY_ID["DEMO-0013"]],
  [/spaza|retail|shop|store|tuck/i, BY_ID["DEMO-0004"]],
  [/hair|salon|beauty|nail|barber/i, BY_ID["DEMO-0005"]],
  [/car|auto|mechanic|motor|tyre/i, BY_ID["DEMO-0017"]],
  [/sew|tailor|cloth|fashion/i, BY_ID["DEMO-0007"]],
  [/caf|coffee|food|kitchen|restaurant|catering/i, BY_ID["DEMO-0012"]],
  [/fruit|veg|produce|market|farm/i, BY_ID["DEMO-0009"]],
  [/solar|energy|electric/i, BY_ID["DEMO-0010"]],
  [/it\b|tech|computer|software|internet/i, BY_ID["DEMO-0011"]],
  [/tour|travel|tourism/i, BY_ID["DEMO-0016"]],
]

export function businessPhoto(b: { id: string; sector: string; photo?: string }): string | null {
  if (b.photo) return b.photo
  if (BY_ID[b.id]) return BY_ID[b.id]
  return BY_SECTOR.find(([re]) => re.test(b.sector))?.[1] ?? null
}

/** Shrinks an uploaded photo to a small square JPEG so it fits in storage. */
export function shrinkPhoto(file: File, size = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."))
    if (file.size > 8 * 1024 * 1024) return reject(new Error("Please choose a photo under 8 MB."))
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = size
      const side = Math.min(img.width, img.height)
      canvas
        .getContext("2d")!
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.75))
    }
    img.onerror = () => reject(new Error("That image couldn't be opened."))
    img.src = url
  })
}
