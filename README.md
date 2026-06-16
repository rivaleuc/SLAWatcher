# SLAWatcher

**On-chain SLA enforcement — AI validators render the provider's live status page, decide whether the promise is being kept, and feed a penalty pool.**

SLAWatcher turns a plain-language service-level promise ("99.9% uptime, no degraded performance") into something a decentralized network can monitor and adjudicate. Anyone registers a service with its status URL, then anyone can trigger a check: validators independently render the live status page, an LLM decides whether the SLA is currently violated, and the verdict is recorded on chain. A violation count drives a downstream penalty pool — no trusted monitoring vendor in the loop.

- **Contract (Bradbury, chain 4221):** `0xF24c6d7d878Fe52B1ce9f865ecEEE400882582D0`
- **Explorer:** https://explorer-bradbury.genlayer.com/contract/0xF24c6d7d878Fe52B1ce9f865ecEEE400882582D0
- **Live app:** https://slawatcher.pages.dev

## What it does

1. **`register_sla(service_name, sla_promise, status_url)`** — a `@gl.public.write` method. Stores the SLA as a JSON record (owner, service, promise, status URL, `violated=False`, `last_reason`, `checks=0`) in the `slas` `TreeMap[str, str]`, keyed by an incrementing `sla_count`, and returns the key.
2. **`check_violation(sla_key)`** — a `@gl.public.write` method that runs the live compliance check, increments the SLA's `checks`, updates `violated` / `last_reason`, and bumps the global `violation_count` when a breach is found.
3. The private `_check(sla)` builds the non-deterministic block:
   - **Validators crawl the live status page.** `leader_fn` calls `gl.nondet.web.render(status_url, mode="text", wait_after_loaded="3s")` so JavaScript-driven status dashboards fully load before the first 4000 chars are captured.
   - **An LLM acts as compliance monitor.** `gl.nondet.exec_prompt(prompt, response_format="json")` receives the service, the promise, and the rendered page, and must reply `{"violated": true/false, "reason": "..."}`.
   - **Consensus via `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`.** `validator_fn` requires a `gl.vm.Return`, a boolean `violated`, and a string `reason` — validators agree the verdict is well-formed, not that their rendered pages were byte-identical.
4. **Reads** are free `@gl.public.view` calls: `get_sla(key)` (full record), `read_violation(key)` → `{checked, violated, reason}` for the penalty pool to act on, and `stats()` → `{total_slas, violations}`.

All state lives in the `slas` `TreeMap`; counters `sla_count` and `violation_count` are `u256`.

## Why GenLayer

A deterministic EVM cannot read a status page and decide "is this SLA being honored right now?" Rendering a live, JS-heavy dashboard is non-deterministic — every node would see slightly different bytes — and interpreting "degraded performance" against a written promise is a judgment, not a hash comparison.

GenLayer's **Optimistic Democracy** lets validators each render the page and reason about it, then *vote* on whether the leader's violation verdict is acceptable. The contract holds the rules and the tally; the validators supply the observation and the judgment.

Use SLAWatcher when compliance depends on reading messy, human-facing evidence (status pages, incident notices) on a recurring basis. Use a backend cron + webhook when you already have a structured, signed uptime feed — that is mechanical and does not need a validator network.

## Architecture

| GenLayer contract | Frontend dir | EVM / off-chain |
| --- | --- | --- |
| `monitor/sla_watcher.py` | `monitor/app/` (React + Vite) | `monitor/PenaltyPool.sol` (penalty pool reading violation state); `monitor/dashboard.html` (static dashboard) |

## Tech

- **GenVM Python**, pinned to `py-genlayer:1jb45aa8…jpz09h6` via the `# { "Depends": ... }` header. Typed storage: `TreeMap[str, str]` plus `u256` counters.
- **`genlayer-js`** handles all reads (`client.readContract`) against `testnetBradbury`. Writes use **MetaMask with no Snap** — the app drives `window.ethereum`, ensures **chain 4221** (`0x107d`, auto-adding the Bradbury network), submits via `client.writeContract`, and waits for `FINALIZED`.
- **App-specific UI:** a React 19 + Vite dashboard (Tailwind v4, `framer-motion`, `sonner`) to register services, trigger checks, and show each SLA's live violation status and reason.

## Project structure

```
SLAWatcher/
├── monitor/
│   ├── sla_watcher.py            ← GenLayer contract (SLA monitoring)
│   ├── PenaltyPool.sol           ← EVM penalty pool
│   ├── dashboard.html            ← static dashboard
│   └── app/                      ← frontend (Cloudflare Pages root)
│       ├── src/
│       │   ├── App.tsx           ← register / check / status UI
│       │   ├── genlayer.ts       ← client, wallet, read/write helpers
│       │   ├── main.tsx
│       │   └── index.css
│       ├── public/
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
├── docs/
└── README.md
```

## Develop

```bash
cd monitor/app
npm install
npm run dev      # local dev server (Vite)
npm run build    # type-check + production build to dist/
```

## Deploy the frontend

Cloudflare Pages:

- **Root directory:** `monitor/app`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `NODE_VERSION=20`

## Why GenLayer (engineering notes)

Real gotchas learned building this:

- **Integers, not floats.** Check counts and the global `violation_count` are integer `u256`. Any uptime/penalty math downstream is done in integer basis points, never floats, so validators stay byte-stable.
- **Validate structure, not exact LLM output.** `validator_fn` only checks `violated` is a `bool` and `reason` is a `str`. It never compares the leader's free-text reason — two validators rendering the page seconds apart will phrase it differently and still agree the verdict is valid.
- **ACCEPTED ≠ executed.** Reaching consensus means validators accepted the violation verdict, not that any penalty was charged. `PenaltyPool.sol` must read `read_violation` and act as a separate step.
- **Optimistic finality has an appeal window.** A check result is provisional until the appeal window elapses; the frontend waits for `FINALIZED` before treating an SLA as breached.
- **Evidence is untrusted (greybox).** The status page comes from a user-supplied URL and is rendered, not trusted — the prompt treats page content as adversarial input, and a failed render degrades to `(fetch failed)` so a flaky page can't crash the check.

## License

MIT
