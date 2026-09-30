# Opportunity Bridge

Work experience for South African youth at local small businesses. Youth are matched by skills
and by what it costs them to travel there. Businesses see the Employment Tax Incentive (ETI) they
may claim on their monthly EMP201, and every week of work is logged by the youth and signed off by
the supervisor, creating audit-ready evidence and a verified work record.

Wits Social Good Hackathon 2026 · Challenge areas: Township Economy, Social Entrepreneurship.

## Try the demo
1. The landing page asks who you are: a young person or a business. Each creates an account and sees only their own pages.
2. Or use **Sign in → Demo accounts (fictional)**: Thandi or Sipho (youth), Mama Joy's Bakery or Kasi Fix Electronics (business). Password: `Demo1234!`
3. As Thandi: choose a **Search area** (a whole province such as Gauteng or Western Cape, or a radius around you), tap **Near me** to use your phone's location, apply to Mama Joy's Bakery, then log a week in My Week.
4. As Mama Joy's Bakery: Applicants → Accept, ETI shows the monthly estimate and real cost, Ledger → Sign off.
5. **Admin access** (footer link) takes an admin code. Admins can't sign up. The Admin overview shows the live rules self-check and lets you reset the demo data.

Navigation works like an app: refreshing keeps you on the same page (and keeps your search filters), back or a back swipe returns to the previous page, and pressing back twice on the first page leaves the app. On a phone, "Add to Home Screen" installs it full-screen.

People and businesses are fictional. Data is stored in your browser only.

## Fair work (South African labour law)
The Constitution (section 23) guarantees fair labour practices; the detailed limits come from the Basic Conditions of Employment Act (BCEA) and the National Minimum Wage Act. `lib/labour.ts` enforces them:
- 45 ordinary hours a week, and 9 a day for a 5-day week (8 a day for more days).
- Overtime only by agreement: at most 3 hours a day and 10 a week, paid at 1.5 times the normal rate.
- At least one full day off a week (36 hours of weekly rest). Sunday work is paid double. There's a reminder about meal breaks after 5 hours.
- A placement can't pay less than the national minimum wage of R30.23 an hour (from 1 March 2026) or contract more than 195 hours a month.

Weekly logs that break these limits can't be submitted. Businesses see the hourly rate live when they post a placement.

## Location
- Type any suburb, town or city. Common places match even with typos ("Braamfontei", "rosebnk"). Anything else is searched across South Africa with OpenStreetMap (Nominatim).
- **Use my current location** and **Near me** use the phone's location services, but only after the user allows it.
- Opportunities can be filtered by a whole province (choosing Western Cape shows Cape Town, Khayelitsha, Bellville and more) or by a radius around a place.
- Demo businesses are in Gauteng, Western Cape, KwaZulu-Natal and Eastern Cape.

## Access control and anti-cheating
- `lib/access.ts` decides which role may open each page; wrong-role and signed-out visits are redirected.
- `lib/auth.ts`: passwords and the admin code are stored only as salted SHA-256 hashes; 5 wrong attempts lock a form for 5 minutes; admin sessions end after 30 minutes; forged or stale sessions are signed out.
- `lib/rules.ts`: one application per placement; only the posting business can accept, decline or sign off; a young person can never sign off their own week; no future weeks, BCEA hour limits, one entry per week; signed-off weeks are locked; only admins change verification; report rate limits.
- `lib/security-selfcheck.ts` tests these real functions live on the Admin page. There are 33 checks in total across tax and travel, fair work, and access.
- Honest limit: this prototype runs in the browser, so a determined person could edit their own local data. In production these same rules run on a server with a database.

## How it's built
- React 19 + Vite + Tailwind CSS (built in Figma Make), Leaflet with OpenStreetMap tiles, jsPDF.
- `lib/eti.ts` – ETI rules (SARS amounts effective 1 April 2025): age 18–29 at month end, 24-month cap,
  R7,500 ceiling, hours pro-rating, first/second 12-month bands.
- `lib/sa-id.ts` – SA ID validation (Luhn + real date). Only the date of birth is kept; the ID is never stored.
- `lib/travel.ts`, `lib/match.ts` – travel time and fare estimates; score = 70% skill fit + 30% travel cost;
  trips over 30% of the stipend are flagged, never hidden.
- `lib/eti-selfcheck.ts` – automated ETI, SA ID and travel checks shown live on the Admin page.

## Not built yet (roadmap)
Server-side sign-in and a cloud database, AI-assisted skill matching, public work-record links, YES sponsor–host marketplace.

## Run locally
`pnpm install` then `pnpm dev`.
