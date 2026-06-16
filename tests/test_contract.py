"""Tests for SLAWatcher anchor: status == ('breached' if violated else 'healthy')."""
import json

import pytest


def registered(contract_module, gl_runtime):
    c = contract_module.SLAWatcher()
    key = c.register_sla("API Gateway", "99.9% uptime", "https://status.example.com")
    return c, key


@pytest.mark.parametrize(
    "llm_out,expected_violated,expected_status",
    [
        ({"violated": True, "reason": "major outage in us-east-1"}, True, "breached"),
        ({"violated": False, "reason": "all systems operational"}, False, "healthy"),
        ({"violated": "yes", "reason": "degraded performance widely"}, True, "breached"),
        ({"violated": 0, "reason": "no incidents reported today"}, False, "healthy"),
    ],
)
def test_anchor_holds(contract_module, gl_runtime, llm_out, expected_violated, expected_status):
    gl_runtime.nondet.exec_prompt = lambda prompt, _o=llm_out, **kw: dict(_o)
    c, key = registered(contract_module, gl_runtime)
    c.check_violation(key)
    sla = json.loads(c.slas[key])
    assert sla["violated"] is expected_violated
    assert sla["status"] == expected_status
    # anchor invariant:
    assert sla["status"] == ("breached" if sla["violated"] else "healthy")


def test_normalized_output_always_validates(contract_module, gl_runtime):
    weird = [
        {"violated": True, "reason": "x"},               # short reason -> padded
        {"violated": False, "reason": ""},               # empty -> padded
        {"violated": "true", "reason": "short"},         # truthy str + short
        {"reason": "missing violated key here"},         # missing -> False
        {"violated": True},                              # missing reason -> padded
    ]
    for out in weird:
        gl_runtime.nondet.exec_prompt = lambda prompt, _o=out, **kw: dict(_o)
        c, key = registered(contract_module, gl_runtime)
        c.check_violation(key)
        validator = gl_runtime.vm.last_validator
        ret = gl_runtime.vm.Return(gl_runtime.vm.last_leader_result)
        assert validator(ret) is True


def test_validator_rejects_bad_inputs(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"violated": True, "reason": "outage detected"}
    c, key = registered(contract_module, gl_runtime)
    c.check_violation(key)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return

    bad = [
        "not-a-return",
        R("{bad"),
        # violated not bool
        R(json.dumps({"violated": "yes", "reason": "long enough reason", "status": "breached"})),
        # reason too short (< 8)
        R(json.dumps({"violated": True, "reason": "short", "status": "breached"})),
        # reason non-str
        R(json.dumps({"violated": True, "reason": 99, "status": "breached"})),
        # ANCHOR violation: violated True but status healthy
        R(json.dumps({"violated": True, "reason": "outage everywhere", "status": "healthy"})),
        # ANCHOR violation: violated False but status breached
        R(json.dumps({"violated": False, "reason": "all good here now", "status": "breached"})),
        # missing status
        R(json.dumps({"violated": True, "reason": "outage everywhere"})),
    ]
    for b in bad:
        assert validator(b) is False


def test_good_input_validates(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"violated": False, "reason": "operational"}
    c, key = registered(contract_module, gl_runtime)
    c.check_violation(key)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return
    assert validator(R(json.dumps({"violated": True, "reason": "outage confirmed", "status": "breached"}))) is True
    assert validator(R(json.dumps({"violated": False, "reason": "fully operational", "status": "healthy"}))) is True
