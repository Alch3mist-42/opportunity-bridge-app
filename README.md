# Opportunity Bridge

Work experience for South African youth at local small businesses. Youth are matched by skills
and by what it costs them to travel there. Businesses see the Employment Tax Incentive (ETI) they
may claim on their monthly EMP201, and every week of work is logged by the youth and signed off by
the supervisor, creating audit-ready evidence and a verified work record.

Wits Social Good Hackathon 2026 · Challenge areas: Township Economy, Social Entrepreneurship.

## Try the demo
1. Open the app and choose **Continue as Thandi (youth)**. Adjust the search radius and transport, then apply to Mama Joy's Bakery.
2. Switch to **Business** (top toggle). Applicants → Accept. ETI shows the monthly estimate and real cost.
3. Youth → My Week: log a week. Business → Ledger: sign it off. Youth → Work record shows it.
4. **Admin** shows the rules self-check (all checks should pass) and lets you reset the demo data.

People and businesses are fictional. Data is stored in your browser only.

## How it's built
- React 19 + Vite + Tailwind CSS (built in Figma Make), Leaflet with OpenStreetMap tiles, jsPDF.
- `lib/eti.ts` – ETI rules (SARS amounts effective 1 April 2025): age 18–29 at month end, 24-month cap,
  R7,500 ceiling, hours pro-rating, first/second 12-month bands.
- `lib/sa-id.ts` – SA ID validation (Luhn + real date). Only the date of birth is kept; the ID is never stored.
- `lib/travel.ts`, `lib/match.ts` – travel time and fare estimates; score = 70% skill fit + 30% travel cost;
  trips over 30% of the stipend are flagged, never hidden.
- `lib/eti-selfcheck.ts` – automated rule checks shown live on the Admin page.

## Not built yet (roadmap)
Cloud database and real logins, AI-assisted skill matching, public work-record links, YES sponsor–host marketplace.

## Run locally
`pnpm install` then `pnpm dev`.
