# SLAWatcher

Decentralized SLA monitoring. AI validators fetch status pages, judge if promises are violated, auto-penalize breaches.

## Why This Exists

SLA promises are everywhere but enforcement is manual. Did that "99.9% uptime" guarantee actually hold? SLAWatcher registers SLA commitments on-chain, then AI validators continuously fetch real status data and judge whether breaches occurred — triggering automatic penalties.

## Why GenLayer

- **Fetches live data** — Validators hit actual status pages, API endpoints, and monitoring dashboards. Not relying on self-reported metrics from the provider.
- **Interprets "uptime" in context** — "99.9% uptime" for a payment API vs a blog means different things. Scheduled maintenance, partial outages, degraded performance — validators judge what counts as a violation.
- **Reads unstructured status pages** — Status pages aren't standardized. Some use traffic lights, some use prose ("experiencing elevated error rates"). AI validators parse whatever format the provider uses.
- **Breach severity assessment** — A 2-minute blip vs a 4-hour outage have different implications. Validators assess whether the breach is material enough to trigger penalties.
- **Tamper-proof monitoring** — Providers can't quietly edit their status page history. Once validators fetch and judge, the record is on-chain.

## Structure

```
SLAWatcher/
├── monitor/        # All code in one directory — GenLayer contract (.py),
│                   # Solidity (.sol), and UI (.html)
├── docs/           # Documentation and SLA templates
└── README.md
```

## Test Results

```
Input:  Register SLA — OpenAI API, 99.9% uptime guarantee
Output: SLA registered successfully
        get_sla() → { provider: "OpenAI", promise: "99.9% uptime", status: "monitoring" }
```

## Deployment

- **Network:** GenLayer Testnet
- **Contract:** `0x31B1A2Add1bc5D15bBE53Ad684aaf86a970ce8AC`

## Quick Start

```bash
cd monitor && open index.html
# Register an SLA: provider name + promise + status page URL
# Validators auto-monitor and flag breaches
```
