"""Matrix notification channel.

b108-2hv · FEATURES §13 (reference plugin: Matrix notification channel).

Posts notifications to a Matrix room via the client-server API:

    PUT /_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}

Auth is a bearer access token issued by the operator's homeserver.
The channel is intentionally minimal — one message per notification,
sent as ``m.notice`` (not ``m.text``) so bots on the receiving end
know it's automation, not a person typing.

Config
------

- ``homeserver_url``: the base URL of the operator's Matrix homeserver
  (e.g. ``https://matrix.example.com``). No trailing slash required —
  the channel normalises it.
- ``access_token``: a bearer token authorised to post to the room.
  Users create these from Element or the API; there is no OAuth
  ceremony wired here.
- ``room_id``: the internal room ID (starts with ``!``, e.g.
  ``!abcdef:example.com``). Room aliases (``#name:example.com``)
  are NOT accepted — resolve them client-side before configuring.

Honesty
-------

Every send is a POST to a remote service. Failures raise
:class:`NotificationDeliveryError`. There is NO silent-retry queue
here — that lives in the notification service. The channel's job is
one attempt + a clean error on failure.

The channel refuses to send if any of the three config values is
missing at construction time, so a misconfigured deployment fails
fast at startup rather than silently swallowing every notification.
"""

from __future__ import annotations

import secrets
from typing import Any, Protocol

from theourgia.core.notifications.channels.base import (
    NotificationDeliveryError,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)

__all__ = ["MatrixChannel", "MatrixConfig", "MatrixTransport"]


class MatrixTransport(Protocol):
    """The HTTP transport the channel calls into.

    Broken out as a Protocol so tests can pass an in-memory stub
    without spinning up httpx. Production wires this to httpx
    or aiohttp at the composition root.
    """

    async def put(
        self,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, Any],
    ) -> tuple[int, dict[str, Any]]:
        ...


class MatrixConfig:
    """Immutable Matrix channel configuration.

    Constructing a config validates every field. Passing missing or
    malformed values raises :class:`ValueError` — the channel refuses
    to instantiate in an unusable state.
    """

    __slots__ = ("homeserver_url", "access_token", "room_id")

    def __init__(
        self,
        *,
        homeserver_url: str,
        access_token: str,
        room_id: str,
    ) -> None:
        if not homeserver_url:
            raise ValueError("MatrixConfig.homeserver_url must not be empty")
        if not homeserver_url.startswith(("http://", "https://")):
            raise ValueError(
                "MatrixConfig.homeserver_url must be a full http(s) URL",
            )
        if not access_token:
            raise ValueError("MatrixConfig.access_token must not be empty")
        if not room_id.startswith("!"):
            raise ValueError(
                "MatrixConfig.room_id must be an internal room ID starting "
                "with '!' (aliases like '#name:server' are not accepted; "
                "resolve them client-side first)",
            )
        self.homeserver_url = homeserver_url.rstrip("/")
        self.access_token = access_token
        self.room_id = room_id


class MatrixChannel:
    """Delivers notifications by posting to a Matrix room."""

    channel = DeliveryChannel.MATRIX

    def __init__(
        self,
        config: MatrixConfig,
        transport: MatrixTransport,
    ) -> None:
        self._config = config
        self._transport = transport

    async def send(self, message: NotificationMessage) -> None:
        """Post one m.notice message to the configured room.

        The room's URL is:

            {homeserver}/_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}

        Transaction IDs are 32 random-hex characters so retries never
        create duplicate messages (Matrix homeservers deduplicate by
        (sender, txn_id) for a short window).
        """
        txn_id = secrets.token_hex(16)
        url = (
            f"{self._config.homeserver_url}"
            f"/_matrix/client/v3/rooms/{self._config.room_id}"
            f"/send/m.room.message/{txn_id}"
        )

        body_text = message.body_text
        if message.action_url and message.action_label:
            body_text = (
                f"{body_text}\n\n{message.action_label}: {message.action_url}"
            )

        payload = {
            "msgtype": "m.notice",
            "body": body_text,
        }
        headers = {
            "Authorization": f"Bearer {self._config.access_token}",
            "Content-Type": "application/json",
        }

        try:
            status_code, response_body = await self._transport.put(
                url, headers=headers, json=payload,
            )
        except Exception as exc:
            raise NotificationDeliveryError(
                "Matrix homeserver unreachable",
                channel=self.channel,
                provider_error=str(exc),
            ) from exc

        if status_code >= 400:
            errcode = None
            error_text = None
            if isinstance(response_body, dict):
                errcode = response_body.get("errcode")
                error_text = response_body.get("error")
            raise NotificationDeliveryError(
                f"Matrix homeserver returned {status_code}",
                channel=self.channel,
                provider_error=(
                    f"{errcode}: {error_text}"
                    if errcode
                    else f"HTTP {status_code}"
                ),
            )
