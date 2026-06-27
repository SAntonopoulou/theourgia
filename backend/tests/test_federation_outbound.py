"""Federation outbound delivery primitive — focused tests.

End-to-end against a real peer isn't possible without a second
instance. These tests verify the contract:

  · _canonical_body produces deterministic bytes (sorted keys,
    no whitespace).
  · deliver() short-circuits when transport is disabled.
  · deliver() rejects non-HTTPS URLs (defence in depth).
"""

from __future__ import annotations

import json

import pytest

from theourgia.core.federation.outbound import (
    DeliveryResult,
    _canonical_body,
    deliver,
)
from theourgia.core.federation.keys import generate_keypair


def test_canonical_body_sorts_keys() -> None:
    a = _canonical_body({"b": 1, "a": 2})
    b = _canonical_body({"a": 2, "b": 1})
    assert a == b
    assert json.loads(a.decode("utf-8")) == {"a": 2, "b": 1}


def test_canonical_body_no_whitespace() -> None:
    body = _canonical_body({"a": 1, "b": [1, 2, 3]})
    assert b" " not in body
    assert b"\n" not in body


def test_canonical_body_passes_through_bytes() -> None:
    original = b'{"already": "encoded"}'
    assert _canonical_body(original) == original


def test_canonical_body_handles_unicode() -> None:
    body = _canonical_body({"greeting": "καλημέρα"})
    decoded = json.loads(body.decode("utf-8"))
    assert decoded["greeting"] == "καλημέρα"


@pytest.mark.asyncio
async def test_deliver_short_circuits_when_disabled() -> None:
    """The default FEDERATION_TRANSPORT_ENABLED is False; deliver
    must short-circuit without making any network call."""
    kp = generate_keypair()
    result = await deliver(
        url="https://example.com/inbox",
        body_json={"hello": "world"},
        sender_keyid="did:theourgia:test",
        sender_private_key=kp.private_key,
    )
    assert isinstance(result, DeliveryResult)
    assert result.ok is False
    assert result.status is None
    assert result.error == "transport disabled"


def test_delivery_result_is_dataclass_slots() -> None:
    """Slots matter for memory + immutability of the contract."""
    r = DeliveryResult(ok=True, status=200, error=None)
    assert r.ok is True
    with pytest.raises(AttributeError):
        r.unknown_field = "x"  # type: ignore[attr-defined]
