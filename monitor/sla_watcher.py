import json
from backend.node.genvm.icontract import IContract
from backend.node.genvm.equivalence_principle import call_llm_with_principle


class SlaWatcher(IContract):
    def __init__(self):
        self.slas = {}
        self.violations = {}
        self.next_id = 0

    def register_sla(self, service_name: str, sla_promise: str, status_url: str) -> str:
        key = f"sla_{self.next_id}"
        self.next_id += 1
        self.slas[key] = {
            "service_name": service_name,
            "sla_promise": sla_promise,
            "status_url": status_url,
            "checks": 0,
            "violations_count": 0,
        }
        return key

    def check_violation(self, sla_key: str) -> dict:
        sla = self.slas[sla_key]
        page_content = self.get_webpage(sla["status_url"])
        prompt = (
            f"Service: {sla['service_name']}\n"
            f"SLA Promise: {sla['sla_promise']}\n"
            f"Status page content:\n{page_content}\n\n"
            f"Based on the status page, is the SLA violated? "
            f"Respond with JSON: {{\"violated\": true/false, \"reason\": \"...\"}}"
        )
        result = call_llm_with_principle(prompt, "The status page content is the same for all validators.")
        parsed = json.loads(result)
        sla["checks"] += 1
        if parsed["violated"]:
            sla["violations_count"] += 1
            self.violations[sla_key] = {
                "violated": True,
                "reason": parsed["reason"],
                "service_name": sla["service_name"],
                "sla_promise": sla["sla_promise"],
            }
        return parsed

    def get_sla(self, key: str) -> dict:
        return self.slas[key]

    def read_violation(self, key: str) -> dict:
        return self.violations.get(key, {"violated": False, "reason": ""})

    def stats(self) -> dict:
        return {
            "total_slas": len(self.slas),
            "total_violations": sum(1 for v in self.violations.values() if v["violated"]),
            "total_checks": sum(s["checks"] for s in self.slas.values()),
        }
