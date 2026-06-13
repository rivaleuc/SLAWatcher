import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0x31B1A2Add1bc5D15bBE53Ad684aaf86a970ce8AC'

const BG = '#0B0F1A'
const CYAN = '#22D3EE'

type Endpoint = { name: string; up: boolean; ms: number }
type Incident = { id: string; sev: 'warn' | 'crit' | 'info'; msg: string; at: string }

const INITIAL_ENDPOINTS: Endpoint[] = [
  { name: 'api.gateway', up: true, ms: 42 },
  { name: 'auth.service', up: true, ms: 88 },
  { name: 'ledger.rpc', up: true, ms: 61 },
  { name: 'oracle.feed', up: false, ms: 0 },
  { name: 'cdn.edge', up: true, ms: 24 },
  { name: 'queue.worker', up: true, ms: 133 },
  { name: 'db.primary', up: true, ms: 17 },
  { name: 'webhook.out', up: true, ms: 70 },
]

const INITIAL_INCIDENTS: Incident[] = [
  { id: 'i1', sev: 'crit', msg: 'oracle.feed unreachable — SLA breach', at: '20:31:04' },
  { id: 'i2', sev: 'warn', msg: 'queue.worker latency > 120ms', at: '20:18:55' },
  { id: 'i3', sev: 'info', msg: 'auth.service auto-recovered', at: '19:57:12' },
  { id: 'i4', sev: 'warn', msg: 'cdn.edge p99 spike in eu-west', at: '19:44:30' },
]

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
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">30-day uptime</div>
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
  const [endpoints, setEndpoints] = useState(INITIAL_ENDPOINTS)
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)
  const [latency, setLatency] = useState<number[]>([62, 70, 58, 91, 74, 66, 102, 80, 61, 73, 69, 88])
  const [checking, setChecking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const tick = useRef(0)

  const uptime = useMemo(() => {
    const up = endpoints.filter((e) => e.up).length
    return 99 + (up / endpoints.length)
  }, [endpoints])

  const avgMs = useMemo(() => {
    const live = endpoints.filter((e) => e.up)
    return Math.round(live.reduce((a, b) => a + b.ms, 0) / Math.max(live.length, 1))
  }, [endpoints])

  useEffect(() => {
    const t = setInterval(() => {
      tick.current += 1
      setLatency((prev) => [...prev.slice(1), 50 + Math.round(Math.random() * 80)])
    }, 2200)
    return () => clearInterval(t)
  }, [])

  function checkNow() {
    setChecking(true)
    toast.loading('Probing all endpoints…', { id: 'check' })
    setTimeout(() => {
      setEndpoints((prev) => prev.map((e) => ({ ...e, ms: e.up ? 15 + Math.round(Math.random() * 130) : 0 })))
      setChecking(false)
      toast.success('Health sweep complete', { id: 'check', description: `${endpoints.filter((e) => e.up).length}/${endpoints.length} endpoints healthy` })
    }, 1200)
  }

  function addSLA() {
    setScanning(true)
    setTimeout(() => {
      const name = ['svc.alpha', 'svc.beta', 'svc.gamma', 'svc.delta'][Math.floor(Math.random() * 4)] + '.' + Math.floor(Math.random() * 90 + 10)
      setEndpoints((prev) => [...prev, { name, up: true, ms: 20 + Math.round(Math.random() * 90) }])
      setScanning(false)
      toast.success('SLA target registered', { description: name })
    }, 700)
  }

  function recover(name: string) {
    setEndpoints((prev) => prev.map((e) => (e.name === name ? { ...e, up: !e.up, ms: e.up ? 0 : 50 } : e)))
    setIncidents((prev) => [{ id: 'n' + Date.now(), sev: 'info', msg: `${name} state toggled`, at: new Date().toLocaleTimeString('en-GB') }, ...prev].slice(0, 8))
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
              {[['Avg latency', `${avgMs}ms`], ['Endpoints', `${endpoints.length}`], ['Down', `${endpoints.filter((e) => !e.up).length}`]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/5 bg-black/20 py-3">
                  <div className="text-xl font-bold text-white tabular-nums">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </Tile>

        {/* Status dots */}
        <Tile className="sm:col-span-2" label="Endpoint Status" action={<span className="text-[10px] text-slate-500">tap to toggle</span>}>
          <div className="grid grid-cols-4 gap-2.5">
            {endpoints.map((e) => (
              <button
                key={e.name}
                onClick={() => recover(e.name)}
                className="group flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-black/20 p-2.5 text-left transition hover:border-white/20"
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.up ? '#34D399' : '#F43F5E', boxShadow: `0 0 8px ${e.up ? '#34D399' : '#F43F5E'}` }} />
                  <span className="font-mono text-[11px] text-slate-300">{e.name}</span>
                </span>
                <span className="text-[10px] tabular-nums text-slate-500">{e.up ? `${e.ms}ms` : 'offline'}</span>
              </button>
            ))}
          </div>
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

        {/* Add SLA action */}
        <Tile className="flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">New target</span>
            <p className="mt-2 text-sm text-slate-400">Register an endpoint to monitor against an SLA contract.</p>
          </div>
          <button
            onClick={addSLA}
            disabled={scanning}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold transition disabled:opacity-50"
            style={{ borderColor: CYAN + '66', color: CYAN }}
          >
            {scanning ? 'Provisioning…' : '+ Add SLA'}
          </button>
        </Tile>

        {/* Check now action */}
        <Tile className="flex flex-col justify-between" >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Manual probe</span>
            <p className="mt-2 text-sm text-slate-400">Force an immediate health sweep across all targets.</p>
          </div>
          <button
            onClick={checkNow}
            disabled={checking}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#0B0F1A] transition disabled:opacity-60"
            style={{ background: CYAN, boxShadow: `0 0 24px ${CYAN}44` }}
          >
            {checking ? 'Probing…' : '⚡ Check now'}
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
