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
var MAX_CONTRACTED_HOURS_MONTH = Math.floor(BCEA.ordinaryHoursWeek * 52 / 12);
function checkWorkWeek(days) {
  const errors = [];
  const warnings = [];
  const worked = days.filter((h) => h > 0).length;
  const dayCap = worked <= 5 ? BCEA.ordinaryHoursDayFiveDayWeek : BCEA.ordinaryHoursDayLongerWeek;
  let dailyOvertime = 0;
  days.forEach((h, i) => {
    const over = Math.max(0, h - dayCap);
    if (over > BCEA.overtimeHoursDay) {
      const name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i];
      errors.push(
        `${name}: ${h} hours is more than the legal maximum of ${dayCap + BCEA.overtimeHoursDay} (${dayCap} ordinary + ${BCEA.overtimeHoursDay} overtime).`
      );
    }
    dailyOvertime += over;
  });
  const ordinaryDays = days.reduce((sum, h) => sum + Math.min(h, dayCap), 0);
  const ordinary = Math.min(ordinaryDays, BCEA.ordinaryHoursWeek);
  const overtime = dailyOvertime + Math.max(0, ordinaryDays - BCEA.ordinaryHoursWeek);
  const total = days.reduce((a, b) => a + b, 0);
  if (worked > BCEA.maxWorkDaysPerWeek)
    errors.push("Everyone must get at least one full day off a week (36 hours of weekly rest).");
  if (overtime > BCEA.overtimeHoursWeek)
    errors.push(`${overtime} hours of overtime is more than the legal maximum of ${BCEA.overtimeHoursWeek} a week.`);
  if (overtime > 0 && overtime <= BCEA.overtimeHoursWeek)
    warnings.push(`Includes ${overtime} hours of overtime. Overtime needs a written agreement and is paid at 1.5 times the normal rate.`);
  if (days[6] > 0) warnings.push("Sunday work is paid at double the normal rate unless Sunday is a normal working day.");
  if (days.some((h) => h > BCEA.mealBreakAfterHours))
    warnings.push("Days longer than 5 hours must include a meal break of at least 30 minutes to 1 hour.");
  return { errors, warnings, ordinary, overtime, total };
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

// server/week.ts
function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  const days = bodyOf(req).days;
  if (!Array.isArray(days) || days.length !== 7 || !days.every((d) => typeof d === "number" && Number.isFinite(d) && d >= 0 && d <= 24))
    return send(res, 400, { error: "Send days: seven numbers from 0 to 24 (Monday to Sunday)." });
  const check = checkWorkWeek(days);
  send(res, 200, { ...check, allowed: check.errors.length === 0, checkedBy: "server" });
}
export {
  handler as default
};
