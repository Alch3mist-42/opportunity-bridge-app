import { runRulesCheck } from "../lib/eti-selfcheck"
import { runFairWorkCheck, runSecurityCheck } from "../lib/security-selfcheck"
import { guard, send, type Req, type Res } from "./http"

// GET /api/selfcheck – runs the same 33 rule checks on the server that the Admin page runs in the browser.
export default async function handler(req: Req, res: Res) {
  if (!guard(req, res, ["GET"])) return
  const groups = [
    { name: "Tax and travel", checks: runRulesCheck() },
    { name: "Fair work (BCEA, minimum wage)", checks: runFairWorkCheck() },
    { name: "Access and anti-cheating", checks: await runSecurityCheck() },
  ]
  const all = groups.flatMap((g) => g.checks)
  send(res, 200, { passed: all.filter((c) => c.pass).length, total: all.length, ranOn: "server", time: new Date().toISOString(), groups })
}
