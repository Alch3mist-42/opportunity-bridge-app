// Built from /server by server/build.mjs. Edit the files in /server, not this one.

// lib/sa-id.ts
function ageOn(dateOfBirth, on) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  return on.getFullYear() - year - (on.getMonth() + 1 < month || on.getMonth() + 1 === month && on.getDate() < day ? 1 : 0);
}

// lib/eti.ts
function calculateETI(input) {
  const reasons = [];
  const [year, month] = input.claimMonth.split("-").map(Number);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(input.claimMonth);
  if (!validMonth) reasons.push("Enter a valid claim month.");
  const [birthYear, birthMonth, birthDay] = input.dateOfBirth.split("-").map(Number);
  const birth = new Date(birthYear, birthMonth - 1, birthDay);
  const validBirth = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(input.dateOfBirth) && birth.getFullYear() === birthYear && birth.getMonth() === birthMonth - 1 && birth.getDate() === birthDay;
  if (!validBirth) reasons.push("Enter a valid date of birth.");
  const age = validMonth && validBirth ? ageOn(input.dateOfBirth, new Date(year, month, 0)) : -1;
  if (validMonth && validBirth && (age < 18 || age > 29))
    reasons.push("Age must be 18 to 29 on the last day of the claim month.");
  if (input.monthsAlreadyClaimed >= 24)
    reasons.push("The 24 claim months have been used.");
  if (input.isConnectedPerson)
    reasons.push("Connected people, such as family members, are not eligible.");
  if (input.isDomesticWorker) reasons.push("Domestic workers are not eligible.");
  if (!input.employerPayeRegistered)
    reasons.push("The employer must be registered for PAYE.");
  if (!input.employerTaxCompliant)
    reasons.push("The employer must be tax compliant.");
  if (input.paidHours <= 0 || !Number.isFinite(input.paidHours))
    reasons.push("Paid hours must be greater than zero.");
  if (validMonth && input.claimMonth > "2029-02")
    reasons.push("The scheme ends on 28 February 2029.");
  if (input.monthlyPay < 0 || !Number.isFinite(input.monthlyPay))
    reasons.push("Pay must be a valid positive amount.");
  if (input.monthsAlreadyClaimed < 0 || !Number.isInteger(input.monthsAlreadyClaimed))
    reasons.push("Claim months must be a whole number of zero or more.");
  const bandPay = input.paidHours > 0 ? input.monthlyPay * (input.paidHours < 160 ? 160 / input.paidHours : 1) : 0;
  if (bandPay >= 7500) reasons.push("Adjusted monthly pay is R7,500 or more.");
  if (reasons.length) return { amount: 0, reasons, eligible: false };
  const first = input.monthsAlreadyClaimed < 12;
  let base = bandPay < 2500 ? bandPay * (first ? 0.6 : 0.3) : bandPay < 5500 ? first ? 1500 : 750 : first ? 1500 - 0.75 * (bandPay - 5500) : 750 - 0.375 * (bandPay - 5500);
  base *= Math.min(input.paidHours / 160, 1);
  return {
    amount: Math.round(Math.max(0, base) * 100) / 100,
    reasons: [],
    eligible: true
  };
}

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
var str = (v, max = 100) => typeof v === "string" && v.length <= max ? v : null;

// server/eti.ts
function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  const b = bodyOf(req);
  const dateOfBirth = str(b.dateOfBirth, 10);
  const claimMonth = str(b.claimMonth, 7);
  const monthlyPay = num(b.monthlyPay, 0, 1e6);
  const paidHours = num(b.paidHours, 0, 744);
  const monthsAlreadyClaimed = num(b.monthsAlreadyClaimed ?? 0, 0, 120);
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !claimMonth || monthlyPay === null || paidHours === null || monthsAlreadyClaimed === null)
    return send(res, 400, { error: "Send dateOfBirth (YYYY-MM-DD), claimMonth (YYYY-MM), monthlyPay, paidHours and monthsAlreadyClaimed." });
  const result = calculateETI({
    dateOfBirth,
    claimMonth,
    monthlyPay,
    paidHours,
    monthsAlreadyClaimed,
    isConnectedPerson: b.isConnectedPerson === true,
    isDomesticWorker: b.isDomesticWorker === true,
    employerPayeRegistered: b.employerPayeRegistered !== false,
    employerTaxCompliant: b.employerTaxCompliant !== false
  });
  send(res, 200, {
    ...result,
    hourlyRate: paidHours ? Math.round(hourlyRate(monthlyPay, paidHours) * 100) / 100 : null,
    minimumWageProblem: paidHours ? placementLabourProblem(monthlyPay, paidHours) : null,
    realCost: Math.max(0, monthlyPay - result.amount),
    calculatedBy: "server"
  });
}
export {
  handler as default
};
