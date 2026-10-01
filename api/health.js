// Built from /server by server/build.mjs. Edit the files in /server, not this one.

// lib/labour.ts
var BCEA = {
  ordinaryHoursWeek: 45,
  ordinaryHoursDayFiveDayWeek: 9,
  ordinaryHoursDayLongerWeek: 8,
  overtimeHoursDay: 3,
  overtimeHoursWeek: 10,
  maxWorkDaysPerWeek: 6,
  // 36 consecutive hours of weekly rest means at least one full day off
  overtimeRate: 1.5,
  sundayRate: 2,
  mealBreakAfterHours: 5
};
var NATIONAL_MINIMUM_WAGE_HOURLY = 30.23;
var MAX_CONTRACTED_HOURS_MONTH = Math.floor(BCEA.ordinaryHoursWeek * 52 / 12);

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

// server/health.ts
function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  send(res, 200, {
    ok: true,
    service: "Opportunity Bridge API",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    rules: {
      eti: "SARS ETI amounts effective 1 April 2025",
      labour: `BCEA: ${BCEA.ordinaryHoursWeek} ordinary hours a week, overtime max ${BCEA.overtimeHoursDay}/day and ${BCEA.overtimeHoursWeek}/week`,
      minimumWage: `R${NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)} an hour`
    },
    endpoints: ["/api/health", "/api/eti", "/api/week", "/api/placement", "/api/places", "/api/selfcheck"]
  });
}
export {
  handler as default
};
