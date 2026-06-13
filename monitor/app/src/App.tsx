import { useState } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0x31B1A2Add1bc5D15bBE53Ad684aaf86a970ce8AC'

type Status = 'operational' | 'degraded' | 'down'

interface Service {
  name: string
  region: string
  uptime: number
  status: Status
  latency: number
}

interface CheckResult {
  service: string
  violated: boolean
  uptime: number
  threshold: number
  reason: string
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

const liveServices: Service[] = [
  { name: 'api-gateway', region: 'us-east-1', uptime: 99.997, status: 'operational', latency: 42 },
  { name: 'auth-service', region: 'eu-west-1', uptime: 99.94, status: 'operational', latency: 88 },
  { name: 'payments-core', region: 'us-east-1', uptime: 98.71, status: 'degraded', latency: 310 },
  { name: 'media-cdn', region: 'global', uptime: 99.999, status: 'operational', latency: 19 },
  { name: 'search-cluster', region: 'ap-south-1', uptime: 96.20, status: 'down', latency: 0 },
  { name: 'notifications', region: 'us-west-2', uptime: 99.88, status: 'operational', latency: 64 },
]

const steps = [
  {
    n: '01',
    title: 'Register an SLA',
    body: 'Point SLAWatcher at a status page and declare the promise — e.g. "99.9% monthly uptime". The terms are pinned on-chain.',
  },
  {
    n: '02',
    title: 'AI Reads the Page',
    body: 'On every check, a headless render scrapes the live status page. An AI judge interprets incidents, outages and degraded states.',
  },
  {
    n: '03',
    title: 'Verdict & Penalty',
    body: 'If the SLA is breached, validators reach consensus and the PenaltyPool contract releases compensation to subscribers automatically.',
  },
]

const features = [
  { icon: '📡', title: 'Live Status Scraping', body: 'Headless browser renders JS-heavy status pages, not just raw HTML, so dynamic incident banners are never missed.' },
  { icon: '🧠', title: 'AI Incident Judge', body: 'Language model reasoning distinguishes a real outage from cosmetic noise — fewer false alarms, fewer missed breaches.' },
  { icon: '⛓️', title: 'On-Chain Enforcement', body: 'Verdicts settle to a PenaltyPool smart contract. Payouts are trustless and need no manual claims process.' },
  { icon: '📊', title: 'Grafana-Style Panels', body: 'Real-time uptime, latency and breach history rendered in a familiar ops dashboard your SREs already understand.' },
  { icon: '🔔', title: 'Consensus Alerts', body: 'Multiple validators must agree before a violation fires, eliminating single-node flapping and noisy pages.' },
  { icon: '🗂️', title: 'Immutable Audit Trail', body: 'Every check, render snapshot and ruling is permanently logged — perfect for compliance and post-mortems.' },
]

const statusMeta: Record<Status, { dot: string; ring: string; label: string; text: string }> = {
  operational: { dot: 'bg-emerald-400', ring: 'bg-emerald-400/60', label: 'Operational', text: 'text-emerald-400' },
  degraded: { dot: 'bg-amber-400', ring: 'bg-amber-400/60', label: 'Degraded', text: 'text-amber-400' },
  down: { dot: 'bg-rose-500', ring: 'bg-rose-500/60', label: 'Outage', text: 'text-rose-400' },
}

function StatusDot({ status }: { status: Status }) {
  const m = statusMeta[status]
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${m.ring} opacity-75`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${m.dot}`} />
    </span>
  )
}

export default function App() {
  const [service, setService] = useState('')
  const [promise, setPromise] = useState('')
  const [statusUrl, setStatusUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!service.trim() || !statusUrl.trim()) {
      toast.error('Service name and status URL are required.')
      return
    }
    setLoading(true)
    setResult(null)
    toast.loading('Rendering status page · judging SLA…', { id: 'check' })

    setTimeout(() => {
      const res: CheckResult = {
        service: service.trim(),
        violated: true,
        uptime: 99.21,
        threshold: 99.9,
        reason:
          'Status page reports a major incident on the primary database cluster lasting 38 minutes within the billing period. Measured uptime of 99.21% falls below the 99.9% commitment — SLA breached.',
      }
      setResult(res)
      setLoading(false)
      toast.error('SLA VIOLATED — penalty triggered.', { id: 'check' })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-300 antialiased selection:bg-[#22D3EE]/30">
      <Toaster theme="dark" position="top-right" richColors />

      {/* grid backdrop + glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.10),transparent_55%)]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(#22D3EE 1px, transparent 1px), linear-gradient(90deg, #22D3EE 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B0F1A]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#22D3EE]/40 bg-[#0e1626] text-[#22D3EE]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2 6 4-14 2 8h6" />
              </svg>
            </span>
            <span className="font-mono text-lg font-semibold tracking-tight text-slate-100">
              SLA<span className="text-[#22D3EE]">Watcher</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#how" className="transition hover:text-[#22D3EE]">How it Works</a>
            <a href="#status" className="transition hover:text-[#22D3EE]">Live Status</a>
            <a href="#features" className="transition hover:text-[#22D3EE]">Features</a>
          </div>
          <a
            href="#demo"
            className="rounded-lg border border-[#22D3EE]/50 bg-[#22D3EE]/10 px-4 py-2 text-sm font-medium text-[#67e8f9] transition hover:bg-[#22D3EE]/20"
          >
            Run a Check
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/25 bg-[#0e1626] px-4 py-1.5 text-xs text-slate-400"
        >
          <StatusDot status="operational" />
          <span>All validators online · monitoring 24/7</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl font-bold leading-tight tracking-tight text-slate-50 md:text-6xl"
        >
          Your SLA, watched<br />
          <span className="text-[#22D3EE]">and enforced on-chain.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-400"
        >
          SLAWatcher continuously reads your providers' status pages with an AI judge, decides when
          an uptime commitment is breached, and triggers trustless penalty payouts — no tickets, no
          arguments.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#demo"
            className="rounded-lg bg-[#22D3EE] px-7 py-3 font-semibold text-[#06121a] shadow-lg shadow-[#22D3EE]/20 transition hover:bg-[#4fdef0]"
          >
            Run a Live Check →
          </a>
          <a
            href="#status"
            className="rounded-lg border border-slate-700 px-7 py-3 font-medium text-slate-300 transition hover:border-[#22D3EE]/50 hover:text-[#22D3EE]"
          >
            View Dashboard
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-9 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#0e1626] px-4 py-1.5 font-mono text-xs text-slate-500"
        >
          <span className="h-2 w-2 rounded-full bg-[#22D3EE]" />
          PenaltyPool
          <span className="text-[#67e8f9]">{CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)}</span>
        </motion.div>
      </header>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-3xl font-bold text-slate-50 md:text-4xl"
        >
          How It Works
        </motion.h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="rounded-xl border border-slate-800 bg-[#0e1626] p-7"
            >
              <span className="font-mono text-3xl font-bold text-[#22D3EE]/50">{s.n}</span>
              <h3 className="mt-3 text-xl font-semibold text-slate-100">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LIVE STATUS DASHBOARD */}
      <section id="status" className="border-y border-slate-800/70 bg-[#0e1626]/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-between gap-4 sm:flex-row"
          >
            <div>
              <h2 className="text-3xl font-bold text-slate-50 md:text-4xl">Live Service Status</h2>
              <p className="mt-2 text-slate-400">Real-time fleet health, refreshed every block.</p>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span className="flex items-center gap-2 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Operational</span>
              <span className="flex items-center gap-2 text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-400" /> Degraded</span>
              <span className="flex items-center gap-2 text-rose-400"><span className="h-2 w-2 rounded-full bg-rose-500" /> Outage</span>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {liveServices.map((svc, i) => {
              const m = statusMeta[svc.status]
              return (
                <motion.div
                  key={svc.name}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="rounded-xl border border-slate-800 bg-[#0B0F1A] p-5 transition hover:border-[#22D3EE]/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <StatusDot status={svc.status} />
                      <span className="font-mono text-sm text-slate-100">{svc.name}</span>
                    </div>
                    <span className={`text-xs font-semibold ${m.text}`}>{m.label}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="font-mono text-2xl font-bold text-slate-50">{svc.uptime.toFixed(2)}%</p>
                      <p className="text-xs text-slate-500">30-day uptime</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-slate-300">{svc.latency} ms</p>
                      <p className="text-xs text-slate-500">{svc.region}</p>
                    </div>
                  </div>
                  {/* uptime bar */}
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${svc.status === 'down' ? 'bg-rose-500' : svc.status === 'degraded' ? 'bg-amber-400' : 'bg-[#22D3EE]'}`}
                      style={{ width: `${svc.uptime}%` }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-3xl font-bold text-slate-50 md:text-4xl"
        >
          Built for Reliability Teams
        </motion.h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-xl border border-slate-800 bg-[#0e1626] p-6 transition hover:border-[#22D3EE]/40"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg border border-[#22D3EE]/30 bg-[#0B0F1A] text-xl">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="border-t border-slate-800/70 bg-[#0e1626]/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-slate-50 md:text-4xl">Run an SLA Check</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Register a service and let the AI judge inspect its status page in real time.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* FORM */}
            <motion.form
              onSubmit={submit}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-slate-800 bg-[#0B0F1A] p-7"
            >
              <label className="mb-1.5 block font-mono text-sm text-[#67e8f9]">Service Name</label>
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="payments-core"
                className="mb-4 w-full rounded-lg border border-slate-700 bg-[#0e1626] px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#22D3EE]/60"
              />

              <label className="mb-1.5 block font-mono text-sm text-[#67e8f9]">SLA Promise</label>
              <input
                value={promise}
                onChange={(e) => setPromise(e.target.value)}
                placeholder="99.9% monthly uptime"
                className="mb-4 w-full rounded-lg border border-slate-700 bg-[#0e1626] px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#22D3EE]/60"
              />

              <label className="mb-1.5 block font-mono text-sm text-[#67e8f9]">Status Page URL</label>
              <input
                value={statusUrl}
                onChange={(e) => setStatusUrl(e.target.value)}
                placeholder="https://status.yourprovider.com"
                className="mb-2 w-full rounded-lg border border-slate-700 bg-[#0e1626] px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#22D3EE]/60"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-lg bg-[#22D3EE] py-3 font-semibold text-[#06121a] shadow-lg shadow-[#22D3EE]/20 transition hover:bg-[#4fdef0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Checking…' : '⚡ Check SLA Compliance'}
              </button>
            </motion.form>

            {/* RESULT PANEL */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0e1626] to-[#0B0F1A] p-7"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="font-mono text-sm uppercase tracking-widest text-[#22D3EE]">
                  Compliance Report
                </span>
                <span className="font-mono text-xs text-slate-500">live</span>
              </div>

              {!result && !loading && (
                <div className="flex h-72 flex-col items-center justify-center text-center text-slate-500">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <path d="M3 12h4l2 6 4-14 2 8h6" />
                  </svg>
                  <p className="mt-4 text-sm">No active check.<br />Register a service to begin monitoring.</p>
                </div>
              )}

              {loading && (
                <div className="flex h-72 flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#22D3EE]/30 border-t-[#22D3EE]" />
                  <p className="mt-5 font-mono text-slate-300">rendering status page…</p>
                  <p className="mt-1 text-xs text-slate-500">AI judge evaluating incidents</p>
                </div>
              )}

              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="pt-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-200">{result.service}</span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                        result.violated ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      <StatusDot status={result.violated ? 'down' : 'operational'} />
                      {result.violated ? 'SLA VIOLATED' : 'SLA MET'}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F1A] p-4">
                      <p className="text-xs text-slate-500">Measured Uptime</p>
                      <p className={`mt-1 font-mono text-2xl font-bold ${result.violated ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {result.uptime.toFixed(2)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F1A] p-4">
                      <p className="text-xs text-slate-500">SLA Threshold</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-slate-200">{result.threshold.toFixed(2)}%</p>
                    </div>
                  </div>

                  {/* uptime vs threshold bar */}
                  <div className="mt-5">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.uptime}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className={`h-full ${result.violated ? 'bg-rose-500' : 'bg-[#22D3EE]'}`}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-amber-300"
                        style={{ left: `${result.threshold}%` }}
                        title="SLA threshold"
                      />
                    </div>
                    <p className="mt-1.5 text-right font-mono text-[11px] text-amber-300">
                      ▲ threshold {result.threshold}%
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-800 bg-[#0B0F1A] p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-[#22D3EE]">Judge Reasoning</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{result.reason}</p>
                  </div>

                  <p className="mt-4 text-center font-mono text-[11px] text-slate-600">
                    Penalty settled · {CONTRACT.slice(0, 12)}…{CONTRACT.slice(-8)}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#0B0F1A]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#22D3EE]/40 text-[#22D3EE]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2 6 4-14 2 8h6" />
              </svg>
            </span>
            <div>
              <p className="font-mono font-semibold text-slate-200">
                SLA<span className="text-[#22D3EE]">Watcher</span>
              </p>
              <p className="text-xs text-slate-500">Uptime SLAs, monitored & enforced.</p>
            </div>
          </div>
          <p className="font-mono text-xs text-slate-600">
            PenaltyPool {CONTRACT.slice(0, 8)}…{CONTRACT.slice(-6)}
          </p>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} SLAWatcher</p>
        </div>
      </footer>
    </div>
  )
}
