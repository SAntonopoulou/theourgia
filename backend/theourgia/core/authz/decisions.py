"""Authorization decision value type.

A :class:`AuthorizationDecision` is what a policy returns — or what
``authorize()`` returns to the caller after composing policies. Carries
the verdict (``allowed``), the human-readable reason, and the policy
name (for audit + debugging).

Policies may also return ``None`` to **abstain** — letting the next
registered policy decide. The first non-abstain wins. If every policy
abstains, the default is **deny**.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["AuthorizationDecision"]


@dataclass(frozen=True, slots=True)
class AuthorizationDecision:
    """A policy verdict.

    Attributes:
        allowed: True for permit, False for deny.
        reason: Short human-readable explanation. Surfaced to the
            client on denial (don't put secrets here — keep to one
            line of "why was this denied" appropriate for end users).
        policy_name: Which policy produced this decision. Used by the
            audit log + structured-log lines. Populated by the
            registry when absent.
    """

    allowed: bool
    reason: str = ""
    policy_name: str = ""

    @classmethod
    def allow(cls, reason: str = "", policy_name: str = "") -> "AuthorizationDecision":
        return cls(allowed=True, reason=reason, policy_name=policy_name)

    @classmethod
    def deny(cls, reason: str, policy_name: str = "") -> "AuthorizationDecision":
        if not reason:
            reason = "denied"
        return cls(allowed=False, reason=reason, policy_name=policy_name)
