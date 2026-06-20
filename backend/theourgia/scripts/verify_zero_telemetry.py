"""Automated verifier: Theourgia ships with zero telemetry by default.

Runs as a one-shot script (``python -m theourgia.scripts.verify_zero_telemetry``)
and as the test :mod:`tests.test_zero_telemetry`. Exits 0 if all
invariants hold, non-zero with a diagnostic message otherwise.

The verifier enforces three claims that, taken together, make the
"zero telemetry by default" promise real and machine-checkable:

1. **Public claim.** ``GET /api/v1/meta`` reports ``telemetry: "none"``
   in stock configuration.
2. **Sentry off by default.** With no ``SENTRY_DSN`` set,
   ``init_sentry`` returns ``False``.
3. **No telemetry libraries snuck in.** A blocklist of common analytics
   / telemetry SDKs that must not be importable in the default install
   (they may appear under opt-in extras, but not in core).

The verifier is intentionally narrow — it does NOT try to run a full
live process and watch the wire for surprise outbound traffic. That
test is harder to keep portable (CI sandboxes differ) and would not
catch the cases we actually care about anyway. The blocklist + the
Sentry check + the public claim are enough to make a regression
mechanical to spot.

When you ADD a real telemetry feature, this script doesn't need to
change — opt-in features stay outside the default install path. The
script catches *accidental* additions to core.
"""

from __future__ import annotations

import importlib.util
import sys
from collections.abc import Iterable
from dataclasses import dataclass

__all__ = [
    "DEFAULT_BLOCKLIST",
    "VerifierResult",
    "verify_zero_telemetry",
    "main",
]


DEFAULT_BLOCKLIST: tuple[str, ...] = (
    # Analytics SDKs
    "mixpanel",
    "amplitude",
    "amplitude_analytics",
    "posthog",
    "segment_analytics",
    "segment",
    "rudderstack",
    "rudder_analytics",
    # Vendor analytics
    "google_analytics",
    # Generic dial-home libraries that have no place in our default install
    "datadog",
    "newrelic",
    "rollbar",
)
"""Modules that must NOT be importable in the default install.

Each is a top-level Python package name (what ``importlib.util.find_spec``
takes). Opt-in extras may add some of these in operator-controlled
deployments, but they cannot ride the default ``pip install theourgia``."""


@dataclass(frozen=True, slots=True)
class VerifierResult:
    """Outcome of one verifier run."""

    passed: bool
    failures: tuple[str, ...]

    def render(self) -> str:
        if self.passed:
            return "zero-telemetry verifier: PASS"
        lines = ["zero-telemetry verifier: FAIL"]
        lines.extend(f"  - {f}" for f in self.failures)
        return "\n".join(lines)


def verify_zero_telemetry(
    *,
    blocklist: Iterable[str] = DEFAULT_BLOCKLIST,
    check_imports: bool = True,
    check_sentry_default: bool = True,
    check_meta_claim: bool = True,
) -> VerifierResult:
    """Run all enabled checks and return a structured result."""
    failures: list[str] = []

    if check_imports:
        import sys

        for name in blocklist:
            # find_spec misses modules that were injected into sys.modules
            # without a __spec__ (which is how tests simulate a "present"
            # module). Also count direct sys.modules membership.
            spec_found = False
            try:
                spec_found = importlib.util.find_spec(name) is not None
            except (ImportError, ValueError):
                # Modules injected without a real __spec__ raise ValueError
                # from find_spec — treat their presence in sys.modules as
                # "importable" for blocklist purposes.
                spec_found = name in sys.modules
            if spec_found or name in sys.modules:
                failures.append(
                    f"telemetry library importable in default install: {name!r} "
                    f"— move it under an opt-in [extra] in pyproject.toml"
                )

    if check_sentry_default:
        sentry_failure = _check_sentry_default_off()
        if sentry_failure:
            failures.append(sentry_failure)

    if check_meta_claim:
        meta_failure = _check_meta_claim()
        if meta_failure:
            failures.append(meta_failure)

    return VerifierResult(passed=not failures, failures=tuple(failures))


def _check_sentry_default_off() -> str | None:
    """Stock settings must produce ``init_sentry -> False``."""
    try:
        from pydantic import SecretStr
    except ImportError:
        return "pydantic not importable; cannot run sentry-default check"

    from theourgia.core.observability.sentry import init_sentry

    class _StubSettings:
        sentry_dsn = None
        sentry_traces_sample_rate = 0.0
        env = "production"
        release: str | None = None

    result = init_sentry(_StubSettings())  # type: ignore[arg-type]
    if result is not False:
        return (
            "init_sentry(stock settings) returned a truthy value; "
            "Sentry must be opt-in only"
        )
    return None


def _check_meta_claim() -> str | None:
    """``/api/v1/meta`` must report ``telemetry: "none"`` for stock config."""
    try:
        from theourgia.api.schemas import Meta
    except Exception as exc:  # noqa: BLE001
        return f"could not import Meta schema: {exc}"

    # We don't spin up the full app here — too much surface for a static
    # check. Instead we verify the Meta schema has a literal "none"
    # default for stock construction, mirroring what the route returns.
    fields = getattr(Meta, "model_fields", None)
    if fields is None:
        return "Meta schema has no model_fields; pydantic v2 expected"
    telemetry_field = fields.get("telemetry")
    if telemetry_field is None:
        return "Meta schema missing 'telemetry' field"
    # The route returns telemetry="none" unconditionally in
    # `routers/v1/meta.py`; verify by string-grepping the source.
    import inspect

    try:
        from theourgia.api.routers.v1 import meta as meta_route
    except Exception as exc:  # noqa: BLE001
        return f"could not import meta route: {exc}"
    source = inspect.getsource(meta_route)
    if 'telemetry="none"' not in source:
        return (
            "meta route no longer emits telemetry=\"none\"; the zero-"
            "telemetry public claim has regressed"
        )
    return None


def main(argv: list[str] | None = None) -> int:
    """CLI entry point. Returns process exit code."""
    _ = argv  # currently no flags; reserved for future use
    result = verify_zero_telemetry()
    print(result.render())
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
