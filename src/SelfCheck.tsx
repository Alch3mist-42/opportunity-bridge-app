import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { runRulesCheck, type Check } from "../lib/eti-selfcheck"
import { runFairWorkCheck, runSecurityCheck } from "../lib/security-selfcheck"

function Group({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">{title}</p>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2 text-sm">
            {c.pass
              ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-green-700" />
              : <XCircle size={17} className="mt-0.5 shrink-0 text-red-700" />}
            <span className="min-w-0">
              <strong className="font-semibold">{c.name}</strong>
              <span className="block text-xs text-stone-500">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SelfCheck() {
  const rules = useMemo(runRulesCheck, [])
  const fairWork = useMemo(runFairWorkCheck, [])
  const [security, setSecurity] = useState<Check[] | null>(null)
  useEffect(() => {
    let alive = true
    runSecurityCheck().then((r) => alive && setSecurity(r)).catch(() => alive && setSecurity([{ name: "Security checks could not run", detail: "Web Crypto unavailable", pass: false }]))
    return () => { alive = false }
  }, [])
  const all = [...rules, ...fairWork, ...(security ?? [])]
  const passed = all.filter((c) => c.pass).length
  const allPass = security !== null && passed === all.length
  return (
    <div className="card mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow mb-1">Rules self-check</p>
          <p className="heading text-lg font-extrabold">
            {security === null ? "Running checks…" : allPass ? "All checks passed" : "Some checks failed"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${allPass ? "bg-green-100 text-green-700" : "bg-orange-50 text-red-700"}`}>
          {passed} / {all.length}
        </span>
      </div>
      <p className="mb-4 text-xs text-stone-500">
        Runs the ETI, SA ID, travel, fair-work (BCEA, minimum wage) and security rules from lib/ every time this page loads.
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        <Group title="Tax and travel rules" checks={rules} />
        <Group title="Fair work (BCEA, minimum wage)" checks={fairWork} />
        <Group title="Access and anti-cheating" checks={security ?? []} />
      </div>
    </div>
  )
}
