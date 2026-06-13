# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *


class SLAWatcher(gl.Contract):
    slas: TreeMap[str, str]
    sla_count: u256
    violation_count: u256

    def __init__(self):
        self.sla_count = u256(0)
        self.violation_count = u256(0)

    @gl.public.write
    def register_sla(self, service_name: str, sla_promise: str, status_url: str) -> str:
        key = str(int(self.sla_count))
        sla = {
            "owner": str(gl.message.sender_address),
            "service": str(service_name).strip(),
            "promise": str(sla_promise).strip(),
            "status_url": str(status_url).strip(),
            "violated": False,
            "last_reason": "",
            "checks": 0,
        }
        self.slas[key] = json.dumps(sla)
        self.sla_count += u256(1)
        return key

    @gl.public.write
    def check_violation(self, sla_key: str) -> None:
        sla_key = str(sla_key)
        if sla_key not in self.slas:
            raise Exception("unknown SLA")
        sla = json.loads(self.slas[sla_key])

        verdict = self._check(sla)
        sla["checks"] += 1
        sla["violated"] = verdict["violated"]
        sla["last_reason"] = verdict["reason"]
        if verdict["violated"]:
            self.violation_count += u256(1)
        self.slas[sla_key] = json.dumps(sla)

    def _check(self, sla: dict) -> dict:
        service = sla["service"]
        promise = sla["promise"]
        status_url = sla["status_url"]

        def leader_fn() -> str:
            page = "(fetch failed)"
            if status_url.startswith("http"):
                try:
                    raw = gl.nondet.web.render(status_url, mode="text", wait_after_loaded="3s")
                    page = raw[:4000]
                except Exception:
                    pass

            prompt = f"""You are an SLA compliance monitor.

SERVICE: {service}
SLA PROMISE: {promise}

STATUS PAGE CONTENT:
{page}

RULES:
1. Based on the status page, determine if the SLA is currently violated.
2. Look for: outages, degraded performance, incidents, downtime percentages.
3. If no issues visible, SLA is NOT violated.

Reply ONLY valid JSON:
{{"violated": true/false, "reason": "<brief explanation>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, dict):
                return json.dumps(raw)
            return str(raw).strip()

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
                if not isinstance(data.get("violated"), bool):
                    return False
                if not isinstance(data.get("reason"), str):
                    return False
                return True
            except Exception:
                return False

        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_sla(self, key: str) -> dict:
        key = str(key)
        if key not in self.slas:
            return {"exists": False}
        return json.loads(self.slas[key])

    @gl.public.view
    def read_violation(self, key: str) -> dict:
        key = str(key)
        if key not in self.slas:
            return {"checked": False}
        sla = json.loads(self.slas[key])
        return {"checked": True, "violated": sla["violated"], "reason": sla["last_reason"]}

    @gl.public.view
    def stats(self) -> dict:
        return {
            "total_slas": int(self.sla_count),
            "violations": int(self.violation_count),
        }
