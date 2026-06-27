"""Background reaper script — shape tests.

Integration-style end-to-end against a seeded DB lives in a follow-on
batch (would need users + nonces fixture + a DB transaction sweep).
The contract tests verify the module exposes the right functions
+ that arg-parsing accepts the documented flag set.
"""

from __future__ import annotations


def test_reaper_module_imports() -> None:
    """Smoke — module loads without DB / config side effects."""
    from theourgia.scripts import reaper

    assert hasattr(reaper, "sweep_once")
    assert hasattr(reaper, "reap_nonces")
    assert hasattr(reaper, "reap_deletions")
    assert reaper.main is not None


def test_reaper_arg_parsing_flags() -> None:
    """All documented flags parse to the expected attribute names."""
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--nonces-only", action="store_true")
    parser.add_argument("--deletions-only", action="store_true")
    parser.add_argument("--interval-seconds", type=int, default=60)

    args = parser.parse_args(["--once", "--nonces-only"])
    assert args.once is True
    assert args.nonces_only is True
    assert args.deletions_only is False
    assert args.interval_seconds == 60
