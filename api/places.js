// Built from /server by server/build.mjs. Edit the files in /server, not this one.

// lib/suburbs.ts
var SUBURBS = [
  { name: "Hillbrow", lat: -26.1887, lng: 28.0497 },
  { name: "Braamfontein", lat: -26.1929, lng: 28.0305 },
  { name: "Orlando East", lat: -26.2375, lng: 27.9101 },
  { name: "Alexandra", lat: -26.1034, lng: 28.0967 },
  { name: "Soweto", lat: -26.2485, lng: 27.854 },
  { name: "Rosebank", lat: -26.1467, lng: 28.0436 },
  { name: "Melville", lat: -26.1764, lng: 28.0082 },
  { name: "Newtown", lat: -26.2015, lng: 28.0318 },
  { name: "Yeoville", lat: -26.1822, lng: 28.0637 },
  { name: "Berea", lat: -26.1804, lng: 28.0528 },
  { name: "Parktown", lat: -26.1673, lng: 28.0292 },
  { name: "Auckland Park", lat: -26.1811, lng: 28.0016 },
  { name: "Fordsburg", lat: -26.2044, lng: 28.0152 },
  { name: "Mayfair", lat: -26.2025, lng: 28.0055 },
  { name: "Cyrildene", lat: -26.1794, lng: 28.0986 },
  { name: "Kensington", lat: -26.1932, lng: 28.0929 },
  { name: "Norwood", lat: -26.1587, lng: 28.0751 },
  { name: "Sandton", lat: -26.1076, lng: 28.0567 },
  { name: "Randburg", lat: -26.0941, lng: 27.9823 },
  { name: "Diepkloof", lat: -26.2497, lng: 27.9529 },
  { name: "Pimville", lat: -26.2689, lng: 27.8961 },
  { name: "Dobsonville", lat: -26.2178, lng: 27.8646 },
  { name: "Meadowlands", lat: -26.2233, lng: 27.8853 },
  { name: "Kliptown", lat: -26.2775, lng: 27.8872 },
  { name: "Protea Glen", lat: -26.2722, lng: 27.8165 },
  { name: "Jabulani", lat: -26.2515, lng: 27.8603 },
  { name: "Brixton", lat: -26.1899, lng: 28.0031 },
  { name: "Turffontein", lat: -26.2329, lng: 28.0448 },
  { name: "Orange Grove", lat: -26.1625, lng: 28.0844 },
  { name: "Houghton", lat: -26.1653, lng: 28.0546 },
  { name: "Linden", lat: -26.1367, lng: 27.9941 },
  { name: "Maboneng", lat: -26.2049, lng: 28.0571 }
];

// lib/places.ts
var PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape"
];
var TOWNS = [
  { name: "Johannesburg CBD", lat: -26.2041, lng: 28.0473, province: "Gauteng" },
  { name: "Pretoria", lat: -25.7479, lng: 28.2293, province: "Gauteng" },
  { name: "Mamelodi", lat: -25.72, lng: 28.395, province: "Gauteng" },
  { name: "Soshanguve", lat: -25.5236, lng: 28.1047, province: "Gauteng" },
  { name: "Tembisa", lat: -25.9964, lng: 28.2268, province: "Gauteng" },
  { name: "Midrand", lat: -25.9992, lng: 28.1263, province: "Gauteng" },
  { name: "Ekurhuleni (Germiston)", lat: -26.2173, lng: 28.1671, province: "Gauteng" },
  { name: "Vereeniging", lat: -26.6731, lng: 27.9261, province: "Gauteng" },
  { name: "Cape Town CBD", lat: -33.9249, lng: 18.4241, province: "Western Cape" },
  { name: "Khayelitsha", lat: -34.0405, lng: 18.678, province: "Western Cape" },
  { name: "Mitchells Plain", lat: -34.0488, lng: 18.6186, province: "Western Cape" },
  { name: "Woodstock", lat: -33.9275, lng: 18.447, province: "Western Cape" },
  { name: "Bellville", lat: -33.9, lng: 18.629, province: "Western Cape" },
  { name: "Gugulethu", lat: -33.9786, lng: 18.5711, province: "Western Cape" },
  { name: "Stellenbosch", lat: -33.9321, lng: 18.8602, province: "Western Cape" },
  { name: "George", lat: -33.963, lng: 22.4617, province: "Western Cape" },
  { name: "Durban CBD", lat: -29.8587, lng: 31.0218, province: "KwaZulu-Natal" },
  { name: "Umlazi", lat: -29.97, lng: 30.883, province: "KwaZulu-Natal" },
  { name: "Pinetown", lat: -29.8167, lng: 30.85, province: "KwaZulu-Natal" },
  { name: "Pietermaritzburg", lat: -29.6006, lng: 30.3794, province: "KwaZulu-Natal" },
  { name: "Richards Bay", lat: -28.783, lng: 32.0377, province: "KwaZulu-Natal" },
  { name: "Gqeberha (Port Elizabeth)", lat: -33.9608, lng: 25.6022, province: "Eastern Cape" },
  { name: "East London", lat: -33.0153, lng: 27.9116, province: "Eastern Cape" },
  { name: "Mthatha", lat: -31.5889, lng: 28.7844, province: "Eastern Cape" },
  { name: "Bloemfontein", lat: -29.0852, lng: 26.1596, province: "Free State" },
  { name: "Welkom", lat: -27.9774, lng: 26.7351, province: "Free State" },
  { name: "Polokwane", lat: -23.9045, lng: 29.4689, province: "Limpopo" },
  { name: "Thohoyandou", lat: -22.9456, lng: 30.4849, province: "Limpopo" },
  { name: "Mbombela (Nelspruit)", lat: -25.4753, lng: 30.9694, province: "Mpumalanga" },
  { name: "eMalahleni (Witbank)", lat: -25.8713, lng: 29.2333, province: "Mpumalanga" },
  { name: "Mahikeng", lat: -25.8652, lng: 25.6442, province: "North West" },
  { name: "Rustenburg", lat: -25.6676, lng: 27.2421, province: "North West" },
  { name: "Kimberley", lat: -28.7282, lng: 24.7499, province: "Northern Cape" },
  { name: "Upington", lat: -28.4478, lng: 21.2561, province: "Northern Cape" }
];
var PLACES = [
  ...SUBURBS.map((s) => ({ ...s, province: "Gauteng" })),
  ...TOWNS
];
var norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function matchPlaces(query, limit = 8) {
  const q = norm(query);
  if (!q) return PLACES.slice(0, limit);
  const scored = PLACES.map((p) => {
    const n = norm(p.name);
    if (n.includes(q)) return { p, score: n.startsWith(q) ? 0 : 1 };
    const words = n.split(" ");
    const prefixDist = Math.min(...words.map((w) => editDistance(w.slice(0, q.length), q)), editDistance(n.slice(0, q.length), q));
    const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
    return { p, score: prefixDist <= allowed ? 2 + prefixDist : 99 };
  });
  return scored.filter((x) => x.score < 99).sort((a, b) => a.score - b.score).map((x) => x.p).slice(0, limit);
}
function toProvince(state) {
  if (!state) return null;
  const s = norm(state);
  const found = PROVINCES.find((p) => norm(p) === s || s.includes(norm(p)));
  if (found) return found;
  if (s.includes("natal")) return "KwaZulu-Natal";
  return null;
}
function nearestProvince(point) {
  let best = PLACES[0];
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = (p.lat - point.lat) ** 2 + (p.lng - point.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.province;
}
var NOMINATIM = "https://nominatim.openstreetmap.org";
var SERVER_UA = "OpportunityBridge/1.0 (Wits Social Good Hackathon 2026)";
var inBrowser = typeof window !== "undefined";
async function searchPlacesOnline(query, signal, opts = {}) {
  const q = query.trim();
  if (q.length < 3) return [];
  if (inBrowser && !opts.direct) {
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal });
      if (res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = await res.json();
        if (Array.isArray(data.places)) return data.places;
      }
    } catch (e) {
      if (e.name === "AbortError") return [];
    }
  }
  try {
    const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=za&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal, headers: inBrowser ? { "Accept-Language": "en" } : { "Accept-Language": "en", "User-Agent": SERVER_UA } });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r) => {
      const point = { lat: Math.round(Number(r.lat) * 1e3) / 1e3, lng: Math.round(Number(r.lon) * 1e3) / 1e3 };
      const a = r.address || {};
      const name = r.name || a.suburb || a.town || a.city || r.display_name.split(",")[0];
      const place = a.city || a.town || a.municipality || "";
      return {
        ...point,
        name,
        province: toProvince(a.state) || nearestProvince(point),
        detail: [place && place !== name ? place : "", a.state].filter(Boolean).join(", ")
      };
    });
  } catch {
    return [];
  }
}
async function describePoint(point, opts = {}) {
  if (inBrowser && !opts.direct) {
    try {
      const res = await fetch(`/api/places?lat=${point.lat}&lng=${point.lng}`);
      if (res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = await res.json();
        if (data.name && data.province) return { name: data.name, province: data.province };
      }
    } catch {
    }
  }
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=${point.lat}&lon=${point.lng}`, {
      headers: inBrowser ? { "Accept-Language": "en" } : { "Accept-Language": "en", "User-Agent": SERVER_UA }
    });
    if (res.ok) {
      const r = await res.json();
      const a = r.address || {};
      const province = toProvince(a.state);
      const name = a.suburb || a.neighbourhood || a.town || a.city || a.village;
      if (province && name) return { name, province };
    }
  } catch {
  }
  let best = PLACES[0];
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = (p.lat - point.lat) ** 2 + (p.lng - point.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { name: `Near ${best.name}`, province: best.province };
}

// server/http.ts
var hits = /* @__PURE__ */ new Map();
function rateLimited(req, limit = 60) {
  const ip = String(req.headers["x-forwarded-for"] || "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 6e4);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}
function send(res, code, body, cacheSeconds = 0) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", cacheSeconds ? `public, s-maxage=${cacheSeconds}` : "no-store");
  res.status(code).json(body);
}
function guard(req, res, methods) {
  if (!methods.includes(req.method || "GET")) {
    res.setHeader("Allow", methods.join(", "));
    send(res, 405, { error: "Method not allowed" });
    return false;
  }
  if (rateLimited(req)) {
    send(res, 429, { error: "Too many requests. Try again in a minute." });
    return false;
  }
  return true;
}
var num = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
var one = (v) => (Array.isArray(v) ? v[0] : v) || "";

// server/places.ts
async function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  const q = one(req.query?.q).trim().slice(0, 80);
  const lat = num(Number(one(req.query?.lat)), -35, -22);
  const lng = num(Number(one(req.query?.lng)), 16, 33);
  if (q) {
    const local = matchPlaces(q, 6);
    const online = q.length >= 3 ? await searchPlacesOnline(q, void 0, { direct: true }) : [];
    const seen = /* @__PURE__ */ new Set();
    const places = [...local, ...online].filter((p) => {
      const key = `${p.name.toLowerCase()}|${p.province}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
    return send(res, 200, { places, source: online.length ? "local+openstreetmap" : "local" }, 86400);
  }
  if (lat !== null && lng !== null) {
    const found = await describePoint({ lat, lng }, { direct: true });
    return send(res, 200, found, 86400);
  }
  send(res, 400, { error: "Send q (a place name) or lat and lng inside South Africa." });
}
export {
  handler as default
};
