import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  LayoutDashboard,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
  LogOut,
  KeyRound,
  Copy,
} from "lucide-react"
import { jsPDF } from "jspdf"
import MatchMap from "./MatchMap"
import SelfCheck from "./SelfCheck"
import {
  Button,
  Input,
  Select,
  Textarea,
  Link,
  Heading1,
  Heading2,
  Heading3,
} from "./ui"
import {
  audit,
  loadStore,
  saveStore,
  seedStore,
  type Application,
  type Business,
  type Placement,
  type Store,
  type Youth,
  type Week,
  type Account,
  type Session,
  loadSession,
  saveSession,
  DEMO_PASSWORD,
  DEMO_RECOVERY_CODE,
} from "./data"
import { canAccess, homeFor, isPublic, ownerLabel, type Role } from "../lib/access"
import {
  ADMIN_SESSION_MS,
  clearFailures,
  emailProblem,
  hashPassword,
  isAdminCode,
  lockRemaining,
  newSalt,
  passwordProblem,
  recordFailure,
  passwordStrength,
  newPasswordProblem,
  newRecoveryCode,
  hashRecoveryCode,
} from "../lib/auth"
import {
  canApply,
  canDecideApplication,
  canLogWeek,
  canSignOffWeek,
  mondayOf,
  reportAllowed,
  validatePlacement,
  validateWeek,
  youthAgeProblem,
  LIMITS,
} from "../lib/rules"
import {
  calculateETI,
  claimMonthsSince,
  summarizeETI,
  MIN_WAGE_HOURLY,
} from "../lib/eti"
import { ageOn, birthDateFromSAID } from "../lib/sa-id"
import { businessPhoto, shrinkPhoto } from "../lib/business-photos"
import { api, type ETIVerdict, type PlacementVerdict, type WeekVerdict } from "../lib/api"
import { rankMatch } from "../lib/match"
import {
  MODES,
  TRAVEL_AFFORDABILITY_THRESHOLD,
  type Point,
  type TravelMode,
} from "../lib/travel"
import {
  describePoint,
  matchPlaces,
  PROVINCE_CENTRES,
  PROVINCES,
  provinceOf,
  rememberProvince,
  searchPlacesOnline,
  type Place,
  type Province,
} from "../lib/places"
import {
  checkWorkWeek,
  hourlyRate,
  MAX_CONTRACTED_HOURS_MONTH,
  NATIONAL_MINIMUM_WAGE_HOURLY,
  placementLabourProblem,
} from "../lib/labour"

// Hash-based routes (#/matches) so the app works on any static host.
const currentRoute = () => window.location.hash.slice(1) || "/"

// Keeps a page's filters (area, radius, view) through a refresh, for this browser tab only.
function useTabState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(`ob-view-${key}`)
      if (saved !== null) return JSON.parse(saved) as T
    } catch {
      /* storage blocked: fall back to the default */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(`ob-view-${key}`, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue] as const
}
const money = (n: number) =>
  `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 })}`
const today = () => new Date().toISOString().slice(0, 10)
const monthNow = () => new Date().toISOString().slice(0, 7)
const prettyDate = (s: string) =>
  new Date(s).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
const estimateNote = (
  <p className="text-xs text-stone-500">
    Estimate only. Confirm with your payroll provider.
  </p>
)
const wageNote = MIN_WAGE_HOURLY === null && (
  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
    Minimum wage check not configured
  </div>
)

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-stone-500">{hint}</span>
      )}
    </label>
  )
}
function Pill({
  children,
  tone = "green",
}: {
  children: ReactNode
  tone?: "green" | "amber" | "grey" | "red"
}) {
  const styles = {
    green: "bg-green-100 text-green-700",
    amber: "bg-orange-100 text-amber-700",
    grey: "bg-stone-100 text-stone-500",
    red: "bg-orange-50 text-red-700",
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${styles[tone]}`}
    >
      {children}
    </span>
  )
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-green-700">
        {icon}
      </div>
      <Heading3 className="heading text-xl font-extrabold">{title}</Heading3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
function PageIntro({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow mb-2">{eyebrow}</div>
        <Heading1 className="heading text-3xl font-extrabold leading-tight md:text-4xl">
          {title}
        </Heading1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}
function BusinessPhoto({ business, size = 48, className = "" }: { business: Business; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = businessPhoto(business)
  return src && !failed ? (
    <img
      src={src}
      alt={`${business.name}`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-2xl object-cover ${className}`}
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700 ${className}`}
    >
      <BriefcaseBusiness size={Math.round(size * 0.44)} />
    </div>
  )
}

function PhotoUpload({ business, onPhoto, toast }: { business: Business; onPhoto: (photo: string | undefined) => void; toast: (s: string) => void }) {
  return (
    <div className="flex items-center gap-4">
      <BusinessPhoto business={business} size={64} />
      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary cursor-pointer text-sm">
          Upload shop photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              try {
                onPhoto(await shrinkPhoto(file))
              } catch (err) {
                toast((err as Error).message)
              }
            }}
          />
        </label>
        {business.photo && (
          <Button className="btn-secondary text-sm" onClick={() => onPhoto(undefined)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

function LocationPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string, point: Point) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [online, setOnline] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => setQuery(value), [value])
  useEffect(() => {
    if (!open || query.trim().length < 3) {
      setOnline([])
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      searchPlacesOnline(query, ctrl.signal).then((r) => {
        if (!ctrl.signal.aborted) {
          setOnline(r)
          setSearching(false)
        }
      })
    }, 450)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
      setSearching(false)
    }
  }, [query, open])
  const local = matchPlaces(query, 6)
  const results = [
    ...local,
    ...online.filter(
      (o) => !local.some((l) => l.name.toLowerCase() === o.name.toLowerCase() && l.province === o.province),
    ),
  ]
  const choose = (p: Place) => {
    const point = { lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 }
    rememberProvince(point, p.province)
    onChange(p.name, point)
    setQuery(p.name)
    setOpen(false)
    setError("")
  }
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser. Type your area instead.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = {
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lng: Math.round(pos.coords.longitude * 1000) / 1000,
        }
        const found = await describePoint(point)
        rememberProvince(point, found.province)
        onChange(found.name, point)
        setQuery(found.name)
        setLocating(false)
        setError("")
      },
      () => {
        setLocating(false)
        setError("Location permission wasn't given. Type your area instead.")
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            className="field !pl-9"
            placeholder="Type a suburb, town or city"
            value={query}
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Typed a place but didn't tap a suggestion: take the best match.
              const best = results[0]
              if (query.trim() && query !== value && best) choose(best)
              setTimeout(() => setOpen(false), 200)
            }}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (results[0]) choose(results[0])
              }
            }}
          />
        </div>
        <Button
          type="button"
          title="Use my current location"
          aria-label="Use my current location"
          className="btn-secondary shrink-0 !px-3"
          disabled={locating}
          onClick={useMyLocation}
        >
          <Navigation size={18} />
        </Button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {locating
          ? "Finding your location…"
          : "Search any place in South Africa, or tap the arrow to use your location. Others only see your suburb."}
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {value && query === value && !error && (
        <p className="mt-1 text-xs font-semibold text-green-700">✓ {value} selected</p>
      )}
      {open && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
          {results.map((p) => (
            <Button
              type="button"
              key={`${p.name}-${p.lat}-${p.lng}`}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-stone-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
            >
              <span className="font-semibold">{p.name}</span>
              <span className="block text-xs text-stone-500">{p.detail || p.province}</span>
            </Button>
          ))}
          {searching && <p className="px-3 py-2 text-xs text-stone-500">Searching all of South Africa…</p>}
          {!searching && !results.length && (
            <p className="px-3 py-2 text-xs text-stone-500">
              No places found for "{query}". Check the spelling or try a nearby town.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [session, setSession] = useState<Session | null>(loadSession)
  const [path, setPath] = useState(currentRoute)
  const [toast, setToast] = useState("")
  const [, setTick] = useState(0)
  const update = (fn: (s: Store) => Store) =>
    setStore((prev) => fn(structuredClone(prev)))

  // Who is signed in, re-checked against the stored accounts on every render.
  const account =
    session?.kind === "account"
      ? store.accounts.find((a) => a.id === session.accountId) || null
      : null
  const adminActive = session?.kind === "admin" && session.until > Date.now()
  const role: Role | null = adminActive ? "admin" : account ? account.role : null
  const youth =
    account?.role === "youth" && account.profileId
      ? store.youth.find((y) => y.id === account.profileId)
      : undefined
  const business =
    account?.role === "business" && account.profileId
      ? store.businesses.find((b) => b.id === account.profileId)
      : undefined
  const needsSetup = !!account && !youth && !business
  const setupPath = account ? `/setup/${account.role}` : ""

  useEffect(() => {
    saveStore(store)
  }, [store])
  useEffect(() => {
    saveSession(session)
  }, [session])
  useEffect(() => {
    // Tampered or stale session (account removed, role edited, admin time up): sign out.
    if (session?.kind === "account" && !account) setSession(null)
    if (session?.kind === "admin" && session.until <= Date.now()) {
      setSession(null)
      setToast("Admin session ended. Enter the admin code again.")
    }
  })
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(timer)
  }, [])
  // Back button and back swipe: every page is its own history entry, so back returns to the
  // previous page. A hidden "exit guard" entry sits under the first page: reaching it shows
  // "Swipe back again to exit", and a second back within 2 seconds leaves the app.
  const lastBackAt = useRef(0)
  useEffect(() => {
    const arm = () => {
      if (!history.state?.ob) history.replaceState({ ob: "guard" }, "", `#${currentRoute()}`)
      if (history.state?.ob === "guard") history.pushState({ ob: "page" }, "", `#${currentRoute()}`)
    }
    arm()
    // Coming back into the app with forward, or from the browser's page cache.
    const onShow = (e: PageTransitionEvent) => e.persisted && arm()
    window.addEventListener("pageshow", onShow)
    const onPop = (e: PopStateEvent) => {
      if (e.state?.ob === "guard") {
        // First back on the first page: stay put and warn. The next back within 2 seconds
        // leaves the app (the browser or phone handles it). After 2 seconds the guard is re-armed.
        const armedAt = Date.now()
        lastBackAt.current = armedAt
        setToast("Swipe back again to exit")
        setTimeout(() => {
          if (lastBackAt.current === armedAt && history.state?.ob === "guard")
            history.pushState({ ob: "page" }, "", `#${currentRoute()}`)
        }, 2000)
      }
      setPath(currentRoute())
    }
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      window.removeEventListener("pageshow", onShow)
    }
  }, [])
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(""), 4000)
      return () => clearTimeout(timeout)
    }
  }, [toast])
  const go = (url: string) => {
    if (url !== currentRoute()) history.pushState({ ob: "page" }, "", `#${url}`)
    setPath(url)
    window.scrollTo(0, 0)
  }
  // Used for redirects, sign-in and sign-out so back never lands on a page you were bounced from.
  const replace = (url: string) => {
    history.replaceState({ ob: history.state?.ob === "guard" ? "guard" : "page" }, "", `#${url}`)
    setPath(url)
    window.scrollTo(0, 0)
  }

  // Page guard: every route is checked by lib/access.ts.
  const signedInOnlyPublic = ["/signin", "/signup/youth", "/signup/business", "/admin-access", "/forgot"]
  let redirect: { to: string; message?: string } | null = null
  if (path === "/demo") redirect = { to: "/" }
  else if (path === "/" && role && !needsSetup) redirect = { to: homeFor(role) }
  else if (needsSetup && path !== setupPath && path !== "/privacy" && path !== "/")
    redirect = { to: setupPath }
  else if (!needsSetup && role && (signedInOnlyPublic.includes(path) || path.startsWith("/setup/")))
    redirect = { to: homeFor(role) }
  else if (!canAccess(role, path))
    redirect = role
      ? { to: homeFor(role), message: `That page is for ${ownerLabel(path)}.` }
      : { to: "/signin", message: "Please sign in first." }
  useEffect(() => {
    if (redirect) {
      replace(redirect.to)
      if (redirect.message) setToast(redirect.message)
    }
  })

  const record = (actor: string, action: string) =>
    update((s) => {
      s.audit.unshift(audit(actor, action))
      s.audit = s.audit.slice(0, 50)
      return s
    })
  const signIn = (acc: Account) => {
    setSession({ kind: "account", accountId: acc.id })
    record(acc.email, `Signed in as ${acc.role}`)
    replace(acc.profileId ? homeFor(acc.role) : `/setup/${acc.role}`)
  }
  const signOut = () => {
    setSession(null)
    replace("/")
    setToast("Signed out.")
  }
  const actorName = youth?.name || business?.name || (role === "admin" ? "Admin" : "Visitor")
  const report = (target: string, by: string) => {
    const mine = store.reports.filter((r) => r.by === by && r.at).map((r) => r.at!)
    if (!reportAllowed(mine)) {
      setToast("You've sent several reports in the last hour. Please try again later.")
      return
    }
    const reason = window.prompt("What would you like to report?")
    if (!reason?.trim()) return
    update((s) => {
      s.reports.unshift({
        id: crypto.randomUUID(),
        target,
        by,
        reason: reason.trim().slice(0, 500),
        status: "Open",
        at: new Date().toISOString(),
      })
      s.audit.unshift(audit(by, `Reported ${target}`))
      return s
    })
    setToast("Report sent to the admin queue.")
  }
  const block = (target: string) => {
    if (
      !window.confirm(
        "Block this profile or placement? It will no longer appear in your matches.",
      )
    )
      return
    update((s) => {
      if (!s.blocked.includes(target)) s.blocked.push(target)
      s.audit.unshift(audit(actorName, `Blocked ${target}`))
      return s
    })
    setToast("Blocked.")
  }
  const tabs =
    role === "youth"
      ? [
          { name: "Matches", url: "/matches", icon: Search },
          { name: "Applications", url: "/applications", icon: FileText },
          { name: "My Week", url: "/week", icon: CalendarDays },
          { name: "Profile", url: "/profile", icon: Users },
        ]
      : role === "business"
        ? [
            { name: "Dashboard", url: "/business", icon: LayoutDashboard },
            { name: "Applicants", url: "/business/applicants", icon: Users },
            { name: "ETI", url: "/business/eti", icon: Wallet },
            { name: "Ledger", url: "/business/ledger", icon: ClipboardCheck },
          ]
        : role === "admin"
          ? [
              { name: "Overview", url: "/admin", icon: LayoutDashboard },
              { name: "Reports", url: "/admin/reports", icon: Flag },
              { name: "Verify", url: "/admin/verify", icon: BadgeCheck },
              { name: "Audit", url: "/admin/audit", icon: FileText },
            ]
          : []
  const inWorkspace = !!role && !needsSetup && !isPublic(path) && !redirect
  // The initials button opens your own profile, which is also where you sign out.
  const profilePath = needsSetup
    ? setupPath
    : role === "youth"
      ? "/profile"
      : role === "business"
        ? "/business/onboarding"
        : "/admin"
  const initials =
    role === "admin"
      ? "AD"
      : (youth?.name || business?.name || account?.email || "?")
          .split(" ")
          .slice(0, 2)
          .map((s) => s[0])
          .join("")
          .toUpperCase()

  return (
    <div className="min-h-screen bg-stone-100 text-emerald-950">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Button
            onClick={() => go(role && !needsSetup ? homeFor(role) : "/")}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-champagne">
              <BriefcaseBusiness size={21} strokeWidth={2.2} />
            </span>
            <span className="heading text-lg font-extrabold leading-[1.05] tracking-tight">
              opportunity
              <br />
              <span className="text-iris">bridge.</span>
            </span>
          </Button>
          <div className="flex shrink-0 items-center gap-2">
            {role && (
              <span className="hidden rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-emerald-800 sm:inline">
                {role === "youth" ? "Youth" : role === "business" ? "Business" : "Admin"}
              </span>
            )}
            <Button
              onClick={() => go("/privacy")}
              title="Privacy"
              aria-label="Privacy"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-slate-600"
            >
              <Shield size={19} />
            </Button>
            {role ? (
              <>
                <Button
                  onClick={() => go(profilePath)}
                  title="Your profile and sign out"
                  aria-label="Your profile and sign out"
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition ${
                    path === profilePath
                      ? "bg-emerald-800 text-white ring-2 ring-emerald-300"
                      : "bg-slate-200 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {initials}
                </Button>
              </>
            ) : (
              <Button onClick={() => go("/signin")} className="btn-primary !min-h-10 !px-4 !py-2 text-xs">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pb-12 md:pt-9">
        {inWorkspace && (
          <aside className="sticky top-28 hidden h-fit w-56 shrink-0 lg:block">
            <p className="eyebrow mb-4 px-3">
              {role === "youth"
                ? "Your workspace"
                : role === "business"
                  ? business?.name
                  : "Admin workspace"}
            </p>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <Button
                  key={t.url}
                  onClick={() => go(t.url)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${
                    path === t.url
                      ? "bg-green-100 text-emerald-700"
                      : "text-stone-500 hover:bg-white"
                  }`}
                >
                  <t.icon size={19} />
                  {t.name}
                </Button>
              ))}
            </nav>
            <div className="my-5 h-px bg-stone-200" />
            {role === "youth" ? (
              <>
                <Button
                  onClick={() => go("/record")}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-stone-500"
                >
                  <BadgeCheck size={19} />
                  Work record
                </Button>
                <Button
                  onClick={() => go("/opportunities")}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-stone-500"
                >
                  <Sparkles size={19} />
                  Opportunities
                </Button>
              </>
            ) : role === "business" ? (
              <>
                <Button
                  onClick={() => go("/business/post")}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-stone-500"
                >
                  <Plus size={19} />
                  Post a placement
                </Button>
                <Button
                  onClick={() => go("/business/onboarding")}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-stone-500"
                >
                  <BriefcaseBusiness size={19} />
                  Business profile
                </Button>
              </>
            ) : null}
          </aside>
        )}
        <main className="min-w-0 flex-1">
          {redirect ? null : path === "/" ? (
            <Landing go={go} role={needsSetup ? null : role} />
          ) : path === "/signin" ? (
            <SignIn store={store} signIn={signIn} go={go} />
          ) : path === "/forgot" ? (
            <ForgotPassword store={store} update={update} go={go} toast={setToast} />
          ) : path === "/signup/youth" || path === "/signup/business" ? (
            <CreateAccount
              role={path === "/signup/youth" ? "youth" : "business"}
              store={store}
              update={update}
              go={go}
              onCreated={(acc) => {
                setSession({ kind: "account", accountId: acc.id })
                go(`/setup/${acc.role}`)
              }}
            />
          ) : path === "/admin-access" ? (
            <AdminAccess
              record={record}
              onGranted={() => {
                setSession({ kind: "admin", until: Date.now() + ADMIN_SESSION_MS })
                go("/admin")
                setToast("Admin access granted for 30 minutes.")
              }}
            />
          ) : path === "/privacy" ? (
            <Privacy go={go} back={role && !needsSetup ? homeFor(role) : "/"} />
          ) : path.startsWith("/shared/") ? (
            store.youth.find((y) => y.id === path.split("/")[2]) ? (
              <WorkRecord
                youth={store.youth.find((y) => y.id === path.split("/")[2])!}
                store={store}
                publicView
              />
            ) : (
              <Empty
                icon={<Shield size={26} />}
                title="Record not found"
                text="This record is not available."
              />
            )
          ) : path === "/setup/youth" && account ? (
            <Signup
              update={update}
              go={go}
              toast={setToast}
              onCreated={(id) => {
                update((s) => {
                  const acc = s.accounts.find((a) => a.id === account.id)
                  if (acc && !acc.profileId) acc.profileId = id
                  return s
                })
              }}
            />
          ) : path === "/setup/business" && account ? (
            <NewBusiness
              store={store}
              update={update}
              onCreated={(id) => {
                update((s) => {
                  const acc = s.accounts.find((a) => a.id === account.id)
                  if (acc && !acc.profileId) acc.profileId = id
                  return s
                })
                go("/business")
              }}
            />
          ) : youth && path === "/matches" ? (
            <Matches
              youth={youth}
              store={store}
              update={update}
              go={go}
              report={report}
              block={block}
              toast={setToast}
              record={record}
            />
          ) : youth && path === "/applications" ? (
            <Applications
              youth={youth}
              store={store}
              go={go}
              report={report}
              block={block}
            />
          ) : youth && path === "/week" ? (
            <MyWeek
              youth={youth}
              store={store}
              update={update}
              report={report}
              block={block}
              toast={setToast}
            />
          ) : youth && path === "/profile" ? (
            <Profile
              youth={youth}
              update={update}
              store={store}
              go={go}
              toast={setToast}
              report={report}
              block={block}
            />
          ) : youth && path === "/record" ? (
            <WorkRecord youth={youth} store={store} go={go} />
          ) : youth && path === "/opportunities" ? (
            <Opportunities youth={youth} go={go} />
          ) : business && path === "/business" ? (
            <Dashboard store={store} business={business} go={go} />
          ) : business && path === "/business/onboarding" ? (
            <BusinessProfile
              business={business}
              update={update}
              toast={setToast}
              go={go}
            />
          ) : business && path === "/business/post" ? (
            <PostPlacement
              business={business}
              update={update}
              go={go}
              toast={setToast}
            />
          ) : business && path === "/business/applicants" ? (
            <Applicants
              store={store}
              business={business}
              update={update}
              toast={setToast}
              record={record}
              report={report}
              block={block}
            />
          ) : business && path === "/business/eti" ? (
            <ETIPage store={store} business={business} record={record} />
          ) : business && path === "/business/ledger" ? (
            <Ledger
              store={store}
              business={business}
              update={update}
              toast={setToast}
              record={record}
              report={report}
              block={block}
            />
          ) : role === "admin" && path.startsWith("/admin") ? (
            <Admin
              path={path}
              store={store}
              update={update}
              go={go}
              reset={() => {
                setStore(seedStore())
                setToast("Demo data reset.")
                go("/admin")
              }}
            />
          ) : (
            <Empty
              icon={<CircleHelp size={28} />}
              title="Page not found"
              text="That page isn't here."
              action={
                <Button className="btn-primary" onClick={() => go(role ? homeFor(role) : "/")}>
                  Go home
                </Button>
              }
            />
          )}
          {role && path === profilePath && !redirect && (
            <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Account</p>
                <p className="truncate text-sm font-semibold">
                  {role === "admin" ? "Admin session (ends after 30 minutes)" : account?.email}
                </p>
              </div>
              <Button onClick={signOut} className="btn-secondary text-sm">
                <LogOut size={16} /> Sign out
              </Button>
              {account && (
                <div className="w-full border-t border-stone-200 pt-4">
                  <ChangePassword account={account} update={update} toast={setToast} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-xl bg-emerald-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-xl md:bottom-6"
        >
          {toast}
        </div>
      )}
      {inWorkspace && (
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-40 flex min-h-18 items-center justify-around border-t border-stone-200 bg-white px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_#1722380A] lg:hidden"
        >
          {tabs.map((t) => (
            <Button
              key={t.url}
              onClick={() => go(t.url)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-xs font-bold ${
                path === t.url ? "text-iris" : "text-stone-400"
              }`}
            >
              <t.icon size={21} strokeWidth={path === t.url ? 2.5 : 2} />
              {t.name}
            </Button>
          ))}
        </nav>
      )}
    </div>
  )
}

function Landing({ go, role }: { go: (p: string) => void; role: Role | null }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl bg-emerald-900 px-7 py-12 text-white md:px-12 md:py-16">
        <div className="absolute -right-14 -top-20 h-80 w-80 rounded-full border-40 border-white/5" />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-green-200">
            <Sparkles size={14} /> A more practical first step
          </div>
          <Heading1 className="heading max-w-xl text-4xl font-extrabold leading-[1.13] md:text-5xl">
            A chance to work.
            <br />
            <span className="serif-accent text-[1.12em] text-champagne">A way forward.</span>
          </Heading1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
            Real work experience for young South Africans, matched by skills and by
            what it costs to get there. A simpler, lower-risk way for local
            businesses to open the door.
          </p>
          {role ? (
            <Button className="btn-champagne mt-7" onClick={() => go(homeFor(role))}>
              Go to my workspace <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              className="btn-champagne mt-7"
              onClick={() => document.getElementById("choose-role")?.scrollIntoView({ behavior: "smooth" })}
            >
              Find your opportunity <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
      {!role && (
        <div className="mt-8 scroll-mt-24" id="choose-role">
          <p className="eyebrow mb-3">Get started</p>
          <Heading2 className="heading mb-5 text-2xl font-extrabold">
            Who are you joining as?
          </Heading2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: "I'm looking for work experience",
                detail: "Find placements near you that you can afford to travel to, and build a verified work record.",
                icon: Users,
                tag: "Young person",
                url: "/signup/youth",
              },
              {
                title: "I'm a business",
                detail: "Post placements, choose who to take on, see the tax incentive you may claim, and sign off weekly work.",
                icon: BriefcaseBusiness,
                tag: "Business",
                url: "/signup/business",
              },
            ].map((item) => (
              <Button
                key={item.tag}
                onClick={() => go(item.url)}
                className="card group flex min-h-48 flex-col items-start p-6 text-left transition hover:-translate-y-1 hover:border-slate-400 hover:shadow-lg"
              >
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-emerald-800">
                  <item.icon size={21} />
                </span>
                <span className="eyebrow mb-1">{item.tag}</span>
                <span className="heading text-lg font-extrabold leading-6">{item.title}</span>
                <span className="mt-2 text-sm text-stone-500">{item.detail}</span>
                <span className="mt-auto flex items-center gap-1 self-end pt-4 text-sm font-bold text-green-700">
                  Create an account <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-5 text-sm text-stone-500">
            Already have an account?{" "}
            <Button className="font-bold text-emerald-800 underline underline-offset-4" onClick={() => go("/signin")}>
              Sign in
            </Button>{" "}
            · Judges can use the demo accounts on the sign-in page.
          </p>
        </div>
      )}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["No approval needed", "The Employment Tax Incentive is claimed by the employer on the monthly EMP201. Nobody has to say yes first."],
          ["Travel-aware matching", "Placements that would eat more than 30% of a stipend in fares are flagged, never hidden."],
          ["Evidence ledger", "Weekly work logged by the young person and signed off by the supervisor: proof for SARS, a record for the CV."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <p className="heading font-extrabold">{t}</p>
            <p className="mt-1 text-sm leading-6 text-stone-500">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 border-t border-stone-200 pt-5 text-xs text-stone-400">
        <Button className="font-semibold underline underline-offset-4" onClick={() => go("/admin-access")}>
          Admin access
        </Button>{" "}
        · <Button className="font-semibold underline underline-offset-4" onClick={() => go("/privacy")}>Privacy</Button>{" "}
        · Prototype: accounts and data are stored in this browser only.
      </p>
    </div>
  )
}

const PROTOTYPE_NOTE =
  "Prototype: accounts and data are stored in this browser only. Production will use server-side sign-in and a database."

function LockedNote({ ms }: { ms: number }) {
  const mins = Math.ceil(ms / 60000)
  return (
    <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-red-700">
      Too many attempts. Try again in {mins} minute{mins === 1 ? "" : "s"}.
    </p>
  )
}

function SignIn({
  store,
  signIn,
  go,
}: {
  store: Store
  signIn: (a: Account) => void
  go: (p: string) => void
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(lockRemaining("signin"))
  const attempt = async (mail: string, pass: string) => {
    const left = lockRemaining("signin")
    if (left) {
      setLocked(left)
      return
    }
    setBusy(true)
    const acc = store.accounts.find((a) => a.email === mail.trim().toLowerCase())
    const ok = !!acc && (await hashPassword(pass, acc.salt)) === acc.hash
    setBusy(false)
    if (!ok || !acc) {
      setLocked(recordFailure("signin"))
      setError("That email and password don't match.")
      return
    }
    clearFailures("signin")
    signIn(acc)
  }
  const demos = store.accounts.filter((a) => a.demo)
  const label = (a: Account) =>
    a.role === "youth"
      ? `${store.youth.find((y) => y.id === a.profileId)?.name.split(" ")[0] || a.email} (youth)`
      : `${store.businesses.find((b) => b.id === a.profileId)?.name || a.email} (business)`
  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1fr_320px]">
      <form
        className="card space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          attempt(email, password)
        }}
      >
        <PageIntro eyebrow="Welcome back" title="Sign in" />
        {locked > 0 && <LockedNote ms={locked} />}
        <Field label="Email">
          <Input id="signin-email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input id="signin-password" className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="btn-primary w-full" disabled={busy || locked > 0}>
          Sign in <ArrowRight size={16} />
        </Button>
        <Button className="text-sm font-bold text-iris underline" onClick={() => go("/forgot")}>
          Forgot password?
        </Button>
        <p className="text-sm text-stone-500">
          New here?{" "}
          <Button className="font-bold text-emerald-800 underline" onClick={() => go("/signup/youth")}>Join as a young person</Button>{" "}
          or{" "}
          <Button className="font-bold text-emerald-800 underline" onClick={() => go("/signup/business")}>as a business</Button>
        </p>
        <p className="text-xs text-stone-400">{PROTOTYPE_NOTE}</p>
      </form>
      <aside className="card h-fit space-y-3 p-5">
        <p className="eyebrow">Demo accounts (fictional)</p>
        <p className="text-xs text-stone-500">
          For judges and testing. Each signs in with the same password check as any account
          (password: {DEMO_PASSWORD}; recovery code for Forgot password: {DEMO_RECOVERY_CODE}).
        </p>
        {demos.map((a) => (
          <Button
            key={a.id}
            className="btn-secondary w-full !justify-start text-left text-xs"
            disabled={busy || locked > 0}
            onClick={() => attempt(a.email, DEMO_PASSWORD)}
          >
            {label(a)}
          </Button>
        ))}
      </aside>
    </div>
  )
}

function CreateAccount({
  role,
  store,
  update,
  go,
  onCreated,
}: {
  role: "youth" | "business"
  store: Store
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  onCreated: (a: Account) => void
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState<{ acc: Account; code: string } | null>(null)
  if (created)
    return (
      <div className="mx-auto max-w-xl">
        <RecoveryCodeCard code={created.code} onDone={() => onCreated(created.acc)} />
      </div>
    )
  return (
    <div className="mx-auto max-w-xl">
      <Button onClick={() => go("/")} className="mb-6 flex items-center gap-2 text-sm font-bold text-green-700">
        <ArrowLeft size={17} /> Back
      </Button>
      <PageIntro
        eyebrow={role === "youth" ? "Young person" : "Business"}
        title="Create your account"
        subtitle={
          role === "youth"
            ? "Next, you'll choose what we may do with your information and build your profile."
            : "Next, you'll tell us about your business. Verification is done by an admin."
        }
      />
      <form
        className="card space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          const mail = email.trim().toLowerCase()
          const problem =
            emailProblem(mail) ||
            newPasswordProblem(password, mail) ||
            (password !== confirm ? "The passwords don't match." : null) ||
            (store.accounts.some((a) => a.email === mail) ? "An account with this email already exists. Sign in instead." : null)
          if (problem) {
            setError(problem)
            return
          }
          setBusy(true)
          const salt = newSalt()
          const code = newRecoveryCode()
          const acc: Account = {
            id: crypto.randomUUID(),
            email: mail,
            role,
            salt,
            hash: await hashPassword(password, salt),
            recoveryHash: await hashRecoveryCode(code, salt),
          }
          setBusy(false)
          update((s) => {
            s.accounts.push(acc)
            s.audit.unshift(audit(mail, `Created a ${role} account`))
            return s
          })
          setPassword("")
          setConfirm("")
          setCreated({ acc, code })
        }}
      >
        <Field label="Email">
          <Input id="signup-email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" hint="At least 8 characters with a letter and a number. Aim for Good or Strong.">
          <Input id="signup-password" className="field" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <StrengthMeter password={password} email={email} />
        </Field>
        <Field label="Confirm password">
          <Input id="signup-confirm" className="field" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="btn-primary w-full" disabled={busy}>
          Continue <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-stone-400">{PROTOTYPE_NOTE}</p>
      </form>
    </div>
  )
}

function StrengthMeter({ password, email = "" }: { password: string; email?: string }) {
  if (!password) return null
  const st = passwordStrength(password, email)
  const colours = ["bg-coral", "bg-coral", "bg-champagne", "bg-iris", "bg-ink"]
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= st.score ? colours[st.score] : "bg-stone-200"}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs font-semibold ${st.score < 2 ? "text-red-700" : "text-stone-600"}`}>
        Password strength: {st.label}
        {st.tips.length > 0 && <span className="font-normal text-stone-500"> · {st.tips.join(" ")}</span>}
      </p>
    </div>
  )
}

function RecoveryCodeCard({ code, onDone }: { code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="card space-y-4 p-6">
      <p className="eyebrow">Save this now</p>
      <Heading2 className="heading text-2xl font-extrabold">Your recovery code</Heading2>
      <p className="text-sm text-stone-600">
        If you forget your password, this code lets you set a new one. We only keep a scrambled copy, so we
        can't show it to you again. Screenshot it or write it down somewhere safe.
      </p>
      <div className="rounded-2xl bg-green-50 p-5 text-center font-mono text-2xl font-extrabold tracking-widest text-emerald-700">
        {code}
      </div>
      <Button
        className="btn-secondary w-full"
        onClick={() => {
          navigator.clipboard?.writeText(code).catch(() => {})
          setSaved(true)
        }}
      >
        <Copy size={16} /> Copy code
      </Button>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I've saved my recovery code
      </label>
      <Button className="btn-primary w-full" disabled={!saved} onClick={onDone}>
        Continue <ArrowRight size={16} />
      </Button>
    </div>
  )
}

function ForgotPassword({
  store,
  update,
  go,
  toast,
}: {
  store: Store
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  toast: (s: string) => void
}) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(lockRemaining("reset")),
    [newCode, setNewCode] = useState("")
  if (newCode)
    return (
      <div className="mx-auto max-w-xl">
        <RecoveryCodeCard
          code={newCode}
          onDone={() => {
            toast("Password changed. Sign in with your new password.")
            go("/signin")
          }}
        />
      </div>
    )
  return (
    <div className="mx-auto max-w-xl">
      <Button onClick={() => go("/signin")} className="mb-6 flex items-center gap-2 text-sm font-bold text-green-700">
        <ArrowLeft size={17} /> Back to sign in
      </Button>
      <PageIntro
        eyebrow="Account help"
        title="Forgot your password?"
        subtitle="Use the recovery code you saved when you created your account. Then you'll get a new code."
      />
      <form
        className="card space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          const left = lockRemaining("reset")
          if (left) {
            setLocked(left)
            return
          }
          const mail = email.trim().toLowerCase()
          const problem =
            newPasswordProblem(password, mail) || (password !== confirm ? "The passwords don't match." : null)
          if (problem) {
            setError(problem)
            return
          }
          setBusy(true)
          const acc = store.accounts.find((a) => a.email === mail)
          const ok = !!acc?.recoveryHash && (await hashRecoveryCode(code, acc.salt)) === acc.recoveryHash
          if (!ok || !acc) {
            setBusy(false)
            setLocked(recordFailure("reset"))
            setError("That email and recovery code don't match.")
            return
          }
          clearFailures("reset")
          const salt = newSalt()
          const fresh = newRecoveryCode()
          const hash = await hashPassword(password, salt)
          const recoveryHash = await hashRecoveryCode(fresh, salt)
          setBusy(false)
          update((s) => {
            const a = s.accounts.find((x) => x.id === acc.id)!
            Object.assign(a, { salt, hash, recoveryHash })
            s.audit.unshift(audit(mail, "Reset password with a recovery code"))
            return s
          })
          setCode("")
          setPassword("")
          setConfirm("")
          setNewCode(fresh)
        }}
      >
        {locked > 0 && <LockedNote ms={locked} />}
        <Field label="Email">
          <Input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Recovery code" hint="12 letters and numbers, like ABCD-EFGH-JKLM.">
          <Input className="field font-mono uppercase" autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value.slice(0, 20))} />
        </Field>
        <Field label="New password">
          <Input className="field" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <StrengthMeter password={password} email={email} />
        </Field>
        <Field label="Confirm new password">
          <Input className="field" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="btn-primary w-full" disabled={busy || locked > 0}>
          Set new password <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-stone-400">
          Lost your recovery code too? In production we'd also send a reset link by email or SMS. This prototype has
          no mail server, so recovery codes keep it secure without one.
        </p>
      </form>
    </div>
  )
}

function ChangePassword({
  account,
  update,
  toast,
}: {
  account: Account
  update: (fn: (s: Store) => Store) => void
  toast: (s: string) => void
}) {
  const [open, setOpen] = useState(false),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [newCode, setNewCode] = useState("")
  if (newCode) return <RecoveryCodeCard code={newCode} onDone={() => { setNewCode(""); setOpen(false) }} />
  if (!open)
    return (
      <div className="flex flex-wrap gap-2">
        <Button className="btn-secondary text-sm" onClick={() => setOpen(true)}>
          <KeyRound size={16} /> Strengthen or change password
        </Button>
      </div>
    )
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const left = lockRemaining("change")
        if (left) return setError("Too many wrong tries. Wait a few minutes.")
        const problem =
          newPasswordProblem(password, account.email) ||
          (password !== confirm ? "The new passwords don't match." : null) ||
          (password === current ? "Choose a different password from your current one." : null)
        if (problem) return setError(problem)
        setBusy(true)
        if ((await hashPassword(current, account.salt)) !== account.hash) {
          setBusy(false)
          recordFailure("change")
          return setError("Your current password isn't right.")
        }
        clearFailures("change")
        const salt = newSalt()
        const fresh = newRecoveryCode()
        const hash = await hashPassword(password, salt)
        const recoveryHash = await hashRecoveryCode(fresh, salt)
        setBusy(false)
        update((s) => {
          const a = s.accounts.find((x) => x.id === account.id)!
          Object.assign(a, { salt, hash, recoveryHash })
          s.audit.unshift(audit(account.email, "Changed password"))
          return s
        })
        setCurrent("")
        setPassword("")
        setConfirm("")
        setError("")
        toast("Password changed. Save your new recovery code.")
        setNewCode(fresh)
      }}
    >
      <Field label="Current password">
        <Input className="field" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password">
        <Input className="field" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <StrengthMeter password={password} email={account.email} />
      </Field>
      <Field label="Confirm new password">
        <Input className="field" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="btn-primary text-sm" disabled={busy}>Save new password</Button>
        <Button className="btn-secondary text-sm" onClick={() => { setOpen(false); setError("") }}>Cancel</Button>
      </div>
    </form>
  )
}

function AdminAccess({
  record,
  onGranted,
}: {
  record: (actor: string, action: string) => void
  onGranted: () => void
}) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [locked, setLocked] = useState(lockRemaining("admin")),
    [busy, setBusy] = useState(false)
  return (
    <div className="mx-auto max-w-md">
      <PageIntro
        eyebrow="Restricted"
        title="Admin access"
        subtitle="Admins can't sign up. Enter the admin code you were given."
      />
      <form
        className="card space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          const left = lockRemaining("admin")
          if (left) {
            setLocked(left)
            return
          }
          setBusy(true)
          const ok = await isAdminCode(code)
          setBusy(false)
          setCode("")
          if (!ok) {
            setLocked(recordFailure("admin"))
            record("Unknown visitor", "Failed admin code attempt")
            setError("That code isn't right.")
            return
          }
          clearFailures("admin")
          record("Admin", "Admin signed in with the admin code")
          onGranted()
        }}
      >
        {locked > 0 && <LockedNote ms={locked} />}
        <Field label="Admin code">
          <Input id="admin-code" className="field" type="password" autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="btn-primary w-full" disabled={busy || locked > 0}>
          Open admin workspace
        </Button>
        <p className="text-xs text-stone-400">
          5 wrong attempts lock this form for 5 minutes. Admin sessions end after 30 minutes. {PROTOTYPE_NOTE}
        </p>
      </form>
    </div>
  )
}

function Privacy({ go, back }: { go: (p: string) => void; back: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Button
        className="mb-7 flex items-center gap-2 text-sm font-bold text-green-700"
        onClick={() => go(back)}
      >
        <ArrowLeft size={17} /> Back
      </Button>
      <PageIntro
        eyebrow="Your information"
        title="Privacy, in plain words."
        subtitle="You should know what happens to your information before you share it."
      />
      <div className="card space-y-7 p-6 md:p-9">
        {[
          [
            "What we collect",
            "Your name, date of birth, approximate location, skills, profile details, applications and weekly work records. Businesses provide their details and placement information.",
          ],
          [
            "Why we use it",
            "To suggest nearby placements, help people manage applications and keep a verified work record. We use information to estimate travel and the Employment Tax Incentive.",
          ],
          [
            "Your ID number",
            "You type your South African ID number once so we can check your date of birth. We keep only your date of birth. We never store your ID number.",
          ],
          [
            "Who decides",
            "Matching suggests opportunities and explains why. People decide whether to apply, shortlist or accept. There are no automatic rejections or acceptances.",
          ],
          [
            "What businesses see",
            "A business sees your first name, age, skills and suburb when you apply. It does not see your exact address or ID number.",
          ],
          [
            "Sharing and deletion",
            "Your work record is shareable only if you choose to make it shareable. To ask for your information to be deleted in this prototype, contact the Opportunity Bridge team through the app administrator. This demo stores data in this browser; the Admin reset button clears it.",
          ],
          [
            "Accounts and access",
            "Passwords and the admin code are stored only as salted SHA-256 hashes. Each account can only open its own role's pages, and repeated wrong attempts lock the form for 5 minutes. Prototype: accounts and data are stored in this browser only. Production will use server-side sign-in and a database.",
          ],
        ].map(([h, p]) => (
          <section key={h}>
            <Heading2 className="heading mb-2 text-lg font-extrabold">
              {h}
            </Heading2>
            <p className="text-sm leading-7 text-stone-500">{p}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

function Signup({
  update,
  go,
  toast,
  onCreated,
}: {
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  toast: (s: string) => void
  onCreated: (id: string) => void
}) {
  const [step, setStep] = useState(0)
  const [processing, setProcessing] = useState(false),
    [matching, setMatching] = useState(false),
    [sharing, setSharing] = useState(false)
  const [id, setId] = useState(""),
    [error, setError] = useState(""),
    [dob, setDob] = useState("")
  const [name, setName] = useState(""),
    [suburb, setSuburb] = useState(""),
    [point, setPoint] = useState<Point>({ lat: -26.189, lng: 28.05 })
  const [transport, setTransport] = useState<TravelMode>("taxi"),
    [grade, setGrade] = useState(12),
    [bio, setBio] = useState(""),
    [skills, setSkills] = useState<string[]>([]),
    [skillInput, setSkillInput] = useState("")
  const suggestions = [
    "customer service",
    "excel",
    "baking",
    "phone repair",
    "graphic design",
    "canva",
    "social media",
    "stock taking",
  ].filter((s) => bio.toLowerCase().includes(s) && !skills.includes(s))
  return (
    <div className="mx-auto max-w-2xl">
      <PageIntro
        eyebrow={`Step ${step + 1} of 2`}
        title={step === 0 ? "First, your choice." : "Tell us about yourself."}
        subtitle={
          step === 0
            ? "Your information is yours. Choose what you are comfortable with before creating a profile."
            : "A few details help us suggest opportunities that fit."
        }
      />
      {step === 0 ? (
        <div className="card space-y-4 p-6">
          <label className="flex gap-3 rounded-xl border border-stone-200 p-4">
            <Input
              type="checkbox"
              checked={processing}
              onChange={(e) => setProcessing(e.target.checked)}
            />
            <span>
              <strong className="block text-sm">Process my information</strong>
              <small className="text-stone-500">
                Needed to create your profile and manage applications.
              </small>
            </span>
          </label>
          <label className="flex gap-3 rounded-xl border border-stone-200 p-4">
            <Input
              type="checkbox"
              checked={matching}
              onChange={(e) => setMatching(e.target.checked)}
            />
            <span>
              <strong className="block text-sm">
                AI-assisted matching <Pill tone="grey">Coming soon</Pill>
              </strong>
              <small className="text-stone-500">
                Matching currently uses skill overlap. AI will only suggest;
                people will decide.
              </small>
            </span>
          </label>
          <label className="flex gap-3 rounded-xl border border-stone-200 p-4">
            <Input
              type="checkbox"
              checked={sharing}
              onChange={(e) => setSharing(e.target.checked)}
            />
            <span>
              <strong className="block text-sm">
                Make my work record shareable{" "}
                <span className="font-normal">(optional)</span>{" "}
                <Pill tone="grey">Public links Coming soon</Pill>
              </strong>
              <small className="text-stone-500">
                Preview in this browser only for now. Public links are coming
                soon. No contact details or date of birth appear on the record.
              </small>
            </span>
          </label>
          <Button
            onClick={() => go("/privacy")}
            className="text-sm font-bold text-emerald-800 underline"
          >
            Read our privacy note
          </Button>
          <Button
            disabled={!processing}
            onClick={() => setStep(1)}
            className="btn-primary w-full"
          >
            Continue <ArrowRight size={17} />
          </Button>
        </div>
      ) : (
        <form
          className="card space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) {
              setError("Add your full name.")
              return
            }
            const date = birthDateFromSAID(id)
            if (!date) {
              setError(
                id.length < 13
                  ? `Your ID number needs 13 digits (you've entered ${id.length}).`
                  : "That ID number doesn't check out. Check each digit and try again.",
              )
              return
            }
            if (!suburb) {
              setError("Choose your home suburb: type it and tap a suggestion, or use the location arrow.")
              return
            }
            if (name.trim().length > LIMITS.nameMax) {
              setError(`Keep your name under ${LIMITS.nameMax} characters.`)
              return
            }
            const ageProblem = youthAgeProblem(ageOn(date, new Date()))
            if (ageProblem) {
              setError(ageProblem)
              return
            }
            setDob(date)
            setId("") // the ID number is never kept
            const newId = crypto.randomUUID()
            update((s) => {
              s.youth.push({
                id: newId,
                name: name.trim(),
                dob: date,
                suburb,
                location: point,
                province: provinceOf({ location: point }),
                transport,
                skills,
                grade,
                bio: bio.slice(0, LIMITS.bioMax),
                consent: {
                  processing: new Date().toISOString(),
                  ...(matching ? { matching: new Date().toISOString() } : {}),
                  ...(sharing ? { sharing: new Date().toISOString() } : {}),
                },
              })
              s.audit.unshift(audit(name.trim(), "Created a youth profile"))
              return s
            })
            onCreated(newId)
            toast("Profile created. Your ID number was not saved.")
            go("/matches")
          }}
        >
          <Field label="Your full name">
            <Input
              className="field"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </Field>
          <Field label="SA ID number" hint="We only keep your date of birth.">
            <Input
              className="field"
              required
              value={id}
              onChange={(e) =>
                setId(e.target.value.replace(/\D/g, "").slice(0, 13))
              }
              inputMode="numeric"
              autoComplete="off"
              placeholder="13 digits"
            />
          </Field>
          {id.length > 0 && id.length < 13 && (
            <p className="-mt-3 text-xs text-stone-500">{id.length} of 13 digits</p>
          )}
          {id.length === 13 &&
            (birthDateFromSAID(id) ? (
              <p className="-mt-3 text-xs font-semibold text-green-700">
                ✓ Valid ID · born {birthDateFromSAID(id)}
              </p>
            ) : (
              <p className="-mt-3 text-xs font-semibold text-red-700">
                This ID number doesn't check out. Check each digit.
              </p>
            ))}
          <Field label="Home suburb">
            <LocationPicker
              value={suburb}
              onChange={(name, p) => {
                setSuburb(name)
                setPoint(p)
              }}
            />
          </Field>
          <Field label="How do you usually travel?">
            <Select
              className="field"
              value={transport}
              onChange={(e) => setTransport(e.target.value as TravelMode)}
            >
              {Object.entries(MODES).map(([mode, config]) => (
                <option key={mode} value={mode}>
                  {config.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Highest grade completed">
            <Select
              className="field"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  Grade {i}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Short bio">
            <Textarea
              className="field min-h-24"
              value={bio}
              maxLength={2000}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us what you can do in your own words"
            />
          </Field>
          <div>
            <span className="label">Skills you confirm</span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Button
                  type="button"
                  className="chip"
                  key={s}
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                >
                  {s} <X size={13} />
                </Button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                className="field"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
              />
              <Button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (
                    skillInput.trim() &&
                    !skills.includes(skillInput.trim().toLowerCase())
                  )
                    setSkills([...skills, skillInput.trim().toLowerCase()])
                  setSkillInput("")
                }}
              >
                Add
              </Button>
            </div>
            {suggestions.length > 0 && (
              <p className="mt-2 text-xs text-stone-500">
                Suggested from your words (confirm to add):{" "}
                {suggestions.map((s) => (
                  <Button
                    type="button"
                    onClick={() => setSkills([...skills, s])}
                    className="chip m-1"
                    key={s}
                  >
                    + {s}
                  </Button>
                ))}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button className="btn-primary w-full" type="submit">
            Save profile <ArrowRight size={17} />
          </Button>
        </form>
      )}
    </div>
  )
}

function Matches({
  youth,
  store,
  update,
  go,
  report,
  block,
  toast,
  record,
}: {
  youth: Youth
  store: Store
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  report: (target: string, by: string) => void
  block: (target: string) => void
  toast: (s: string) => void
  record: (actor: string, action: string) => void
}) {
  const [radius, setRadius] = useTabState(`radius-${youth.id}`, 10),
    [mode, setMode] = useTabState<"list" | "map">(`mode-${youth.id}`, "list"),
    [transport, setTransport] = useTabState<TravelMode>(`transport-${youth.id}`, youth.transport),
    [furtherOpen, setFurtherOpen] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [tileFailed, setTileFailed] = useState(false),
    [area, setArea] = useTabState<"near" | Province>(`area-${youth.id}`, () => provinceOf(youth)),
    [nearPoint, setNearPoint] = useTabState<Point | null>(`near-${youth.id}`, null),
    [nearName, setNearName] = useTabState(`near-name-${youth.id}`, ""),
    [locating, setLocating] = useState(false)
  const origin = nearPoint || youth.location
  const originName = nearPoint ? nearName : youth.suburb
  const useNearMe = () => {
    if (!navigator.geolocation) {
      toast("Location isn't available in this browser. Choose a province instead.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = {
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lng: Math.round(pos.coords.longitude * 1000) / 1000,
        }
        const found = await describePoint(point)
        setNearPoint(point)
        setNearName(found.name)
        setArea("near")
        setLocating(false)
        toast(`Showing opportunities near ${found.name}.`)
      },
      () => {
        setLocating(false)
        toast("Location permission wasn't given. Showing your home area instead.")
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }
  const saved = store.savedPlacements?.[youth.id] || []
  const results = useMemo(
    () =>
      store.placements
        .filter(
          (p) =>
            !store.blocked.includes(p.id) &&
            !store.blocked.includes(p.businessId) &&
            (area === "near" || provinceOf(p) === area),
        )
        .map((p) => {
          const b = store.businesses.find((b) => b.id === p.businessId)!
          return {
            p,
            b,
            result: rankMatch({ ...youth, location: origin, transport }, {
              ...p,
              location: p.location,
              stipend: p.stipend,
            }),
          }
        })
        .sort((a, b) => b.result.score - a.result.score),
    [store.placements, store.blocked, store.businesses, youth, transport, area, origin],
  )
  const nearby =
      area === "near" ? results.filter((r) => r.result.travel.directKm <= radius) : results,
    further = area === "near" ? results.filter((r) => r.result.travel.directKm > radius) : []
  const apply = (placement: Placement) => {
    const problem = canApply({ role: "youth", youthId: youth.id }, placement.id, store)
    if (problem) {
      toast(problem)
      return
    }
    update((s) => {
      s.applications.unshift({
        id: crypto.randomUUID(),
        youthId: youth.id,
        placementId: placement.id,
        status: "Applied",
        date: today(),
      })
      s.audit.unshift(audit(youth.name, `Applied to ${placement.title}`))
      return s
    })
    toast("Application sent. The business will decide what happens next.")
  }
  const card = ({ p, b, result }: typeof results[number]) => {
    const t = result.travel
    const applied = store.applications.some(
      (a) => a.youthId === youth.id && a.placementId === p.id,
    )
    return (
      <article key={p.id} id={`match-${p.id}`} className="card overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <BusinessPhoto business={b} size={52} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500">{b.name}</p>
                <Heading3 className="heading mt-0.5 text-lg font-extrabold leading-snug">
                  {p.title}
                </Heading3>
                <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                  <MapPin size={13} /> {b.suburb} · {t.directKm.toFixed(1)} km
                  away
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-green-100 px-3 py-2 text-center text-emerald-800">
              <strong className="heading text-xl font-extrabold">
                {result.percent}%
              </strong>
              <span className="block text-xs font-bold">match</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill>
              <BadgeCheck size={12} /> {b.tier}
            </Pill>
            {t.unaffordable && <Pill tone="red">Travel cost flagged</Pill>}
            {t.outOfRange && (
              <Pill tone="amber">
                Beyond {MODES[transport].maxKm} km by {transport}
              </Pill>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            <span className="font-bold text-emerald-900">Why this match: </span>
            {result.why}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Monthly stipend
              </p>
              <strong className="heading text-xl font-extrabold">
                {money(p.stipend)}
                <span className="text-xs font-medium text-stone-400">
                  {" "}
                  / month
                </span>
              </strong>
            </div>
            <div className="text-right text-xs text-stone-500">
              {p.duration} months · {p.hours} h/month
            </div>
          </div>
          <div
            className={`mt-4 flex items-center gap-3 rounded-xl p-3.5 ${
              t.unaffordable || t.outOfRange ? "bg-orange-50" : "bg-green-50"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ${
                t.unaffordable || t.outOfRange
                  ? "text-amber-700"
                  : "text-green-700"
              }`}
            >
              <Navigation size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">
                {t.unaffordable
                  ? `Travel eats ${Math.round(t.share * 100)}% of your stipend`
                  : t.outOfRange
                    ? "This trip is beyond the estimated range"
                    : "Travel looks within budget"}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {t.minutes} min one way, est. · {money(t.monthlyCost)}/month
                est. · {Math.round(t.share * 100)}% of stipend
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            Travel and fare estimates are for ranking, not real fares.{" "}
            {estimateNote}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-white px-5 py-3 md:px-6">
          <Button
            className="btn-primary !min-h-10 !px-4 !py-2 text-xs"
            disabled={applied}
            onClick={() => apply(p)}
          >
            {applied ? (
              <>
                <Check size={15} /> Applied
              </>
            ) : (
              <>
                Apply now <ArrowRight size={15} />
              </>
            )}
          </Button>
          <Link
            className="btn-secondary !min-h-10 !px-3 !py-2 text-xs"
            target="_blank"
            rel="noopener"
            href={`https://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${p.location.lat},${p.location.lng}&dirflg=${
              transport === "walk" ? "w" : "r"
            }`}
          >
            Directions in Apple Maps <ExternalLink size={13} />
          </Link>
          <Button
            title="Save"
            aria-label={`Save ${p.title}`}
            className={`ml-auto p-2 ${
              saved.includes(p.id) ? "text-green-700" : "text-stone-500"
            }`}
            onClick={() => {
              const wasSaved = saved.includes(p.id)
              update((s) => ({
                ...s,
                savedPlacements: {
                  ...s.savedPlacements,
                  [youth.id]: wasSaved
                    ? saved.filter((x) => x !== p.id)
                    : [...saved, p.id],
                },
              }))
              toast(wasSaved ? "Removed from saved." : "Saved in this browser.")
            }}
          >
            <Heart
              size={17}
              fill={saved.includes(p.id) ? "currentColor" : "none"}
            />
          </Button>
          <Button
            title="Report"
            aria-label={`Report ${p.title}`}
            className="p-2 text-stone-500"
            onClick={() => report(p.title, youth.name)}
          >
            <Flag size={17} />
          </Button>
          <Button
            title="Block"
            className="text-xs font-semibold text-stone-500"
            onClick={() => block(p.id)}
          >
            Block
          </Button>
        </div>
      </article>
    )
  }
  return (
    <>
      <div className="mb-7 overflow-hidden rounded-3xl bg-emerald-900 px-6 py-8 text-white md:px-9 md:py-9">
        <div className="relative z-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">
            Your next step starts here
          </p>
          <Heading1 className="heading text-3xl font-extrabold md:text-4xl">
            Good morning, {youth.name.split(" ")[0]}.
          </Heading1>
          <p className="mt-2 text-sm text-green-200">
            Let's find a place where your skills can grow.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              <MapPin size={12} className="mr-1 inline" />
              {area === "near" ? originName : area}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              {results.length} opportunities
            </span>
          </div>
        </div>
      </div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Explore opportunities</p>
          <Heading2 className="heading text-2xl font-extrabold">
            Matches for you{" "}
            <span className="text-stone-400">({nearby.length})</span>
          </Heading2>
        </div>
        <div className="hidden items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 sm:flex">
          <Button
            onClick={() => setMode("list")}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
              mode === "list"
                ? "bg-emerald-50 text-emerald-800"
                : "text-stone-500"
            }`}
          >
            <List size={15} /> List
          </Button>
          <Button
            disabled={store.dataSaver || tileFailed}
            onClick={() => {
              setMode("map")
              record(youth.name, "Viewed map matches")
            }}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
              mode === "map"
                ? "bg-emerald-50 text-emerald-800"
                : "text-stone-500"
            }`}
          >
            <MapIcon size={15} /> Map
          </Button>
        </div>
      </div>
      <div className="card mb-5 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal size={17} className="text-green-700" /> Find your
          fit
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <span className="mb-2 block text-xs font-semibold text-slate-600">Search area</span>
            <Select
              aria-label="Search area"
              className="field"
              value={area}
              onChange={(e) => setArea(e.target.value as "near" | Province)}
            >
              <option value="near">Near {originName} (choose a radius)</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  All of {p}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            className="btn-secondary self-end"
            disabled={locating}
            onClick={useNearMe}
          >
            <Navigation size={16} /> {locating ? "Finding you…" : "Near me"}
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {area === "near" ? (
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="font-semibold text-slate-600">
                Search radius
              </span>
              <strong className="text-emerald-800">{radius} km</strong>
            </div>
            <Input
              aria-label="Search radius"
              type="range"
              min="2"
              max="25"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-stone-400">
              <span>2 km</span>
              <span>25 km</span>
            </div>
          </div>
          ) : (
            <p className="self-center rounded-xl bg-green-50 px-4 py-3 text-xs font-semibold text-emerald-800">
              Showing every opportunity in {area}. Travel is estimated from {originName}.
            </p>
          )}
          <div>
            <span className="mb-2 block text-xs font-semibold text-slate-600">
              How you travel
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MODES) as TravelMode[]).map((m) => (
                <Button
                  key={m}
                  onClick={() => setTransport(m)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    m === transport
                      ? "bg-emerald-800 text-white"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {m === "taxi"
                    ? "Taxi"
                    : m === "train"
                      ? "Train"
                      : MODES[m].label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <label className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-slate-600">
          <span>
            Data saver{" "}
            <span className="font-normal text-stone-400">
              (list only, no map tiles)
            </span>
          </span>
          <Input
            type="checkbox"
            checked={store.dataSaver}
            onChange={(e) => {
              update((s) => {
                s.dataSaver = e.target.checked
                return s
              })
              if (e.target.checked) setMode("list")
            }}
          />
        </label>
      </div>
      <div className="mb-4 flex gap-1 rounded-xl border border-stone-200 bg-white p-1 sm:hidden">
        <Button
          onClick={() => setMode("list")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${
            mode === "list"
              ? "bg-emerald-50 text-emerald-800"
              : "text-stone-500"
          }`}
        >
          <List size={16} /> List view
        </Button>
        <Button
          disabled={store.dataSaver || tileFailed}
          onClick={() => setMode("map")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${
            mode === "map" ? "bg-emerald-50 text-emerald-800" : "text-stone-500"
          }`}
        >
          <MapIcon size={16} /> Map view
        </Button>
      </div>
      {(store.dataSaver || tileFailed) && (
        <div className="mb-4 rounded-xl bg-stone-100 px-4 py-3 text-xs text-stone-500">
          {store.dataSaver
            ? "Data saver is on. Map tiles are hidden."
            : "Map tiles could not load. Showing the list instead."}
        </div>
      )}
      {mode === "map" && !store.dataSaver && !tileFailed ? (
        <div className="mb-5">
          <MatchMap
            center={area === "near" ? origin : PROVINCE_CENTRES[area]}
            radius={area === "near" ? radius : 0}
            zoom={area === "near" ? 11 : 9}
            pins={results.map((r) => ({
              id: r.p.id,
              name: r.p.title,
              point: r.p.location,
              affordable:
                !r.result.travel.unaffordable && !r.result.travel.outOfRange,
              outside: area === "near" && r.result.travel.directKm > radius,
            }))}
            onPick={(id) => setSelected(id)}
            onTileError={() => {
              setTileFailed(true)
              setMode("list")
            }}
          />
          <p className="mt-2 text-xs text-stone-400">
            Approximate location only · Green: affordable · Amber: flagged ·
            Grey: outside radius
          </p>
          {selected && (
            <div className="mt-4">
              {results.filter((r) => r.p.id === selected).map(card)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {nearby.length ? (
            nearby.map(card)
          ) : (
            <Empty
              icon={<Search size={26} />}
              title={area === "near" ? "No matches in this radius" : `No opportunities in ${area} yet`}
              text={
                area === "near"
                  ? "Try a wider search radius. Opportunities further away are still shown below."
                  : "Try another province, or search near you."
              }
            />
          )}
        </div>
      )}
      <div className="mt-5 rounded-2xl border border-stone-300 bg-green-50 p-5">
        <div className="flex gap-3">
          <Heart size={20} className="shrink-0 text-green-700" />
          <div>
            <Heading3 className="heading text-sm font-extrabold">
              Our fair travel pledge
            </Heading3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              We flag trips when estimated travel costs more than{" "}
              {Math.round(TRAVEL_AFFORDABILITY_THRESHOLD * 100)}% of your
              stipend. We don't hide them; the choice stays with you.
            </p>
          </div>
        </div>
      </div>
      {further.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={() => setFurtherOpen(!furtherOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 text-left text-sm font-bold"
          >
            Further away ({further.length}){" "}
            <ChevronDown
              className={furtherOpen ? "rotate-180" : ""}
              size={18}
            />
          </Button>
          {furtherOpen && (
            <div className="mt-4 space-y-4">{further.map(card)}</div>
          )}
        </div>
      )}
    </>
  )
}

function Applications({
  youth,
  store,
  go,
  report,
  block,
}: {
  youth: Youth
  store: Store
  go: (p: string) => void
  report: (t: string, b: string) => void
  block: (t: string) => void
}) {
  const apps = store.applications.filter((a) => a.youthId === youth.id)
  return (
    <>
      <PageIntro
        eyebrow="Your journey"
        title="Applications"
        subtitle="Every application is a step forward. Keep track of what happens next."
      />
      {apps.length ? (
        <div className="space-y-3">
          {apps.map((a) => {
            const p = store.placements.find((x) => x.id === a.placementId)!
            const b = store.businesses.find((x) => x.id === p.businessId)!
            return (
              <div
                className="card flex flex-wrap items-center justify-between gap-4 p-5"
                key={a.id}
              >
                <div>
                  <div className="mb-2">
                    <Pill
                      tone={
                        a.status === "Accepted"
                          ? "green"
                          : a.status === "Declined"
                            ? "grey"
                            : "amber"
                      }
                    >
                      {a.status}
                    </Pill>
                  </div>
                  <Heading2 className="heading text-lg font-extrabold">
                    {p.title}
                  </Heading2>
                  <p className="text-xs text-stone-500">
                    {b.name} · {b.suburb} · Applied {a.date}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    {money(p.stipend)}/month. {estimateNote}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => report(p.title, youth.name)}
                    className="btn-secondary !px-3 text-xs"
                  >
                    <Flag size={14} /> Report
                  </Button>
                  <Button
                    onClick={() => block(p.id)}
                    className="btn-secondary !px-3 text-xs"
                  >
                    Block
                  </Button>
                  {a.status === "Accepted" && (
                    <Button
                      onClick={() => go("/week")}
                      className="btn-primary text-xs"
                    >
                      Log your week <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty
          icon={<FileText size={27} />}
          title="No applications yet"
          text="When you apply for a placement, you can follow its progress here."
          action={
            <Button className="btn-primary" onClick={() => go("/matches")}>
              Explore matches <ArrowRight size={16} />
            </Button>
          }
        />
      )}
    </>
  )
}

function MyWeek({
  youth,
  store,
  update,
  report,
  block,
  toast,
}: {
  youth: Youth
  store: Store
  update: (fn: (s: Store) => Store) => void
  report: (t: string, b: string) => void
  block: (t: string) => void
  toast: (s: string) => void
}) {
  const engagements = store.applications.filter(
    (a) => a.youthId === youth.id && a.status === "Accepted",
  )
  const [applicationId, setApplicationId] = useState(""),
    [days, setDays] = useState([0, 0, 0, 0, 0, 0, 0]),
    [work, setWork] = useState(""),
    [skills, setSkills] = useState<string[]>([]),
    [weekStart, setWeekStart] = useState(mondayOf(new Date())),
    [weekError, setWeekError] = useState("")
  const chosen =
    engagements.find((a) => a.id === applicationId) || engagements[0]
  const placement =
    chosen && store.placements.find((p) => p.id === chosen.placementId)
  const business =
    placement && store.businesses.find((b) => b.id === placement.businessId)
  const weeks = store.weeks
    .filter((w) => engagements.some((a) => a.id === w.applicationId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return (
    <>
      <PageIntro
        eyebrow="Evidence ledger"
        title="My Week"
        subtitle="Keep a simple record of the real work you do. Your supervisor can sign off each week."
      />
      {!chosen ? (
        <Empty
          icon={<CalendarDays size={27} />}
          title="Your work story starts here"
          text="Once a business accepts your application, you can log your hours and what you did each week."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <form
              className="card space-y-5 p-5 md:p-6"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!chosen) return
                const problem =
                  canLogWeek({ role: "youth", youthId: youth.id }, chosen) ||
                  validateWeek(
                    { days, work, weekStart },
                    store.weeks.filter((w) => w.applicationId === chosen.id),
                  )
                if (problem) {
                  setWeekError(problem)
                  return
                }
                // The server checks the same labour rules again before the week is saved.
                const verdict = await api<WeekVerdict>("week", { days }, 3000)
                if (verdict && !verdict.allowed) {
                  setWeekError(verdict.errors[0] || "The server refused this week.")
                  return
                }
                setWeekError("")
                update((s) => {
                  s.weeks.unshift({
                    id: crypto.randomUUID(),
                    applicationId: chosen.id,
                    weekStart,
                    days,
                    work: work.trim().slice(0, LIMITS.workNotesMax),
                    skills,
                    status: "Submitted",
                    submittedAt: new Date().toISOString(),
                  })
                  s.audit.unshift(
                    audit(
                      youth.name,
                      `Submitted a week for ${placement?.title}`,
                    ),
                  )
                  return s
                })
                setDays([0, 0, 0, 0, 0, 0, 0])
                setWork("")
                setSkills([])
                toast(
                  verdict
                    ? "Week checked by the server and sent for supervisor sign-off."
                    : "Week submitted for supervisor sign-off.",
                )
              }}
            >
              <div>
                <Heading2 className="heading text-lg font-extrabold">
                  Log a new week
                </Heading2>
                <p className="mt-1 text-xs text-stone-500">
                  {business?.name} · {placement?.title}
                </p>
              </div>
              {engagements.length > 1 && (
                <Field label="Placement">
                  <Select
                    className="field"
                    value={chosen.id}
                    onChange={(e) => setApplicationId(e.target.value)}
                  >
                    {engagements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {
                          store.placements.find((p) => p.id === a.placementId)
                            ?.title
                        }
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Week starting (Monday)" hint="You can log this week or earlier weeks, once each.">
                <Input
                  id="week-start"
                  className="field"
                  type="date"
                  max={mondayOf(new Date())}
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </Field>
              <div>
                <span className="label">Hours each day</span>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day, i) => (
                      <label
                        key={day}
                        className="text-center text-xs font-semibold text-stone-500"
                      >
                        {day}
                        <Input
                          className="field mt-1 !px-2 text-center"
                          type="number"
                          min="0"
                          max={LIMITS.maxHoursPerDay}
                          step="0.5"
                          value={days[i]}
                          onChange={(e) =>
                            setDays(
                              days.map((d, j) =>
                                j === i ? Number(e.target.value) : d,
                              ),
                            )
                          }
                        />
                      </label>
                    ),
                  )}
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Total: {days.reduce((a, b) => a + b, 0)} hours
                  {(() => {
                    const c = checkWorkWeek(days)
                    return c.total > 0 ? ` · ${c.ordinary} ordinary · ${c.overtime} overtime` : ""
                  })()}
                </p>
                {(() => {
                  const c = checkWorkWeek(days)
                  return (
                    <div className="mt-2 space-y-1">
                      {c.errors.map((e) => (
                        <p key={e} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-red-700">{e}</p>
                      ))}
                      {c.warnings.map((w) => (
                        <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{w}</p>
                      ))}
                      <p className="text-xs text-stone-400">
                        Legal limits (BCEA): 45 ordinary hours a week, overtime only by agreement (max 3 a day, 10 a week), at least one full day off.
                      </p>
                    </div>
                  )
                })()}
              </div>
              <Field label="What did you do?">
                <Textarea
                  required
                  maxLength={LIMITS.workNotesMax}
                  value={work}
                  onChange={(e) => setWork(e.target.value)}
                  className="field min-h-28"
                  placeholder="Describe the work you actually did this week"
                />
              </Field>
              <div>
                <span className="label">Skills practised</span>
                <div className="flex flex-wrap gap-2">
                  {youth.skills.map((s) => (
                    <Button
                      type="button"
                      key={s}
                      onClick={() =>
                        setSkills(
                          skills.includes(s)
                            ? skills.filter((x) => x !== s)
                            : [...skills, s],
                        )
                      }
                      className={`chip ${
                        skills.includes(s)
                          ? "!bg-emerald-100 !text-emerald-800"
                          : ""
                      }`}
                    >
                      {skills.includes(s) && <Check size={13} />}
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              {weekError && <p className="text-sm text-red-700">{weekError}</p>}
              <Button type="submit" className="btn-primary w-full">
                Submit week <ArrowRight size={16} />
              </Button>
            </form>
            <div className="flex items-center justify-between">
              <Heading2 className="heading text-lg font-extrabold">
                Your weekly entries
              </Heading2>
              <span className="text-xs text-stone-500">
                {weeks.length} total
              </span>
            </div>
            {weeks.length ? (
              weeks.map((w) => <WeekCard key={w.id} week={w} />)
            ) : (
              <p className="text-sm text-stone-500">No weeks submitted yet.</p>
            )}
          </div>
          <aside className="space-y-4">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-green-700">
                <BadgeCheck size={21} />
                <strong className="heading">Build your work record</strong>
              </div>
              <p className="text-sm leading-6 text-stone-500">
                Each signed-off week adds to a verified record of the work
                you've done.
              </p>
            </div>
            <Button
              className="btn-secondary w-full"
              onClick={() =>
                report(placement?.title || "Placement", youth.name)
              }
            >
              <Flag size={15} /> Report placement
            </Button>
            <Button
              className="text-xs font-bold text-stone-500"
              onClick={() => block(placement?.id || "")}
            >
              Block placement
            </Button>
          </aside>
        </div>
      )}
    </>
  )
}

function WeekCard({ week }: { week: Week }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-stone-500">
            {week.weekStart ? `Week of ${week.weekStart} · ` : ""}Submitted {prettyDate(week.submittedAt)}
          </p>
          <p className="mt-1 font-bold">
            {week.days.reduce((a, b) => a + b, 0)} hours worked
          </p>

        </div>
        <Pill
          tone={
            week.status === "Signed off"
              ? "green"
              : week.status === "Queried"
                ? "red"
                : "amber"
          }
        >
          {week.status}
        </Pill>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-500">{week.work}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {week.skills.map((s) => (
          <span className="chip" key={s}>
            {s}
          </span>
        ))}
      </div>
      {week.signedAt && (
        <p className="mt-3 text-xs text-green-700">
          Signed off by {week.supervisor}, {prettyDate(week.signedAt)}
        </p>
      )}
      {week.query && (
        <p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs">
          Supervisor query: {week.query}
        </p>
      )}
    </div>
  )
}

function Profile({
  youth,
  update,
  store,
  go,
  toast,
  report,
  block,
}: {
  youth: Youth
  update: (fn: (s: Store) => Store) => void
  store: Store
  go: (p: string) => void
  toast: (s: string) => void
  report: (t: string, b: string) => void
  block: (t: string) => void
}) {
  const [editing, setEditing] = useState(false),
    [bio, setBio] = useState(youth.bio),
    [grade, setGrade] = useState(youth.grade),
    [suburb, setSuburb] = useState(youth.suburb),
    [point, setPoint] = useState(youth.location),
    [transport, setTransport] = useState(youth.transport),
    [skill, setSkill] = useState(""),
    [skills, setSkills] = useState(youth.skills)
  return (
    <>
      <PageIntro
        eyebrow="Your space"
        title="My profile"
        subtitle="Your skills, your choices, your next chapter."
        right={
          <Button
            className="btn-secondary text-sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel" : "Edit profile"}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-800">
                {youth.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <Heading2 className="heading text-xl font-extrabold">
                  {youth.name}
                </Heading2>
                <p className="text-sm text-stone-500">
                  {ageOn(youth.dob, new Date())} years old · {youth.suburb}
                </p>
              </div>
            </div>
            <p className="mt-5 border-t border-stone-100 pt-5 text-sm leading-7 text-slate-600">
              {youth.bio ||
                "Add a short bio to tell businesses what you can do."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {youth.skills.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
          {editing && (
            <form
              className="card space-y-4 p-6"
              onSubmit={(e) => {
                e.preventDefault()
                update((s) => {
                  const y = s.youth.find((x) => x.id === youth.id)!
                  Object.assign(y, {
                    bio: bio.slice(0, LIMITS.bioMax),
                    grade,
                    suburb,
                    location: point,
                    province: provinceOf({ location: point }),
                    transport,
                    skills,
                  })
                  return s
                })
                setEditing(false)
                toast("Profile saved.")
              }}
            >
              <Field label="Home suburb">
                <LocationPicker
                  value={suburb}
                  onChange={(s, p) => {
                    setSuburb(s)
                    setPoint(p)
                  }}
                />
              </Field>
              <Field label="Travel mode">
                <Select
                  className="field"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as TravelMode)}
                >
                  {Object.entries(MODES).map(([m, v]) => (
                    <option value={m} key={m}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Highest grade completed">
                <Select
                  className="field"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i}>
                      Grade {i}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="About you">
                <Textarea
                  className="field min-h-28"
                  maxLength={2000}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </Field>
              <Field label="Skills">
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Button
                      type="button"
                      className="chip"
                      key={s}
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                    >
                      {s} <X size={13} />
                    </Button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    className="field"
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    placeholder="Add skill"
                  />
                  <Button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (skill.trim())
                        setSkills([
                          ...new Set([...skills, skill.trim().toLowerCase()]),
                        ])
                      setSkill("")
                    }}
                  >
                    Add
                  </Button>
                </div>
              </Field>
              <Button className="btn-primary" type="submit">
                Save changes
              </Button>
            </form>
          )}
          <div className="card p-6">
            <Heading3 className="heading mb-3 text-lg font-extrabold">
              Your consent choices
            </Heading3>
            {([
              ["processing", "Processing my information"],
              ["matching", "AI-assisted matching"],
              ["sharing", "Shareable work record"],
            ] as const).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 border-t border-stone-100 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold">{label}</span>
                  <p className="text-xs text-stone-500">
                    {youth.consent[key]
                      ? `Recorded ${prettyDate(youth.consent[key])}`
                      : "Not enabled"}
                  </p>
                </div>
                {key !== "processing" && (
                  <Input
                    aria-label={label}
                    type="checkbox"
                    checked={!!youth.consent[key]}
                    onChange={(e) =>
                      update((s) => {
                        const y = s.youth.find((x) => x.id === youth.id)!
                        if (e.target.checked)
                          y.consent[key] = new Date().toISOString()
                        else delete y.consent[key]
                        return s
                      })
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <Button
            onClick={() => go("/record")}
            className="card flex w-full items-center justify-between p-5 text-left"
          >
            <span className="flex items-center gap-3 font-bold">
              <BadgeCheck size={21} className="text-green-700" /> Verified work
              record
            </span>
            <ChevronRight size={17} />
          </Button>
          <Button
            onClick={() => go("/opportunities")}
            className="card flex w-full items-center justify-between p-5 text-left"
          >
            <span className="flex items-center gap-3 font-bold">
              <Sparkles size={21} className="text-green-700" /> Opportunities
              for you
            </span>
            <ChevronRight size={17} />
          </Button>
          <div className="card p-5">
            <p className="eyebrow mb-2">A little more about you</p>
            <p className="text-sm text-stone-500">
              Highest grade:{" "}
              <strong className="text-emerald-950">Grade {youth.grade}</strong>
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Getting around:{" "}
              <strong className="text-emerald-950">
                {MODES[youth.transport].label}
              </strong>
            </p>
          </div>
          <div className="flex gap-3 px-2 text-xs text-stone-500">
            <Button onClick={() => report(youth.name, youth.name)}>
              Report profile
            </Button>
            <Button onClick={() => block(youth.id)}>Block profile</Button>
          </div>
        </aside>
      </div>
    </>
  )
}

function WorkRecord({
  youth,
  store,
  go,
  publicView = false,
}: {
  youth: Youth
  store: Store
  go?: (p: string) => void
  publicView?: boolean
}) {
  const engagements = store.applications.filter(
    (a) => a.youthId === youth.id && a.status === "Accepted",
  )
  const signed = store.weeks.filter(
    (w) =>
      w.status === "Signed off" &&
      engagements.some((a) => a.id === w.applicationId),
  )
  if (publicView && !youth.consent.sharing)
    return (
      <Empty
        icon={<Shield size={26} />}
        title="This record is private"
        text="The owner has not chosen to share this work record."
      />
    )
  return (
    <>
      <PageIntro
        eyebrow="Your progress"
        title={
          publicView ? `${youth.name}'s work record` : "My verified work record"
        }
        subtitle="Real work, recorded week by week and signed off by a supervisor."
      />
      {!engagements.length ? (
        <Empty
          icon={<BadgeCheck size={27} />}
          title="A record in the making"
          text="When a supervisor signs off your weekly work, your verified work record will appear here."
        />
      ) : (
        <div className="space-y-4">
          {engagements.map((a) => {
            const p = store.placements.find((x) => x.id === a.placementId)!
            const b = store.businesses.find((x) => x.id === p.businessId)!
            const weeks = signed.filter((w) => w.applicationId === a.id)
            return (
              <div key={a.id} className="card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-green-100 p-3 text-emerald-800">
                    <BadgeCheck size={22} />
                  </div>
                  <div>
                    <Heading2 className="heading text-lg font-extrabold">
                      {p.title}
                    </Heading2>
                    <p className="text-sm text-stone-500">
                      {b.name} · {b.suburb}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-y border-stone-100 py-5 sm:grid-cols-4">
                  {[
                    ["Started", p.startDate],
                    ["Weeks signed off", `${weeks.length}`],
                    [
                      "Signed-off hours",
                      `${weeks.reduce((n, w) => n + w.days.reduce((a, b) => a + b, 0), 0)} h`,
                    ],
                    [
                      "Last sign-off",
                      weeks.length
                        ? new Date(
                            [...weeks].sort((a, b) =>
                              (b.signedAt || "").localeCompare(
                                a.signedAt || "",
                              ),
                            )[0].signedAt!,
                          ).toLocaleDateString("en-ZA")
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-stone-500">{label}</p>
                      <p className="mt-1 text-sm font-extrabold">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-stone-500">
                  Skills practised:{" "}
                  {weeks.length
                    ? [...new Set(weeks.flatMap((w) => w.skills))].join(", ") ||
                      "Not recorded yet"
                    : "Not recorded yet"}
                </p>
                <p className="mt-3 text-xs font-bold text-green-700">
                  Signed off weekly by the supervisor at {b.name}.
                </p>
              </div>
            )
          })}
        </div>
      )}
      {!publicView && (
        <div className="mt-6 rounded-xl bg-emerald-50 p-5">
          <Heading3 className="font-bold">Sharing your record</Heading3>
          {youth.consent.sharing ? (
            <div className="mt-2 text-sm text-slate-600">
              <p>
                Preview your shareable record in this browser:{" "}
                <Link
                  className="font-bold text-emerald-800 underline"
                  href={`/shared/${youth.id}`}
                  target="_blank"
                  rel="noopener"
                >
                  Open record <ExternalLink size={13} className="inline" />
                </Link>
              </p>
              <p className="mt-2">
                <Pill tone="grey">Public links Coming soon</Pill> This demo
                stores records only in this browser.
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Your record is private. Enable sharing in your profile to preview
              a shareable record here.
            </p>
          )}
          {!youth.consent.sharing && go && (
            <Button
              className="mt-3 text-sm font-bold text-emerald-800 underline"
              onClick={() => go("/profile")}
            >
              Manage consent
            </Button>
          )}
        </div>
      )}
    </>
  )
}

function Opportunities({
  youth,
  go,
}: {
  youth: Youth
  go: (p: string) => void
}) {
  const age = ageOn(youth.dob, new Date())
  return (
    <>
      <PageIntro
        eyebrow="Beyond a placement"
        title="Opportunities for you"
        subtitle="Public programmes worth exploring. Check the official websites for current requirements."
      />
      {youth.grade < 12 && (
        <div className="mb-5 rounded-2xl bg-green-100 p-6">
          <p className="eyebrow">No-matric pathway</p>
          <Heading2 className="heading mt-2 text-xl font-extrabold">
            There is more than one way forward.
          </Heading2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Explore NQF-level learnerships through SETAs or the Second Chance
            Matric programme to rewrite subjects. Come back to this profile when
            you qualify.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            name: "SA Youth",
            who: "Young South Africans looking for learning and work opportunities.",
            why: `You're ${age} and exploring work experience.`,
            link: "https://sayouth.mobi",
            domain: "sayouth.mobi",
          },
          {
            name: "SETA-funded learnerships",
            who: "People looking to learn workplace skills with a sector training authority.",
            why:
              youth.grade < 12
                ? "Some NQF-level routes may not need matric."
                : "Your skills could fit a workplace learning route.",
            link: "https://www.dhet.gov.za/SitePages/SETAs.aspx",
            domain: "dhet.gov.za",
          },
          {
            name: "NYDA Second Chance Matric",
            who: "People who want to complete or improve their matric results.",
            why:
              youth.grade < 12
                ? `You completed Grade ${youth.grade}; this may be a route to matric.`
                : "An option if you want to improve your matric results.",
            link: "https://www.nyda.gov.za",
            domain: "nyda.gov.za",
          },
        ].map((o) => (
          <article className="card flex flex-col p-6" key={o.name}>
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <BookOpen size={21} />
            </span>
            <Heading2 className="heading text-lg font-extrabold">
              {o.name}
            </Heading2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              <strong>Who it's for:</strong> {o.who}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              <strong>Why it's shown:</strong> {o.why}
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-800"
              target="_blank"
              rel="noopener"
              href={o.link}
            >
              Visit {o.domain} <ExternalLink size={15} />
            </Link>
          </article>
        ))}
      </div>
      <Button
        onClick={() => go("/profile")}
        className="mt-6 text-sm font-bold text-emerald-800"
      >
        ← Back to profile
      </Button>
    </>
  )
}

const etiFor = (
  y: Youth,
  p: Placement,
  b: Business,
  monthsAlreadyClaimed = 0,
) =>
  calculateETI({
    dateOfBirth: y.dob,
    claimMonth: monthNow(),
    monthlyPay: p.stipend,
    paidHours: p.hours,
    monthsAlreadyClaimed,
    isConnectedPerson: false,
    isDomesticWorker: false,
    employerPayeRegistered: b.paye,
    employerTaxCompliant: b.compliant,
  })
function Dashboard({
  store,
  business,
  go,
}: {
  store: Store
  business: Business
  go: (p: string) => void
}) {
  const placements = store.placements.filter(
    (p) => p.businessId === business.id,
  )
  const apps = store.applications.filter((a) =>
    placements.some((p) => p.id === a.placementId),
  )
  const active = apps.filter((a) => a.status === "Accepted")
  const totalETI = summarizeETI(
    active.map((a) => {
      const y = store.youth.find((y) => y.id === a.youthId)!
      const p = placements.find((p) => p.id === a.placementId)!
      return { pay: p.stipend, eti: etiFor(y, p, business).amount }
    }),
  ).total
  return (
    <>
      <div className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-900 px-6 py-8 text-white md:px-9 md:py-10">
        <div className="absolute -right-10 -top-28 h-72 w-72 rounded-full border-40 border-white/5" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-green-200">
            <BadgeCheck size={14} /> {business.tier}
          </div>
          <div className="flex items-center gap-4">
            <BusinessPhoto business={business} size={64} className="ring-2 ring-white/30" />
            <Heading1 className="heading text-3xl font-extrabold md:text-4xl">
              Hello, {business.name}.
            </Heading1>
          </div>
          <p className="mt-2 max-w-md text-sm leading-6 text-stone-300">
            Good work starts with an open door. Here's what's happening in your
            business.
          </p>
          <Button
            onClick={() => go("/business/post")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-champagne px-4 py-3 text-sm font-extrabold text-ink hover:bg-champagne-hover"
          >
            Post a placement <ArrowRight size={16} />
          </Button>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Open placements",
            value: placements.length,
            icon: BriefcaseBusiness,
            route: "/business/post",
          },
          {
            label: "New applicants",
            value: apps.filter((a) => a.status === "Applied").length,
            icon: Users,
            route: "/business/applicants",
          },
          {
            label: "Active placements",
            value: active.length,
            icon: CheckCircle2,
            route: "/business/ledger",
          },
          {
            label: "ETI estimate this month",
            value: money(totalETI),
            icon: Wallet,
            route: "/business/eti",
          },
        ].map((item) => (
          <Button
            key={item.label}
            onClick={() => go(item.route)}
            className="card flex flex-col items-start p-4 text-left md:p-5"
          >
            <span className="mb-4 rounded-xl bg-green-100 p-2 text-green-700">
              <item.icon size={19} />
            </span>
            <strong className="heading text-2xl font-extrabold md:text-3xl">
              {item.value}
            </strong>
            <span className="mt-1 text-xs font-semibold text-stone-500">
              {item.label}
            </span>
          </Button>
        ))}
      </div>
      {estimateNote}
      <div className="mt-3">{wageNote}</div>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Heading2 className="heading text-xl font-extrabold">
              Your placements
            </Heading2>
            <Button
              onClick={() => go("/business/post")}
              className="text-xs font-bold text-green-700"
            >
              + Add new
            </Button>
          </div>
          <div className="space-y-3">
            {placements.map((p) => (
              <div
                className="card flex items-center justify-between gap-3 p-5"
                key={p.id}
              >
                <div>
                  <Pill>Open</Pill>
                  <Heading3 className="heading mt-2 font-extrabold">
                    {p.title}
                  </Heading3>
                  <p className="mt-1 text-xs text-stone-500">
                    {p.skills.join(" · ")} · {money(p.stipend)}/month
                  </p>
                </div>
                <Button
                  onClick={() => go("/business/applicants")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-emerald-800"
                >
                  <ArrowRight size={17} />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Heading2 className="heading mb-4 text-xl font-extrabold">
            Quick links
          </Heading2>
          <div className="card divide-y divide-stone-100 p-2">
            {[
              {
                label: "Review applicants",
                icon: Users,
                route: "/business/applicants",
              },
              {
                label: "Estimate your ETI",
                icon: Wallet,
                route: "/business/eti",
              },
              {
                label: "Sign off weekly work",
                icon: ClipboardCheck,
                route: "/business/ledger",
              },
              {
                label: "Edit business profile",
                icon: BriefcaseBusiness,
                route: "/business/onboarding",
              },
            ].map((l) => (
              <Button
                key={l.label}
                onClick={() => go(l.route)}
                className="flex w-full items-center gap-3 px-3 py-4 text-left text-sm font-bold"
              >
                <l.icon size={18} className="text-green-700" />
                {l.label}
                <ChevronRight size={16} className="ml-auto text-stone-400" />
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5">
        <Sparkles size={21} className="text-green-700" />
        <div className="flex-1">
          <strong className="text-sm">YES host marketplace</strong>
          <p className="text-xs text-stone-500">
            Host youth sponsored by a larger company through the Youth
            Employment Service (YES).
          </p>
        </div>
        <Pill tone="grey">Coming soon</Pill>
      </div>
    </>
  )
}

function BusinessProfile({
  business,
  update,
  toast,
  go,
}: {
  business: Business
  update: (fn: (s: Store) => Store) => void
  toast: (s: string) => void
  go: (p: string) => void
}) {
  const [name, setName] = useState(business.name),
    [sector, setSector] = useState(business.sector),
    [suburb, setSuburb] = useState(business.suburb),
    [location, setLocation] = useState<Point>(business.location),
    [paye, setPaye] = useState(business.paye),
    [compliant, setCompliant] = useState(business.compliant),
    [cipc, setCipc] = useState("")
  return (
    <>
      <PageIntro
        eyebrow="Business setup"
        title="Business profile"
        subtitle="The basics people need to know about your business. Verification tiers are set only by an admin."
      />
      <div className="max-w-2xl">
        <div className="card mb-5 flex items-center gap-3 p-5">
          <BadgeCheck size={23} className="text-green-700" />
          <div>
            <p className="text-sm font-bold">{business.tier}</p>
            <p className="text-xs text-stone-500">Demo ID: {business.id}</p>
          </div>
        </div>
        <div className="card mb-5 p-5">
          <p className="mb-3 text-sm font-bold">Shop photo</p>
          <PhotoUpload
            business={business}
            toast={toast}
            onPhoto={(photo) => {
              update((s) => {
                const b = s.businesses.find((x) => x.id === business.id)!
                if (photo) b.photo = photo
                else delete b.photo
                return s
              })
              toast(photo ? "Photo saved. Young people now see it on your placements." : "Photo removed.")
            }}
          />
        </div>
        <form
          className="card space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            update((s) => {
              const b = s.businesses.find((x) => x.id === business.id)!
              Object.assign(b, {
                name: name.trim().slice(0, LIMITS.nameMax),
                sector: sector.trim().slice(0, LIMITS.nameMax),
                suburb,
                location,
                province: provinceOf({ location }),
                paye,
                compliant,
              })
              s.audit.unshift(audit(business.name, "Updated business profile"))
              return s
            })
            setCipc("")
            toast("Business profile saved.")
          }}
        >
          <Field label="Business name">
            <Input
              required
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Sector">
            <Input
              required
              className="field"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </Field>
          <Field label="Location">
            <LocationPicker
              value={suburb}
              onChange={(s, p) => {
                setSuburb(s)
                setLocation(p)
              }}
            />
          </Field>
          <Field
            label="CIPC number (optional)"
            hint="Only needed if you choose to provide it. This prototype does not store this number."
          >
            <Input
              className="field"
              value={cipc}
              onChange={(e) => setCipc(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <Input
              type="checkbox"
              checked={paye}
              onChange={(e) => setPaye(e.target.checked)}
            />{" "}
            Registered for PAYE (self-declared)
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <Input
              type="checkbox"
              checked={compliant}
              onChange={(e) => setCompliant(e.target.checked)}
            />{" "}
            Tax compliant (self-declared)
          </label>
          <Button className="btn-primary w-full" type="submit">
            Save business profile
          </Button>
        </form>
      </div>
    </>
  )
}

function NewBusiness({
  store,
  update,
  onCreated,
}: {
  store: Store
  update: (fn: (s: Store) => Store) => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState(""),
    [sector, setSector] = useState(""),
    [suburb, setSuburb] = useState(""),
    [location, setLocation] = useState<Point>({ lat: -26.193, lng: 28.031 }),
    [paye, setPaye] = useState(false),
    [compliant, setCompliant] = useState(false),
    [cipc, setCipc] = useState("")
  return (
    <>
      <PageIntro
        eyebrow="Business onboarding"
        title="Open the door."
        subtitle="Tell us about your business. Verification starts pending and can only be changed by an admin."
      />
      <form
        className="card max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!suburb) return
          const next =
            Math.max(
              0,
              ...store.businesses.map((b) => Number(b.id.slice(5)) || 0),
            ) + 1
          const id = `DEMO-${String(next).padStart(4, "0")}`
          update((s) => {
            s.businesses.push({
              id,
              name: name.trim(),
              sector: sector.trim(),
              suburb,
              location,
              province: provinceOf({ location }),
              tier: "Verification pending",
              paye,
              compliant,
            })
            s.audit.unshift(audit(name.trim(), "Created business profile"))
            return s
          })
          onCreated(id)
        }}
      >
        <Field label="Business name">
          <Input
            required
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your business name"
          />
        </Field>
        <Field label="Sector">
          <Input
            required
            className="field"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="e.g. Food and baking"
          />
        </Field>
        <Field label="Business location">
          <LocationPicker
            value={suburb}
            onChange={(s, p) => {
              setSuburb(s)
              setLocation(p)
            }}
          />
        </Field>
        <Field
          label="CIPC number (optional)"
          hint="This prototype does not store this number. An admin sets the verification tier."
        >
          <Input
            className="field"
            value={cipc}
            onChange={(e) => setCipc(e.target.value)}
            placeholder="Optional"
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <Input
            type="checkbox"
            checked={paye}
            onChange={(e) => setPaye(e.target.checked)}
          />{" "}
          Registered for PAYE (self-declared)
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <Input
            type="checkbox"
            checked={compliant}
            onChange={(e) => setCompliant(e.target.checked)}
          />{" "}
          Tax compliant (self-declared)
        </label>
        <Button type="submit" className="btn-primary w-full" disabled={!suburb}>
          Create business profile <ArrowRight size={16} />
        </Button>
      </form>
    </>
  )
}

function PostPlacement({
  business,
  update,
  go,
  toast,
}: {
  business: Business
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  toast: (s: string) => void
}) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [stipend, setStipend] = useState(5000),
    [hours, setHours] = useState(160),
    [duration, setDuration] = useState(3),
    [startDate, setStartDate] = useState(today()),
    [suburb, setSuburb] = useState(business.suburb),
    [location, setLocation] = useState<Point>(business.location),
    [skill, setSkill] = useState(""),
    [skills, setSkills] = useState<string[]>([])
  const eligible22Birth = `${new Date().getFullYear() - 22}-01-01`
  const preview = calculateETI({
    dateOfBirth: eligible22Birth,
    claimMonth: monthNow(),
    monthlyPay: stipend,
    paidHours: hours,
    monthsAlreadyClaimed: 0,
    isConnectedPerson: false,
    isDomesticWorker: false,
    employerPayeRegistered: business.paye,
    employerTaxCompliant: business.compliant,
  })
  return (
    <>
      <PageIntro
        eyebrow="Create an opportunity"
        title="Post a placement"
        subtitle="Describe real work, a fair stipend and the skills a young person will use."
      />
      <form
        className="grid gap-5 lg:grid-cols-[1fr_300px]"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!skills.length) {
            toast("Add at least one required skill.")
            return
          }
          const problem = validatePlacement({ title, description, stipend, hours, duration })
          if (problem) {
            toast(problem)
            return
          }
          const verdict = await api<PlacementVerdict>("placement", { stipend, hours }, 3000)
          if (verdict && !verdict.allowed) {
            toast(verdict.problem || "The server refused this placement.")
            return
          }
          update((s) => {
            s.placements.unshift({
              id: crypto.randomUUID(),
              businessId: business.id,
              title: title.trim(),
              description: description.trim(),
              stipend,
              hours,
              duration,
              startDate,
              skills,
              location,
              province: provinceOf({ location }),
            })
            s.audit.unshift(audit(business.name, `Posted ${title}`))
            return s
          })
          toast(
            verdict
              ? "Pay checked by the server. Placement posted; young people can now find it."
              : "Placement posted. Young people can now find it.",
          )
          go("/business")
        }}
      >
        <div className="card space-y-5 p-6">
          <Field label="Placement title">
            <Input
              required
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Shop assistant"
            />
          </Field>
          <Field label="What will they do?">
            <Textarea
              required
              className="field min-h-28"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the tasks and what they can learn"
            />
          </Field>
          <div>
            <span className="label">Required skills</span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Button
                  type="button"
                  key={s}
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  className="chip"
                >
                  {s} <X size={13} />
                </Button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                className="field"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Add a skill"
              />
              <Button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  if (skill.trim())
                    setSkills([
                      ...new Set([...skills, skill.trim().toLowerCase()]),
                    ])
                  setSkill("")
                }}
              >
                Add
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly stipend (R)">
              <Input
                required
                type="number"
                min="1"
                className="field"
                value={stipend}
                onChange={(e) => setStipend(Number(e.target.value))}
              />
            </Field>
            <Field label="Hours / month" hint={`Max ${MAX_CONTRACTED_HOURS_MONTH} (45 a week)`}>
              <Input
                required
                type="number"
                min="1"
                max={MAX_CONTRACTED_HOURS_MONTH}
                className="field"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </Field>
            <Field label="Duration (months)">
              <Input
                required
                type="number"
                min="1"
                max="24"
                className="field"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </Field>
            <div className="col-span-2">
              {placementLabourProblem(stipend, hours) ? (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {placementLabourProblem(stipend, hours)}
                </p>
              ) : (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  R{hourlyRate(stipend, hours).toFixed(2)} an hour · meets the national minimum wage (R{NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)})
                </p>
              )}
            </div>
            <Field label="Start date">
              <Input
                required
                type="date"
                className="field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Placement location">
            <LocationPicker
              value={suburb}
              onChange={(s, p) => {
                setSuburb(s)
                setLocation(p)
              }}
            />
          </Field>
          <Button type="submit" className="btn-primary w-full">
            Post placement <ArrowRight size={16} />
          </Button>
        </div>
        <aside className="space-y-4">
          <div className="card p-5">
            <p className="eyebrow mb-3">Live ETI preview</p>
            <p className="text-xs text-stone-500">
              For an eligible 22-year-old in the first 12 months
            </p>
            <p className="heading my-2 text-3xl font-extrabold text-emerald-800">
              {money(preview.amount)}
              <span className="text-sm font-medium"> / month</span>
            </p>
            {preview.reasons.map((r) => (
              <p key={r} className="text-xs text-red-700">
                {r}
              </p>
            ))}
            {estimateNote}
          </div>
          {wageNote}
        </aside>
      </form>
    </>
  )
}

function Applicants({
  store,
  business,
  update,
  toast,
  record,
  report,
  block,
}: {
  store: Store
  business: Business
  update: (fn: (s: Store) => Store) => void
  toast: (s: string) => void
  record: (a: string, b: string) => void
  report: (t: string, b: string) => void
  block: (t: string) => void
}) {
  const placements = store.placements.filter(
    (p) => p.businessId === business.id,
  )
  const apps = store.applications.filter(
    (a) =>
      placements.some((p) => p.id === a.placementId) &&
      !store.blocked.includes(a.youthId),
  )
  const decide = (a: Application, status: Application["status"]) => {
    const problem = canDecideApplication({ role: "business", businessId: business.id }, a, store, status)
    if (problem) {
      toast(problem)
      return
    }
    update((s) => {
      s.applications.find((x) => x.id === a.id)!.status = status
      s.audit.unshift(
        audit(
          business.name,
          `${status} ${s.youth.find((y) => y.id === a.youthId)?.name} for ${s.placements.find((p) => p.id === a.placementId)?.title}`,
        ),
      )
      return s
    })
    toast(
      status === "Accepted"
        ? "Placement active. The youth can now log weekly work."
        : `Applicant ${status.toLowerCase()}.`,
    )
  }
  return (
    <>
      <PageIntro
        eyebrow="People, not percentages"
        title="Applicants"
        subtitle="See the fit, read the context, and make the decision yourself. No automatic decisions."
      />
      {apps.length ? (
        <div className="space-y-4">
          {apps.map((a) => {
            const y = store.youth.find((y) => y.id === a.youthId)!
            const p = placements.find((p) => p.id === a.placementId)!
            const r = rankMatch(y, p)
            return (
              <article className="card p-5 md:p-6" key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-1">For {p.title}</p>
                    <Heading2 className="heading text-xl font-extrabold">
                      {y.name.split(" ")[0]}{" "}
                      <span className="font-semibold text-stone-500">
                        · {ageOn(y.dob, new Date())} · {y.suburb}
                      </span>
                    </Heading2>
                    <p className="mt-1 text-xs text-stone-500">
                      Applied {a.date} · {y.skills.join(", ")}
                    </p>
                  </div>
                  <Pill
                    tone={
                      a.status === "Accepted"
                        ? "green"
                        : a.status === "Declined"
                          ? "grey"
                          : "amber"
                    }
                  >
                    {a.status}
                  </Pill>
                </div>
                <div className="mt-4 rounded-xl bg-stone-100 p-4">
                  <p className="text-sm font-bold text-emerald-800">
                    {r.percent}% match
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Why this match: {r.why}
                  </p>
                  <p className="mt-2 text-xs font-bold text-stone-500">
                    Travel: {r.travel.minutes} min one way est. ·{" "}
                    {money(r.travel.monthlyCost)}/month est. ·{" "}
                    {Math.round(r.travel.share * 100)}% of stipend{" "}
                    {r.travel.unaffordable ? "— cost flagged" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{estimateNote}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {a.status !== "Accepted" && a.status !== "Declined" && (
                    <>
                      <Button
                        className="btn-secondary text-xs"
                        onClick={() => decide(a, "Shortlisted")}
                      >
                        Shortlist
                      </Button>
                      <Button
                        className="btn-primary text-xs"
                        onClick={() => decide(a, "Accepted")}
                      >
                        Accept
                      </Button>
                      <Button
                        className="btn-secondary text-xs"
                        onClick={() => decide(a, "Declined")}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => report(y.name, business.name)}
                    className="ml-auto p-2 text-stone-500"
                    aria-label="Report profile"
                  >
                    <Flag size={16} />
                  </Button>
                  <Button
                    onClick={() => block(y.id)}
                    className="text-xs font-semibold text-stone-500"
                  >
                    Block
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty
          icon={<Users size={27} />}
          title="No applicants yet"
          text="When young people apply to your placements, you'll see them here. You always make the final decision."
        />
      )}
    </>
  )
}

function downloadText(name: string, text: string, mime = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function ETIPage({
  store,
  business,
  record,
}: {
  store: Store
  business: Business
  record: (a: string, b: string) => void
}) {
  const logged = useRef(false)
  useEffect(() => {
    if (!logged.current) {
      logged.current = true
      record(business.name, `Viewed ETI calculation for ${monthNow()}`)
    }
  }, [])
  const placements = store.placements.filter(
    (p) => p.businessId === business.id,
  )
  const active = store.applications
    .filter(
      (a) =>
        a.status === "Accepted" &&
        placements.some((p) => p.id === a.placementId),
    )
    .map((a) => {
      const y = store.youth.find((y) => y.id === a.youthId)!
      const p = placements.find((p) => p.id === a.placementId)!
      const monthsClaimed = claimMonthsSince(p.startDate, monthNow())
      return {
        a,
        y,
        p,
        monthsClaimed,
        eti: etiFor(y, p, business, monthsClaimed),
      }
    })
  const { total, gross, realCost } = summarizeETI(
    active.map((x) => ({ pay: x.p.stipend, eti: x.eti.amount })),
  )
  const [pay, setPay] = useState(5000),
    [hours, setHours] = useState(160),
    [dob, setDob] = useState("2004-03-15"),
    [months, setMonths] = useState(0),
    [connected, setConnected] = useState(false),
    [domestic, setDomestic] = useState(false)
  const result = calculateETI({
    dateOfBirth: dob,
    claimMonth: monthNow(),
    monthlyPay: pay,
    paidHours: hours,
    monthsAlreadyClaimed: months,
    isConnectedPerson: connected,
    isDomesticWorker: domestic,
    employerPayeRegistered: business.paye,
    employerTaxCompliant: business.compliant,
  })
  // The server calculates the same estimate independently; we show whether it agrees.
  const [serverEti, setServerEti] = useState<ETIVerdict | null | "offline">(null)
  useEffect(() => {
    setServerEti(null)
    const t = setTimeout(async () => {
      const r = await api<ETIVerdict>("eti", {
        dateOfBirth: dob,
        claimMonth: monthNow(),
        monthlyPay: pay,
        paidHours: hours,
        monthsAlreadyClaimed: months,
        isConnectedPerson: connected,
        isDomesticWorker: domestic,
        employerPayeRegistered: business.paye,
        employerTaxCompliant: business.compliant,
      })
      setServerEti(r && typeof r.amount === "number" ? r : "offline")
    }, 400)
    return () => clearTimeout(t)
  }, [dob, pay, hours, months, connected, domestic, business.paye, business.compliant])
  const csv = () => {
    const rows = [
      [
        "Youth",
        "Role",
        "Claim month",
        "Month of 24",
        "Gross pay (R)",
        "Paid hours",
        "ETI estimate (R)",
        "Eligibility / reason",
      ],
      ...active.map(({ y, p, monthsClaimed, eti }) => [
        y.name,
        p.title,
        monthNow(),
        String(monthsClaimed + 1),
        p.stipend.toFixed(2),
        String(p.hours),
        eti.amount.toFixed(2),
        eti.eligible ? "Eligible estimate" : eti.reasons.join("; "),
      ]),
    ]
    downloadText(
      "eti-working-schedule.csv",
      [
        "ETI working schedule for your payroll person - not an official SARS file",
        ...rows.map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        ),
        "",
        "Estimate only. Confirm with your payroll provider.",
      ].join("\r\n"),
    )
    record(business.name, "Downloaded ETI working schedule")
  }
  const pdf = () => {
    const doc = new jsPDF()
    let yPos = 20
    const line = (text: string, size = 10) => {
      doc.setFontSize(size)
      const lines = doc.splitTextToSize(text, 175) as string[]
      if (yPos + lines.length * 6 > 277) {
        doc.addPage()
        yPos = 20
      }
      doc.text(lines, 18, yPos)
      yPos += lines.length * 6 + 5
    }
    line("OPPORTUNITY BRIDGE | PLACEMENT PACK", 16)
    line(`Business: ${business.name} (${business.id}) | ${business.suburb}`)
    line(`Prepared: ${today()} | Claim month: ${monthNow()}`)
    line("")
    if (!active.length)
      line(
        "No active placements yet. Accept an applicant to include their placement details.",
      )
    active.forEach(({ y, p, eti, a }) => {
      line(`Youth: ${y.name} | Role: ${p.title}`, 13)
      line(
        `Start: ${p.startDate} | Duration: ${p.duration} months | Hours/month: ${p.hours} | Monthly pay: ${money(p.stipend)}`,
      )
      line(
        `This month's ETI estimate: ${money(eti.amount)}${
          eti.reasons.length ? ` | ${eti.reasons.join("; ")}` : ""
        }`,
      )
      const signed = store.weeks.filter(
        (w) => w.applicationId === a.id && w.status === "Signed off",
      )
      line(`Signed-off weeks: ${signed.length}`)
      signed.forEach((w) =>
        line(
          `${w.submittedAt.slice(0, 10)}: ${w.days.reduce((n, h) => n + h, 0)} hours. ${w.work}. Signed off by ${w.supervisor} on ${
            w.signedAt ? prettyDate(w.signedAt) : ""
          }.`,
        ),
      )
      line("")
    })
    line("CHECKLIST", 12)
    ;[
      "Signed contract",
      "UIF registration",
      "Added to payroll with ETI flag",
      "POPIA consent recorded",
      "Weekly timesheets signed off",
    ].forEach((item) => line(`[  ] ${item}`))
    line("")
    line(
      "Estimate only. Confirm with your payroll provider. ETI is claimed by the employer on the monthly EMP201 by reducing PAYE. No application needed.",
    )
    doc.save("placement-pack.pdf")
    record(business.name, "Downloaded placement pack")
  }
  return (
    <>
      <PageIntro
        eyebrow="Employment Tax Incentive"
        title="Make the numbers clearer."
        subtitle="See what your business may be able to claim. You self-claim ETI on your monthly EMP201."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card bg-emerald-900 p-5 !text-white sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-green-200">
            This month's ETI estimate
          </p>
          <p className="heading mt-2 text-4xl font-extrabold">{money(total)}</p>
          <p className="mt-3 text-xs text-stone-300">
            Your real cost: <strong>{money(realCost)}</strong> of {money(gross)}{" "}
            gross pay
          </p>
        </div>
        <div className="card flex flex-col justify-center p-5">
          <span className="mb-2 text-xs text-stone-500">
            Active young people
          </span>
          <span className="heading text-3xl font-extrabold">
            {active.length}
          </span>
          <span className="mt-2 text-xs text-stone-500">
            on your payroll estimate
          </span>
        </div>
      </div>
      <div className="mb-6 space-y-3">
        <p className="rounded-xl bg-stone-200 p-4 text-sm font-semibold text-emerald-800">
          Claimed on your monthly EMP201 by reducing PAYE. No application
          needed.
        </p>
        {wageNote}
        {estimateNote}
      </div>
      <div className="mb-7 flex flex-wrap gap-2">
        <Button className="btn-secondary text-xs" onClick={pdf}>
          <Download size={16} /> Download placement pack (PDF)
        </Button>
        <Button className="btn-secondary text-xs" onClick={csv}>
          <Download size={16} /> Download ETI working schedule (CSV)
        </Button>
        <p className="w-full text-xs text-stone-500">
          The CSV is for your payroll person, not an official SARS file.
        </p>
      </div>
      <Heading2 className="heading mb-4 text-xl font-extrabold">
        Active placements
      </Heading2>
      {active.length ? (
        <div className="mb-9 space-y-3">
          {active.map(({ a, y, p, monthsClaimed, eti }) => (
            <div
              className="card flex flex-wrap items-center justify-between gap-3 p-5"
              key={a.id}
            >
              <div>
                <strong className="heading">{y.name}</strong>
                <p className="mt-1 text-xs text-stone-500">
                  Age {ageOn(y.dob, new Date())} · {p.title} · Month{" "}
                  {monthsClaimed + 1} of 24 · Gross {money(p.stipend)}
                </p>
                {eti.reasons.map((r) => (
                  <p className="mt-1 text-xs text-red-700" key={r}>
                    {r}
                  </p>
                ))}
              </div>
              <div className="text-right">
                <p className="heading text-xl font-extrabold text-emerald-800">
                  {money(eti.amount)}
                </p>
                <p className="text-xs text-stone-500">ETI estimate</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-9">
          <Empty
            icon={<Wallet size={26} />}
            title="No active placements yet"
            text="Accept an applicant to see an individual ETI estimate here. You can still try the calculator below."
          />
        </div>
      )}
      <div className="card max-w-3xl p-6">
        <div className="mb-5">
          <p className="eyebrow">Plan ahead</p>
          <Heading2 className="heading mt-1 text-xl font-extrabold">
            Stand-alone ETI calculator
          </Heading2>
          <p className="mt-1 text-sm text-stone-500">
            Try a scenario before you hire. This does not submit a claim.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly pay (R)">
            <Input
              className="field"
              type="number"
              min="0"
              value={pay}
              onChange={(e) => setPay(Number(e.target.value))}
            />
          </Field>
          <Field label="Paid hours">
            <Input
              className="field"
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </Field>
          <Field label="Date of birth">
            <Input
              className="field"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>
          <Field label="Months already claimed">
            <Input
              className="field"
              type="number"
              min="0"
              max="24"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Input
              type="checkbox"
              checked={connected}
              onChange={(e) => setConnected(e.target.checked)}
            />{" "}
            Connected person (e.g. family)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Input
              type="checkbox"
              checked={domestic}
              onChange={(e) => setDomestic(e.target.checked)}
            />{" "}
            Domestic worker
          </label>
        </div>
        <div className="mt-6 rounded-2xl bg-green-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Estimated monthly ETI · {monthNow()}
          </p>
          <p className="heading mt-2 text-3xl font-extrabold text-emerald-800">
            {money(result.amount)}
          </p>
          {serverEti && serverEti !== "offline" && (
            <p className={`mt-1 text-xs font-semibold ${serverEti.amount === result.amount ? "text-green-700" : "text-red-700"}`}>
              {serverEti.amount === result.amount
                ? `✓ Confirmed by the server (/api/eti): ${money(serverEti.amount)}`
                : `Server calculated ${money(serverEti.amount)}. Please check the inputs.`}
            </p>
          )}
          {serverEti === null && <p className="mt-1 text-xs text-stone-500">Checking with the server…</p>}
          {result.reasons.map((r) => (
            <p key={r} className="mt-2 text-xs text-red-700">
              {r}
            </p>
          ))}
          {hours > 0 && pay / hours < NATIONAL_MINIMUM_WAGE_HOURLY && (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              R{(pay / hours).toFixed(2)} an hour is below the national minimum wage of R
              {NATIONAL_MINIMUM_WAGE_HOURLY.toFixed(2)}. Pay must be lawful before any incentive is claimed.
            </p>
          )}
          <div className="mt-3">{estimateNote}</div>
        </div>
      </div>
    </>
  )
}

function Ledger({
  store,
  business,
  update,
  toast,
  record,
  report,
  block,
}: {
  store: Store
  business: Business
  update: (fn: (s: Store) => Store) => void
  toast: (s: string) => void
  record: (a: string, b: string) => void
  report: (t: string, b: string) => void
  block: (t: string) => void
}) {
  const placements = store.placements.filter(
    (p) => p.businessId === business.id,
  )
  const apps = store.applications.filter(
    (a) =>
      a.status === "Accepted" && placements.some((p) => p.id === a.placementId),
  )
  const weeks = store.weeks
    .filter((w) => apps.some((a) => a.id === w.applicationId))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  const submitted = weeks.filter((w) => w.status === "Submitted"),
    complete = weeks.filter((w) => w.status !== "Submitted")
  const act = (w: Week, status: Week["status"]) => {
    const problem = canSignOffWeek({ role: "business", businessId: business.id }, w, store)
    if (problem) {
      toast(problem)
      return
    }
    const supervisor =
      status === "Signed off"
        ? window.prompt("Supervisor name for this sign-off:")
        : undefined
    const query =
      status === "Queried"
        ? window.prompt("What needs to be clarified?")
        : undefined
    if (
      (status === "Signed off" && !supervisor?.trim()) ||
      (status === "Queried" && !query?.trim())
    )
      return
    update((s) => {
      const week = s.weeks.find((x) => x.id === w.id)!
      week.status = status
      if (status === "Signed off") {
        week.supervisor = supervisor!.trim().slice(0, LIMITS.nameMax)
        week.signedAt = new Date().toISOString()
      } else week.query = query!.trim().slice(0, 500)
      s.audit.unshift(
        audit(
          business.name,
          `${status} weekly record for ${s.youth.find((y) => y.id === s.applications.find((a) => a.id === w.applicationId)?.youthId)?.name}`,
        ),
      )
      return s
    })
    toast(
      status === "Signed off" ? "Week signed off." : "Query sent to the youth.",
    )
  }
  const display = (w: Week) => {
    const app = apps.find((a) => a.id === w.applicationId)!
    const youth = store.youth.find((y) => y.id === app.youthId)!
    const p = placements.find((p) => p.id === app.placementId)!
    return (
      <div className="card p-5" key={w.id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Heading3 className="heading font-extrabold">
              {youth.name.split(" ")[0]}{" "}
              <span className="font-normal text-stone-500">· {p.title}</span>
            </Heading3>
            <p className="mt-1 text-xs text-stone-500">
              Submitted {prettyDate(w.submittedAt)} ·{" "}
              {w.days.reduce((n, h) => n + h, 0)} hours
            </p>
          </div>
          <Pill
            tone={
              w.status === "Signed off"
                ? "green"
                : w.status === "Queried"
                  ? "red"
                  : "amber"
            }
          >
            {w.status}
          </Pill>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{w.work}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {w.skills.map((s) => (
            <span className="chip" key={s}>
              {s}
            </span>
          ))}
        </div>
        {w.status === "Submitted" ? (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => act(w, "Signed off")}
              className="btn-primary text-xs"
            >
              <Check size={15} /> Sign off
            </Button>
            <Button
              onClick={() => act(w, "Queried")}
              className="btn-secondary text-xs"
            >
              Query
            </Button>
            <Button
              onClick={() => report(p.title, business.name)}
              className="ml-auto p-2 text-stone-500"
              title="Report placement"
            >
              <Flag size={16} />
            </Button>
            <Button
              onClick={() => block(p.id)}
              className="text-xs text-stone-500"
            >
              Block
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-600">
            {w.signedAt
              ? `Signed off by ${w.supervisor}, ${prettyDate(w.signedAt)}`
              : `Queried: ${w.query}`}
          </p>
        )}
      </div>
    )
  }
  return (
    <>
      <PageIntro
        eyebrow="Weekly evidence ledger"
        title="The work, on record."
        subtitle="Review submitted weeks oldest first. Sign off what happened, or ask for a clarification."
      />
      <div className="mb-7">
        <Heading2 className="heading mb-4 text-xl font-extrabold">
          Waiting for sign-off{" "}
          <span className="text-stone-400">({submitted.length})</span>
        </Heading2>
        {submitted.length ? (
          <div className="space-y-3">{submitted.map(display)}</div>
        ) : (
          <Empty
            icon={<ClipboardCheck size={26} />}
            title="All caught up"
            text="Submitted weekly records will appear here when a young person logs their work."
          />
        )}
      </div>
      {complete.length > 0 && (
        <>
          <Heading2 className="heading mb-4 text-xl font-extrabold">
            Previous entries
          </Heading2>
          <div className="space-y-3">{complete.map(display)}</div>
        </>
      )}
    </>
  )
}

function Admin({
  path,
  store,
  update,
  go,
  reset,
}: {
  path: string
  store: Store
  update: (fn: (s: Store) => Store) => void
  go: (p: string) => void
  reset: () => void
}) {
  const open = store.reports.filter((r) => r.status === "Open")
  return (
    <>
      <PageIntro
        eyebrow="Demo administration"
        title="Admin workspace"
        subtitle="Resolve reports, review verification and see what happened in the demo."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            name: "Open reports",
            value: open.length,
            route: "/admin/reports",
            icon: Flag,
          },
          {
            name: "Businesses",
            value: store.businesses.length,
            route: "/admin/verify",
            icon: BriefcaseBusiness,
          },
          {
            name: "Audit entries",
            value: store.audit.length,
            route: "/admin/audit",
            icon: FileText,
          },
        ].map((x) => (
          <Button
            onClick={() => go(x.route)}
            className="card flex items-center gap-3 p-4 text-left"
            key={x.name}
          >
            <x.icon size={20} className="text-green-700" />
            <span>
              <strong className="heading block text-xl">{x.value}</strong>
              <span className="text-xs text-stone-500">{x.name}</span>
            </span>
          </Button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          ["Overview", "/admin"],
          ["Reports", "/admin/reports"],
          ["Verification", "/admin/verify"],
          ["Audit log", "/admin/audit"],
        ].map(([label, url]) => (
          <Button
            key={url}
            onClick={() => go(url)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              path === url
                ? "bg-emerald-800 text-white"
                : "bg-white text-stone-500"
            }`}
          >
            {label}
          </Button>
        ))}
      </div>
      {path === "/admin" && <SelfCheck />}
      {path === "/admin/reports" ? (
        <div>
          <Heading2 className="heading mb-4 text-xl font-extrabold">
            Reports queue
          </Heading2>
          {store.reports.length ? (
            <div className="space-y-3">
              {store.reports.map((r) => (
                <div
                  className="card flex flex-wrap items-center justify-between gap-4 p-5"
                  key={r.id}
                >
                  <div>
                    <Pill tone={r.status === "Open" ? "amber" : "green"}>
                      {r.status}
                    </Pill>
                    <p className="mt-2 font-bold">{r.target}</p>
                    <p className="mt-1 text-sm text-stone-500">{r.reason}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      Reported by {r.by}
                    </p>
                  </div>
                  {r.status === "Open" && (
                    <Button
                      className="btn-primary text-xs"
                      onClick={() =>
                        update((s) => {
                          s.reports.find((x) => x.id === r.id)!.status =
                            "Resolved"
                          s.audit.unshift(
                            audit("Admin", `Resolved report: ${r.target}`),
                          )
                          return s
                        })
                      }
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={<Flag size={26} />}
              title="No reports"
              text="Reports from profiles and placements will appear here."
            />
          )}
        </div>
      ) : path === "/admin/verify" ? (
        <div>
          <Heading2 className="heading mb-4 text-xl font-extrabold">
            Business verification
          </Heading2>
          <p className="mb-4 text-xs text-stone-500">
            Only an admin can change a verification tier. Demo identifiers are
            not registration numbers.
          </p>
          <div className="space-y-3">
            {store.businesses.map((b) => (
              <div
                className="card flex flex-wrap items-center justify-between gap-3 p-5"
                key={b.id}
              >
                <div>
                  <Heading3 className="heading font-extrabold">
                    {b.name}
                  </Heading3>
                  <p className="mt-1 text-xs text-stone-500">
                    {b.id} · {b.suburb} · {b.sector}
                  </p>
                </div>
                <Select
                  aria-label={`Verification tier for ${b.name}`}
                  className="field !w-auto !min-w-40 text-xs"
                  value={b.tier}
                  onChange={(e) =>
                    update((s) => {
                      s.businesses.find((x) => x.id === b.id)!.tier = (e.target
                        .value as Business["tier"])
                      s.audit.unshift(
                        audit("Admin", `Set ${b.name} to ${e.target.value}`),
                      )
                      return s
                    })
                  }
                >
                  <option>Verification pending</option>
                  <option>CIPC verified</option>
                  <option>ID verified</option>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ) : path === "/admin/audit" ? (
        <div>
          <Heading2 className="heading mb-4 text-xl font-extrabold">
            Audit log · last 50 entries
          </Heading2>
          {store.audit.length ? (
            <div className="card divide-y divide-stone-100">
              {store.audit.slice(0, 50).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
                >
                  <span>
                    <strong>{a.actor}</strong> · {a.action}
                  </span>
                  <span className="text-xs text-stone-500">
                    {prettyDate(a.at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={<FileText size={26} />}
              title="Nothing logged yet"
              text="Decisions and other actions will appear here as you use the demo."
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <Heading2 className="heading text-lg font-extrabold">
              How this demo works
            </Heading2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Youth apply, businesses decide, and weekly work is signed off. ETI
              is an estimate for the employer's monthly EMP201.
            </p>
            <div className="mt-4">
              <Pill tone="grey">AI off · skill overlap fallback</Pill>
            </div>
          </div>
          <div className="card p-6">
            <Heading2 className="heading text-lg font-extrabold">
              Start fresh
            </Heading2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Reset placements, applications, reports, consents and activity to
              the original demo data in this browser.
            </p>
            <Button
              onClick={() => {
                if (window.confirm("Reset all demo data in this browser?"))
                  reset()
              }}
              className="btn-secondary mt-5 text-xs"
            >
              <RotateCcw size={16} /> Reset demo data
            </Button>
          </div>
          <div className="card p-6 md:col-span-2">
            <Heading2 className="heading text-lg font-extrabold">
              AI matching
            </Heading2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              This prototype ranks by skill overlap. No AI service is connected.
              Matching works without it.
            </p>
            <Pill tone="grey">AI service Coming soon</Pill>
          </div>
        </div>
      )}
    </>
  )
}
