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
function hourlyRate(monthlyPay, hoursPerMonth) {
  return hoursPerMonth > 0 ? monthlyPay / hoursPerMonth : 0;
}
function placementLabourProblem(monthlyPay, hoursPerMonth) {
  if (hoursPerMonth > MAX_CONTRACTED_HOURS_MONTH)
    return `Ordinary hours can't be more than ${MAX_CONTRACTED_HOURS_MONTH} a month (45 a week). Overtime must be agreed separately.`;
  const rate = hourlyRate(monthlyPay, hoursPerMonth);
  if (rate < NATIONAL_MINIMUM_WAGE_HOURLY) {
    const needed = Math.ceil(NATIONAL_MINIMUM_WAGE_HOURLY * hoursPerMonth);
    return `R${rate.toFixed(2)} an hour is below the national minimum wage of R${NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)}. For ${hoursPerMonth} hours a month, pay at least R${needed.toLocaleString("en-ZA")}.`;
  }
  return null;
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
function bodyOf(req) {
  const b = typeof req.body === "string" ? safeJson(req.body) : req.body;
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
}
function safeJson(s) {
  try {
    return s.length > 1e4 ? {} : JSON.parse(s);
  } catch {
    return {};
  }
}
var num = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;

// server/placement.ts
function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  const b = bodyOf(req);
  const stipend = num(b.stipend, 0, 1e6);
  const hours = num(b.hours, 1, 744);
  if (stipend === null || hours === null) return send(res, 400, { error: "Send stipend and hours as numbers." });
  const problem = placementLabourProblem(stipend, hours);
  send(res, 200, {
    allowed: !problem,
    problem,
    hourlyRate: Math.round(hourlyRate(stipend, hours) * 100) / 100,
    minimumWage: NATIONAL_MINIMUM_WAGE_HOURLY,
    checkedBy: "server"
  });
}
export {
  handler as default
};
