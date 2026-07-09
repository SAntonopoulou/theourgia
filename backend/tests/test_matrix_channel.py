"""Matrix notification channel tests — b108-2hv.

FEATURES §13 reference plugin 7/7. The channel posts m.notice
messages to a configured Matrix room via the client-server API.

The transport is an injectable Protocol so tests capture calls
without spinning up httpx or a live Matrix homeserver.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.notifications.channels.base import (
    NotificationDeliveryError,
)
from theourgia.core.notifications.channels.matrix import (
    MatrixChannel,
    MatrixConfig,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)


# ── Config validation ────────────────────────────────────────────


def test_config_rejects_empty_homeserver_url() -> None:
    with pytest.raises(ValueError):
        MatrixConfig(
            homeserver_url="",
            access_token="tok",
            room_id="!room:example.com",
        )


def test_config_rejects_homeserver_without_scheme() -> None:
    """A hostname without http(s):// scheme would silently break in
    httpx. Reject at construction so the deployment fails fast."""
    with pytest.raises(ValueError):
        MatrixConfig(
            homeserver_url="matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        )


def test_config_rejects_empty_access_token() -> None:
    with pytest.raises(ValueError):
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="",
            room_id="!room:example.com",
        )


def test_config_rejects_room_alias_masquerading_as_room_id() -> None:
    """Room aliases (#name:server) look valid to a user but resolve
    to different endpoints. Force the caller to convert first."""
    with pytest.raises(ValueError):
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="#public-room:example.com",
        )


def test_config_normalises_trailing_slash_on_homeserver() -> None:
    c = MatrixConfig(
        homeserver_url="https://matrix.example.com/",
        access_token="tok",
        room_id="!room:example.com",
    )
    assert c.homeserver_url == "https://matrix.example.com"


# ── Channel identity ─────────────────────────────────────────────


def test_channel_reports_matrix_delivery_channel() -> None:
    """Regression guard: DeliveryChannel.MATRIX must be the channel
    tag (used by the notification service for routing)."""
    assert MatrixChannel.channel == DeliveryChannel.MATRIX


def test_delivery_channel_matrix_added() -> None:
    """Regression guard on the enum extension."""
    assert DeliveryChannel.MATRIX.value == "matrix"


# ── Send: happy path ─────────────────────────────────────────────


class _StubTransport:
    """Captures calls; returns whatever status/body is queued."""

    def __init__(
        self,
        response: tuple[int, dict[str, object]] = (200, {}),
    ) -> None:
        self.calls: list[dict[str, object]] = []
        self.response = response

    async def put(
        self,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, object],
    ) -> tuple[int, dict[str, object]]:
        self.calls.append({"url": url, "headers": headers, "json": json})
        return self.response


def _msg() -> NotificationMessage:
    return NotificationMessage(
        user_id=uuid4(),
        template_name="tpl",
        kind="social",
        subject="new comment",
        body_text="A visitor left a comment on your post.",
    )


@pytest.mark.anyio
async def test_send_hits_room_send_endpoint() -> None:
    transport = _StubTransport()
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    await channel.send(_msg())
    assert len(transport.calls) == 1
    url = transport.calls[0]["url"]
    assert isinstance(url, str)
    assert url.startswith(
        "https://matrix.example.com/_matrix/client/v3/rooms/!room:example.com/send/m.room.message/",
    )


@pytest.mark.anyio
async def test_send_uses_random_transaction_id() -> None:
    """Homeserver dedupes by (sender, txn_id). Two consecutive sends
    must not share the same txn_id."""
    transport = _StubTransport()
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    await channel.send(_msg())
    await channel.send(_msg())
    txn1 = str(transport.calls[0]["url"]).rsplit("/", 1)[-1]
    txn2 = str(transport.calls[1]["url"]).rsplit("/", 1)[-1]
    assert txn1 != txn2
    # 32 hex chars from secrets.token_hex(16)
    assert len(txn1) == 32
    assert len(txn2) == 32


@pytest.mark.anyio
async def test_send_uses_msgtype_notice_not_text() -> None:
    """m.notice tells bot receivers "this is automation" — using
    m.text would look like a person typing, and rooms often have
    filters that would mute automation-as-notice while showing
    human-as-text. Regression guard on that behaviour."""
    transport = _StubTransport()
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    await channel.send(_msg())
    body = transport.calls[0]["json"]
    assert isinstance(body, dict)
    assert body.get("msgtype") == "m.notice"


@pytest.mark.anyio
async def test_send_uses_bearer_access_token() -> None:
    transport = _StubTransport()
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="secrettoken",
            room_id="!room:example.com",
        ),
        transport,
    )
    await channel.send(_msg())
    headers = transport.calls[0]["headers"]
    assert isinstance(headers, dict)
    assert headers.get("Authorization") == "Bearer secrettoken"


@pytest.mark.anyio
async def test_send_appends_action_label_and_url_to_body() -> None:
    """Matrix has no rich-text action button; the URL goes into the
    body prefixed by the action label for the reader to follow."""
    transport = _StubTransport()
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    msg = NotificationMessage(
        user_id=uuid4(),
        template_name="tpl",
        kind="social",
        subject="new comment",
        body_text="A visitor left a comment on your post.",
        action_url="https://theourgia.com/moderate",
        action_label="Moderate",
    )
    await channel.send(msg)
    body = transport.calls[0]["json"]
    assert isinstance(body, dict)
    assert "Moderate: https://theourgia.com/moderate" in str(body["body"])


# ── Send: failure paths ─────────────────────────────────────────


@pytest.mark.anyio
async def test_send_raises_on_transport_exception() -> None:
    class _RaisingTransport:
        async def put(self, url, *, headers, json):
            raise RuntimeError("network down")

    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        _RaisingTransport(),
    )
    with pytest.raises(NotificationDeliveryError) as exc:
        await channel.send(_msg())
    assert exc.value.channel == DeliveryChannel.MATRIX
    assert "unreachable" in str(exc.value).lower()


@pytest.mark.anyio
async def test_send_raises_on_4xx_response() -> None:
    transport = _StubTransport(
        response=(403, {"errcode": "M_FORBIDDEN", "error": "no permission"}),
    )
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    with pytest.raises(NotificationDeliveryError) as exc:
        await channel.send(_msg())
    assert exc.value.channel == DeliveryChannel.MATRIX
    provider = exc.value.provider_error or ""
    assert "M_FORBIDDEN" in provider


@pytest.mark.anyio
async def test_send_raises_on_5xx_response() -> None:
    transport = _StubTransport(response=(500, {}))
    channel = MatrixChannel(
        MatrixConfig(
            homeserver_url="https://matrix.example.com",
            access_token="tok",
            room_id="!room:example.com",
        ),
        transport,
    )
    with pytest.raises(NotificationDeliveryError):
        await channel.send(_msg())


# ── No silent-retry regression guard ────────────────────────────


def test_channel_source_does_not_contain_retry_logic() -> None:
    """The channel's job is one attempt + a clean error on failure.
    Retries belong in the notification-service queue, not here.
    Regression guard: if a future refactor adds `for _ in range` or
    a sleep in this module, that's likely a silent-retry loop that
    would hide errors — call it out."""
    from inspect import getsource
    from theourgia.core.notifications.channels import matrix

    src = getsource(matrix)
    assert "for _ in range" not in src
    assert "asyncio.sleep" not in src
    assert "time.sleep" not in src
