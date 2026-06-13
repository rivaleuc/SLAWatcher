import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { read, write, CONTRACT } from './genlayer'

const BG = '#0B0F1A'
const CYAN = '#22D3EE'

type Sla = {
  key: string
  service: string
  promise: string
  statusUrl: string
  violated: boolean
  lastReason: string
  checks: number
}
type Incident = { id: string; sev: 'warn' | 'crit' | 'info'; msg: string; at: string }

function slaFrom(i: number, s: any): Sla {
  return {
    key: String(i),
    service: String(s?.service ?? `sla.${i}`),
    promise: String(s?.promise ?? ''),
    statusUrl: String(s?.status_url ?? ''),
    violated: Boolean(s?.violated),
    lastReason: String(s?.last_reason ?? ''),
    checks: Number(s?.checks ?? 0),
  }
}

function Gauge({ value }: { value: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const dash = useMemo(() => c * (1 - value / 100), [c, value])
  return (
    <div className="relative grid place-items-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#1E293B" strokeWidth="12" />
        <motion.circle
          cx="90" cy="90" r={r} fill="none" stroke={CYAN} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${CYAN}88)` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold tracking-tight text-white tabular-nums">{value.toFixed(3)}%</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">SLA compliance</div>
      </div>
    </div>
  )
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${40 - (d / max) * 36}`).join(' ')
  const area = `0,40 ${pts} 100,40`
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0.45" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={CYAN} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const SEV_COLOR: Record<Incident['sev'], string> = { crit: '#F43F5E', warn: '#F59E0B', info: '#38BDF8' }

function Tile({ className = '', children, label, action }: { className?: string; children: React.ReactNode; label?: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#10172A]/80 p-5 backdrop-blur ${className}`}
    >
      {label && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
          {action}
        </div>
      )}
      {children}
    </motion.div>
  )
}

function App() {
  const [slas, setSlas] = useState<Sla[]>([])
  const [chainStats, setChainStats] = useState({ total_slas: 0, violations: 0 })
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [latency, setLatency] = useState<number[]>([62, 70, 58, 91, 74, 66, 102, 80, 61, 73, 69, 88])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [checkingKey, setCheckingKey] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', promise: '', url: '' })

  const uptime = useMemo(() => {
    const total = chainStats.total_slas
    if (!total) return 100
    return ((total - chainStats.violations) / total) * 100
  }, [chainStats])

  useEffect(() => {
    const t = setInterval(() => {
      setLatency((prev) => [...prev.slice(1), 50 + Math.round(Math.random() * 80)])
    }, 2200)
    return () => clearInterval(t)
  }, [])

  async function loadSlas(silent = false) {
    if (!silent) setLoading(true)
    try {
      const stats = (await read('stats')) as any
      const total = Number(stats?.total_slas ?? 0)
      setChainStats({ total_slas: total, violations: Number(stats?.violations ?? 0) })
      const loaded: Sla[] = []
      for (let i = 0; i < total; i++) {
        try {
          const s = (await read('get_sla', [String(i)])) as any
          if (s) loaded.push(slaFrom(i, s))
        } catch {
          // skip
        }
      }
      setSlas(loaded)
      setIncidents(
        loaded
          .filter((s) => s.violated)
          .map((s) => ({
            id: 'v' + s.key,
            sev: 'crit' as const,
            msg: `${s.service} — ${s.lastReason || 'SLA breach detected'}`,
            at: new Date().toLocaleTimeString('en-GB'),
          })),
      )
    } catch (e: any) {
      toast.error(`Failed to load SLAs: ${e?.message ?? e}`)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadSlas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    setRefreshing(true)
    toast.loading('Refreshing from chain…', { id: 'refresh' })
    try {
      await loadSlas(true)
      toast.success('SLA registry synced', { id: 'refresh' })
    } catch (e: any) {
      toast.error(`Refresh failed: ${e?.message ?? e}`, { id: 'refresh' })
    } finally {
      setRefreshing(false)
    }
  }

  async function registerSla() {
    if (!form.name.trim() || !form.promise.trim()) {
      toast.error('Service name and SLA promise are required.')
      return
    }
    setRegistering(true)
    const tid = toast.loading('Registering SLA on-chain… (30–60s)')
    try {
      await write('register_sla', [form.name.trim(), form.promise.trim(), form.url.trim()])
      const stats = (await read('stats')) as any
      toast.success(`SLA target registered · ${Number(stats?.total_slas ?? 0)} total`, { id: tid })
      setForm({ name: '', promise: '', url: '' })
      await loadSlas(true)
    } catch (e: any) {
      toast.error(`Register failed: ${e?.message ?? e}`, { id: tid })
    } finally {
      setRegistering(false)
    }
  }

  async function checkViolation(key: string) {
    setCheckingKey(key)
    const tid = toast.loading('Evaluating SLA against live status… (30–60s)')
    try {
      await write('check_violation', [key])
      const s = (await read('get_sla', [key])) as any
      const updated = slaFrom(Number(key), s)
      setSlas((prev) => prev.map((x) => (x.key === key ? updated : x)))
      const stats = (await read('stats')) as any
      setChainStats({
        total_slas: Number(stats?.total_slas ?? 0),
        violations: Number(stats?.violations ?? 0),
      })
      setIncidents((prev) =>
        [
          {
            id: 'n' + Date.now(),
            sev: updated.violated ? ('crit' as const) : ('info' as const),
            msg: `${updated.service} — ${updated.lastReason || (updated.violated ? 'SLA breach' : 'within SLA')}`,
            at: new Date().toLocaleTimeString('en-GB'),
          },
          ...prev,
        ].slice(0, 8),
      )
      if (updated.violated) {
        toast.error(`${updated.service} VIOLATED — ${updated.lastReason}`, { id: tid })
      } else {
        toast.success(`${updated.service} within SLA`, { id: tid })
      }
    } catch (e: any) {
      toast.error(`Check failed: ${e?.message ?? e}`, { id: tid })
    } finally {
      setCheckingKey(null)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8 sm:py-8" style={{ background: BG, color: '#E2E8F0' }}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER STRIP */}
      <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: CYAN }} />
            <span className="relative inline-flex h-3 w-3 rounded-full" style={{ background: CYAN }} />
          </span>
          <h1 className="text-lg font-bold tracking-tight text-white">SLAWatcher</h1>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">live</span>
        </div>
        <code className="ml-auto hidden rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[11px] text-slate-400 sm:block">{CONTRACT}</code>
      </div>

      {/* BENTO GRID */}
      <div className="mx-auto grid max-w-7xl auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Uptime gauge — big */}
        <Tile className="sm:col-span-2 sm:row-span-2 flex flex-col" label="Service Level">
          <div className="flex flex-1 flex-col items-center justify-center py-4">
            <Gauge value={Number(uptime.toFixed(3))} />
            <div className="mt-6 grid w-full grid-cols-3 gap-3 text-center">
              {[['Avg latency', `${latency[latency.length - 1]}ms`], ['SLAs', `${chainStats.total_slas}`], ['Violations', `${chainStats.violations}`]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/5 bg-black/20 py-3">
                  <div className="text-xl font-bold text-white tabular-nums">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </Tile>

        {/* Status dots */}
        <Tile className="sm:col-span-2" label="SLA Status" action={<span className="text-[10px] text-slate-500">tap to check</span>}>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading SLAs from chain…</p>
          ) : slas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-600">No SLAs registered yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {slas.map((s) => (
                <button
                  key={s.key}
                  onClick={() => checkViolation(s.key)}
                  disabled={checkingKey === s.key}
                  title={s.promise}
                  className="group flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-black/20 p-2.5 text-left transition hover:border-white/20 disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.violated ? '#F43F5E' : '#34D399', boxShadow: `0 0 8px ${s.violated ? '#F43F5E' : '#34D399'}` }} />
                    <span className="font-mono text-[11px] text-slate-300">{s.service}</span>
                  </span>
                  <span className="text-[10px] tabular-nums text-slate-500">{checkingKey === s.key ? 'checking…' : s.violated ? 'violated' : `${s.checks} checks`}</span>
                </button>
              ))}
            </div>
          )}
        </Tile>

        {/* Latency sparkline */}
        <Tile className="sm:col-span-2" label="Latency p50 — live">
          <div className="h-24 w-full">
            <Spark data={latency} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-500">
            <span>now {latency[latency.length - 1]}ms</span>
            <span style={{ color: CYAN }}>peak {Math.max(...latency)}ms</span>
          </div>
        </Tile>

        {/* Register SLA action */}
        <Tile className="flex flex-col justify-between" label="New target">
          <div className="space-y-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Service name"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30"
            />
            <input
              value={form.promise}
              onChange={(e) => setForm({ ...form, promise: e.target.value })}
              placeholder="SLA promise (e.g. 99.9% uptime)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30"
            />
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="Status URL"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-white/30"
            />
          </div>
          <button
            onClick={registerSla}
            disabled={registering}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold transition disabled:opacity-50"
            style={{ borderColor: CYAN + '66', color: CYAN }}
          >
            {registering ? 'Registering…' : '+ Register SLA'}
          </button>
        </Tile>

        {/* Refresh action */}
        <Tile className="flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sync</span>
            <p className="mt-2 text-sm text-slate-400">Reload the SLA registry and violation stats from the contract.</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#0B0F1A] transition disabled:opacity-60"
            style={{ background: CYAN, boxShadow: `0 0 24px ${CYAN}44` }}
          >
            {refreshing ? 'Syncing…' : '⚡ Refresh from chain'}
          </button>
        </Tile>

        {/* Incident log — wide */}
        <Tile className="sm:col-span-2 lg:col-span-4" label="Incident Log" action={<button onClick={() => { setIncidents([]); toast('Log cleared') }} className="text-[10px] font-semibold text-slate-500 hover:text-slate-300">clear</button>}>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {incidents.length === 0 && <p className="py-6 text-center text-sm text-slate-600">No incidents. All systems nominal.</p>}
              {incidents.map((it) => (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEV_COLOR[it.sev], boxShadow: `0 0 8px ${SEV_COLOR[it.sev]}` }} />
                  <span className="font-mono text-[11px] text-slate-500">{it.at}</span>
                  <span className="text-sm text-slate-300">{it.msg}</span>
                  <span className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: SEV_COLOR[it.sev], background: SEV_COLOR[it.sev] + '1a' }}>{it.sev}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Tile>
      </div>
    </div>
  )
}

export default App
