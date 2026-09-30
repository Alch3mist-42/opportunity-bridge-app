import { useMemo } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { runSelfCheck } from "../lib/eti-selfcheck"

export default function SelfCheck() {
  const { checks, allPass } = useMemo(runSelfCheck, [])
  const passed = checks.filter((c) => c.pass).length
  return (
    <div className="card mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow mb-1">Rules self-check</p>
          <p className="heading text-lg font-extrabold">
            {allPass ? "All checks passed" : "Some checks failed"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${allPass ? "bg-green-100 text-green-700" : "bg-orange-50 text-red-700"}`}>
          {passed} / {checks.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        Runs the ETI, SA ID and travel rules from lib/ every time this page loads.
      </p>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2 text-sm">
            {c.pass
              ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-green-700" />
              : <XCircle size={17} className="mt-0.5 shrink-0 text-red-700" />}
            <span>
              <strong className="font-semibold">{c.name}</strong>
              <span className="block text-xs text-stone-500">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
