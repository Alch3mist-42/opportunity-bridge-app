// Built from /server by server/build.mjs. Edit the files in /server, not this one.

// lib/sa-id.ts
function ageOn(dateOfBirth, on) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  return on.getFullYear() - year - (on.getMonth() + 1 < month || on.getMonth() + 1 === month && on.getDate() < day ? 1 : 0);
}
function birthDateFromSAID(id, now = /* @__PURE__ */ new Date()) {
  if (!/^\d{13}$/.test(id)) return null;
  let sum = 0;
  let double = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let digit = Number(id[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  if (sum % 10 !== 0) return null;
  const yy = Number(id.slice(0, 2));
  const year = (yy > now.getFullYear() % 100 ? 1900 : 2e3) + yy;
  const month = Number(id.slice(2, 4));
  const day = Number(id.slice(4, 6));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > now)
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  let base2 = bandPay < 2500 ? bandPay * (first ? 0.6 : 0.3) : bandPay < 5500 ? first ? 1500 : 750 : first ? 1500 - 0.75 * (bandPay - 5500) : 750 - 0.375 * (bandPay - 5500);
  base2 *= Math.min(input.paidHours / 160, 1);
  return {
    amount: Math.round(Math.max(0, base2) * 100) / 100,
    reasons: [],
    eligible: true
  };
}

// lib/travel.ts
var TRAVEL_AFFORDABILITY_THRESHOLD = 0.3;
var WORK_DAYS = 21;
var ROAD_FACTOR = 1.3;
var MODES = {
  walk: { speed: 5, baseFare: 0, perKm: 0, maxKm: 4, label: "Walk" },
  taxi: {
    speed: 25,
    baseFare: 10,
    perKm: 1.2,
    maxKm: 40,
    label: "Minibus taxi"
  },
  bus: { speed: 20, baseFare: 8, perKm: 0.9, maxKm: 40, label: "Bus" },
  // No train fare model is provided. Bus proxy is explicitly identified to the user.
  train: {
    speed: 20,
    baseFare: 8,
    perKm: 0.9,
    maxKm: 40,
    label: "Train (bus fare proxy)"
  }
};
function haversine(a, b) {
  const rad = Math.PI / 180;
  const lat = (b.lat - a.lat) * rad;
  const lng = (b.lng - a.lng) * rad;
  const x = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function estimateTravel(from, to, mode, stipend) {
  const directKm = haversine(from, to);
  const roadKm = directKm * ROAD_FACTOR;
  const config = MODES[mode];
  const minutes = Math.round(roadKm / config.speed * 60);
  const monthlyCost = Math.round(
    (config.baseFare + config.perKm * roadKm) * 2 * WORK_DAYS
  );
  const share = stipend > 0 ? monthlyCost / stipend : Infinity;
  return {
    directKm,
    roadKm,
    minutes,
    monthlyCost,
    share,
    unaffordable: share > TRAVEL_AFFORDABILITY_THRESHOLD,
    outOfRange: roadKm > config.maxKm
  };
}

// lib/eti-selfcheck.ts
var base = {
  dateOfBirth: "2004-03-15",
  claimMonth: "2026-10",
  monthlyPay: 4e3,
  paidHours: 160,
  monthsAlreadyClaimed: 0,
  isConnectedPerson: false,
  isDomesticWorker: false,
  employerPayeRegistered: true,
  employerTaxCompliant: true
};
var ETI_CASES = [
  { name: "R4,000 full-time, first year", input: {}, expected: 1500 },
  { name: "R6,500 tapers down", input: { monthlyPay: 6500 }, expected: 750 },
  { name: "R4,000 in month 13 halves", input: { monthsAlreadyClaimed: 12 }, expected: 750 },
  { name: "R2,000 for 80 hours (pro-rated)", input: { monthlyPay: 2e3, paidHours: 80 }, expected: 750 },
  { name: "R2,000 full-time is 60%", input: { monthlyPay: 2e3 }, expected: 1200 },
  { name: "R7,500 or more gets nothing", input: { monthlyPay: 7500 }, expected: 0 },
  { name: "Turns 30 this month: not eligible", input: { dateOfBirth: "1996-10-10" }, expected: 0 },
  { name: "Turns 18 this month: eligible", input: { dateOfBirth: "2008-10-31" }, expected: 1500 },
  { name: "Scheme ends February 2029", input: { claimMonth: "2029-03" }, expected: 0 }
];
function runRulesCheck() {
  const checks = ETI_CASES.map((c) => {
    const actual = calculateETI({ ...base, ...c.input }).amount;
    return { name: c.name, detail: `expected R${c.expected}, got R${actual}`, pass: actual === c.expected };
  });
  checks.push(
    { name: "Valid SA ID keeps date of birth only", detail: "0403155000082 \u2192 2004-03-15", pass: birthDateFromSAID("0403155000082") === "2004-03-15" },
    { name: "Wrong ID checksum is rejected", detail: "0403155000083 \u2192 rejected", pass: birthDateFromSAID("0403155000083") === null }
  );
  const far = estimateTravel({ lat: -26.189, lng: 28.05 }, { lat: -25.9992, lng: 28.1263 }, "taxi", 4e3);
  checks.push({
    name: `Travel over ${Math.round(TRAVEL_AFFORDABILITY_THRESHOLD * 100)}% of stipend is flagged`,
    detail: `Hillbrow \u2192 Midrand by taxi: ${Math.round(far.share * 100)}% of R4,000`,
    pass: far.unaffordable
  });
  return checks;
}

// lib/access.ts
var PUBLIC = ["/", "/signin", "/signup/youth", "/signup/business", "/admin-access", "/privacy"];
var YOUTH = ["/matches", "/applications", "/week", "/profile", "/record", "/opportunities", "/setup/youth"];
function isPublic(path) {
  return PUBLIC.includes(path) || path.startsWith("/shared/");
}
function canAccess(role, path) {
  if (isPublic(path)) return true;
  if (!role) return false;
  if (role === "youth") return YOUTH.includes(path);
  if (role === "business") return path === "/business" || path.startsWith("/business/") || path === "/setup/business";
  if (role === "admin") return path === "/admin" || path.startsWith("/admin/");
  return false;
}

// lib/auth.ts
var ADMIN_CODE_HASH = "14e5d2360b9af7b600f4d001c2ff9da21ad85a393548bbbefa6a07b0d9276631";
var LOCK_MS = 5 * 60 * 1e3;
var ADMIN_SESSION_MS = 30 * 60 * 1e3;
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hashPassword(password, salt) {
  return sha256(`${salt}:${password}`);
}
async function isAdminCode(code) {
  return await sha256(code.trim()) === ADMIN_CODE_HASH;
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

// lib/rules.ts
var LIMITS = {
  maxHoursPerDay: 12,
  // 9 ordinary + 3 overtime (BCEA s9, s10)
  maxHoursPerWeek: 55,
  // 45 ordinary + 10 overtime (BCEA s9, s10)
  maxOpenApplications: 10,
  workNotesMax: 1e3,
  nameMax: 80,
  bioMax: 2e3,
  titleMax: 80,
  descriptionMax: 1e3,
  stipendMin: 1e3,
  stipendMax: 2e4,
  hoursMin: 1,
  hoursMax: MAX_CONTRACTED_HOURS_MONTH,
  youthMinAge: 18,
  youthMaxAge: 35,
  reportsPerHour: 5
};
function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
var ownsPlacement = (actor, placementId, store) => actor.role === "business" && !!actor.businessId && store.placements.some((p) => p.id === placementId && p.businessId === actor.businessId);
function canApply(actor, placementId, store) {
  if (actor.role !== "youth" || !actor.youthId) return "Only young people can apply.";
  const placement = store.placements.find((p) => p.id === placementId);
  if (!placement) return "This placement no longer exists.";
  if (store.blocked.includes(placementId) || store.blocked.includes(placement.businessId)) return "You blocked this placement.";
  if (store.applications.some((a) => a.youthId === actor.youthId && a.placementId === placementId)) return "You've already applied here.";
  const open = store.applications.filter((a) => a.youthId === actor.youthId && (a.status === "Applied" || a.status === "Shortlisted"));
  if (open.length >= LIMITS.maxOpenApplications)
    return `You have ${open.length} open applications. Wait for replies or withdraw one before applying again.`;
  return null;
}
function canDecideApplication(actor, application, store, decision) {
  if (!ownsPlacement(actor, application.placementId, store)) return "Only the business that posted this placement can decide.";
  if (application.status === "Accepted" || application.status === "Declined") return "This decision has already been made.";
  if (decision === "Accepted" && store.applications.some((a) => a.youthId === application.youthId && a.status === "Accepted" && a.id !== application.id))
    return "This person already has an active placement. One placement at a time keeps hours legal and the tax incentive honest.";
  return null;
}
function validateWeek(input, existingForApplication, now = /* @__PURE__ */ new Date()) {
  if (input.days.length !== 7) return "Enter hours for each day.";
  if (input.days.some((h) => !Number.isFinite(h) || h < 0 || h > 24)) return "Enter hours between 0 and 24 for each day.";
  const total = input.days.reduce((a, b) => a + b, 0);
  if (total <= 0) return "Add the hours you worked.";
  const labour = checkWorkWeek(input.days);
  if (labour.errors.length) return labour.errors[0];
  if (!input.work.trim()) return "Describe the work you did.";
  if (input.work.length > LIMITS.workNotesMax) return `Keep the description under ${LIMITS.workNotesMax} characters.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)) return "Choose the week.";
  if (input.weekStart !== mondayOf(/* @__PURE__ */ new Date(input.weekStart + "T12:00:00"))) return "Weeks start on a Monday.";
  if (input.weekStart > mondayOf(now)) return "You can't log a week that hasn't started.";
  if (existingForApplication.some((w) => w.weekStart === input.weekStart && w.status !== "Queried"))
    return "You've already logged this week.";
  return null;
}
function canSignOffWeek(actor, week, store) {
  const app = store.applications.find((a) => a.id === week.applicationId);
  if (!app) return "This placement no longer exists.";
  if (actor.role === "youth") return "You can't sign off your own week.";
  if (!ownsPlacement(actor, app.placementId, store)) return "Only the business running this placement can sign off.";
  if (week.status !== "Submitted") return "Only submitted weeks can be signed off or queried.";
  return null;
}
function canEditWeek(week) {
  return week.status !== "Signed off";
}

// lib/security-selfcheck.ts
async function runSecurityCheck() {
  const store = {
    placements: [{ id: "p1", businessId: "B1" }],
    applications: [{ id: "a1", youthId: "Y1", placementId: "p1", status: "Accepted" }],
    blocked: []
  };
  const youth = { role: "youth", youthId: "Y1" };
  const owner = { role: "business", businessId: "B1" };
  const other = { role: "business", businessId: "B2" };
  const week = { applicationId: "a1", status: "Submitted", weekStart: mondayOf(/* @__PURE__ */ new Date()) };
  const day = (h) => [h, 8, 8, 8, 8, 0, 0];
  const nextMonday = (() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 7);
    return mondayOf(d);
  })();
  const hash1 = await hashPassword("Demo1234!", "salt-a");
  const hash2 = await hashPassword("Demo1234!", "salt-a");
  const c = (name, pass, detail) => ({ name, pass, detail });
  return [
    c("Youth can't open business pages", canAccess("youth", "/business/eti") === false, "youth \u2192 #/business/eti is refused"),
    c("Business can't open admin pages", canAccess("business", "/admin") === false, "business \u2192 #/admin is refused"),
    c("Signed-out users can't open youth pages", canAccess(null, "/matches") === false, "no session \u2192 #/matches is refused"),
    c("Youth can open their own pages", canAccess("youth", "/matches") === true, "youth \u2192 #/matches is allowed"),
    c("Passwords are stored hashed", hash1 !== "Demo1234!" && hash1 === hash2 && hash1.length === 64, "SHA-256 with a per-user salt"),
    c("Admin code is stored only as a hash", ADMIN_CODE_HASH.length === 64 && !await isAdminCode("admin"), "wrong code is refused"),
    c("Youth can't sign off their own week", canSignOffWeek(youth, week, store) !== null, "refused"),
    c("Only the placement's business can sign off", canSignOffWeek(other, week, store) !== null && canSignOffWeek(owner, week, store) === null, "other business refused, owner allowed"),
    c("Signed-off weeks are locked", canEditWeek({ ...week, status: "Signed off" }) === false, "no edits after sign-off"),
    c("Impossible hours are rejected", validateWeek({ days: day(13), work: "x", weekStart: week.weekStart }, []) !== null, "13 hours in a day is refused"),
    c("Future weeks are rejected", validateWeek({ days: day(8), work: "x", weekStart: nextMonday }, []) !== null, `week of ${nextMonday} is refused`),
    c("Only the owner decides on applicants", canDecideApplication(other, { ...store.applications[0], status: "Applied" }, store) !== null, "another business is refused"),
    c("No duplicate applications", canApply(youth, "p1", { ...store, applications: [{ id: "a2", youthId: "Y1", placementId: "p1", status: "Applied" }] }) !== null, "second application is refused")
  ];
}
function runFairWorkCheck() {
  const c = (name, pass, detail) => ({ name, pass, detail });
  const normal = checkWorkWeek([8, 8, 8, 8, 8, 0, 0]);
  const longDay = checkWorkWeek([13, 8, 8, 8, 8, 0, 0]);
  const sevenDays = checkWorkWeek([6, 6, 6, 6, 6, 6, 6]);
  const tooMuchOvertime = checkWorkWeek([12, 12, 12, 12, 9, 0, 0]);
  const someOvertime = checkWorkWeek([10, 10, 9, 9, 9, 0, 0]);
  return [
    c("A normal 5 \xD7 8 hour week is allowed", normal.errors.length === 0 && normal.overtime === 0, "40 ordinary hours, no overtime"),
    c("More than 3 hours overtime in a day is refused", longDay.errors.length > 0, "13 hours on Monday (max 9 + 3)"),
    c("A 7-day week is refused", sevenDays.errors.length > 0, "36 hours of weekly rest means one full day off"),
    c("More than 10 hours overtime a week is refused", tooMuchOvertime.errors.length > 0, `${tooMuchOvertime.overtime} hours of overtime`),
    c("Legal overtime is flagged for agreement and 1.5\xD7 pay", someOvertime.errors.length === 0 && someOvertime.overtime === 2 && someOvertime.warnings.length > 0, "2 hours of overtime"),
    c("Pay below the minimum wage is refused", placementLabourProblem(4e3, 160) !== null, "R4,000 for 160 hours = R25.00/h"),
    c("Lawful pay is allowed", placementLabourProblem(5e3, 160) === null, "R5,000 for 160 hours = R31.25/h"),
    c("More than 45 ordinary hours a week is refused", placementLabourProblem(9e3, 200) !== null, "200 hours a month")
  ];
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

// server/selfcheck.ts
async function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  const groups = [
    { name: "Tax and travel", checks: runRulesCheck() },
    { name: "Fair work (BCEA, minimum wage)", checks: runFairWorkCheck() },
    { name: "Access and anti-cheating", checks: await runSecurityCheck() }
  ];
  const all = groups.flatMap((g) => g.checks);
  send(res, 200, { passed: all.filter((c) => c.pass).length, total: all.length, ranOn: "server", time: (/* @__PURE__ */ new Date()).toISOString(), groups });
}
export {
  handler as default
};
