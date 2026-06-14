# SLAWatcher

Decentralized SLA monitoring. AI validators fetch status pages, judge if uptime promises are violated, and trigger automatic penalties.

## Why GenLayer

SLA monitoring requires live data + interpretation:

- **"99.9% uptime" means different things in different contexts.** Does a 5-minute degradation count? Does scheduled maintenance? AI validators interpret the promise against actual status data.
- **Live web fetching with no oracle.** Validators use `gl.nondet.web.render` to pull real status page data directly — no Chainlink, no centralized uptime monitor to trust.
- **Status pages are messy.** They have different formats, use vague language ("experiencing elevated error rates"), and require understanding context. Pattern matching won't work — judgment will.
- **Automated enforcement.** Once violated, the PenaltyPool contract slashes the provider's bond automatically. No filing tickets, no arguing with support.

## Deployed

**GenLayer (Bradbury):** `0x31B1A2Add1bc5D15bBE53Ad684aaf86a970ce8AC`

## Structure

```
SLAWatcher/
├── monitor/
│   ├── sla_watcher.py       ← GenLayer contract
│   ├── PenaltyPool.sol      ← Provider bond + slash
│   └── index.html           ← Dashboard UI
└── docs/
    └── README.md
```

Ultra-flat: everything operational in one folder.
