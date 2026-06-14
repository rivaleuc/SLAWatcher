# SLAWatcher

AI-powered SLA violation monitor. Fetches service status pages and uses AI to judge whether SLA promises are being met.

## Structure

```
monitor/       # All code (Python contract + Solidity + HTML dashboard)
docs/          # Documentation
```

## GenLayer Contract (sla_watcher.py)

- `register_sla(service_name, sla_promise, status_url)` → key
- `check_violation(sla_key)` → AI fetches status page, returns `{violated, reason}`
- `get_sla(key)` → SLA details
- `read_violation(key)` → latest violation info (used by PenaltyPool)
- `stats()` → aggregate statistics

## Solidity Contract (PenaltyPool.sol)

Providers stake a bond. If SLA is violated, bond is partially slashed to compensate the customer.

## Deploy

```bash
genlayer deploy --contract /Users/rivale/SLAWatcher/monitor/sla_watcher.py
```

