"""Reference plugin: registers a single example gematria cipher.

This is a demonstration of the plugin SDK — NOT a cipher intended for
serious use. The 'unity cipher' maps every ASCII letter (a-z) to 1, so
any word's numeric value equals its letter count. It exists solely to
prove the ``linguistic.cipher`` extension point wires up end-to-end
through :mod:`theourgia.core.plugins.loader`.

The registered handler is a dict with two keys:

    ``mapping``  — the character-to-integer table
    ``compute``  — a callable ``(str) -> int`` implementing the sum

Host code that surfaces the cipher extension point is free to consume
either shape. This mirrors the contract exercised by the tests in
``backend/tests/test_reference_plugin.py``.
"""

from __future__ import annotations

from typing import Callable

from theourgia.core.plugins.context import PluginContext
from theourgia.core.plugins.extension_points import ExtensionPoint


# ── Cipher data ────────────────────────────────────────────────────

_MAPPING: dict[str, int] = {chr(ord("a") + i): 1 for i in range(26)}
"""Every lowercase ASCII letter maps to 1 (the "unity cipher")."""


def _compute(word: str) -> int:
    """Sum the cipher values of the (case-folded) letters in ``word``.

    Characters not in the mapping contribute zero — matching the
    permissive behaviour of the bundled ciphers.
    """
    return sum(_MAPPING.get(ch, 0) for ch in word.casefold())


# ── Activation hook ────────────────────────────────────────────────


def activate(ctx: PluginContext) -> None:
    """Called by :class:`PluginLoader` at activation time.

    Registers the unity cipher at :attr:`ExtensionPoint.CIPHER` and
    returns ``None`` (no teardown required — the loader will drop the
    registrations via ``unregister_plugin`` on deactivate).
    """
    handler: dict[str, object] = {
        "mapping": dict(_MAPPING),
        "compute": _compute,
    }
    ctx.register_extension(
        point=ExtensionPoint.CIPHER,
        name="example-unity",
        handler=handler,
        metadata={
            "display_name": "Example Unity Cipher",
            "language": "english",
            "citation": "Reference plugin — not for practical use.",
        },
    )


# Re-exported so tests / host code can invoke the raw compute function
# directly without going through the registry.
compute: Callable[[str], int] = _compute
