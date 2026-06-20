"""Tests for the locale-binding ASGI middleware."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from theourgia.core.i18n.locale import (
    bind_locale,
    clear_locale,
    get_current_locale,
)
from theourgia.core.i18n.middleware import LocaleMiddleware


@pytest.fixture(autouse=True)
def _reset() -> None:
    clear_locale()
    yield
    clear_locale()


def _build_app(*, supported: list[str], default: str = "en") -> Starlette:
    async def echo_locale(request: object) -> JSONResponse:
        return JSONResponse({"locale": get_current_locale()})

    app = Starlette(
        routes=[Route("/locale", echo_locale)],
    )
    app.add_middleware(
        LocaleMiddleware,
        supported_locales=supported,
        default_locale=default,
    )
    return app


@pytest.mark.asyncio
async def test_default_locale_when_no_header() -> None:
    app = _build_app(supported=["en", "es"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get("/locale")
    assert response.json()["locale"] == "en"


@pytest.mark.asyncio
async def test_negotiates_from_accept_language() -> None:
    app = _build_app(supported=["en", "es", "fr"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale", headers={"Accept-Language": "es,en;q=0.5"}
        )
    assert response.json()["locale"] == "es"


@pytest.mark.asyncio
async def test_falls_back_to_default_when_no_supported_match() -> None:
    app = _build_app(supported=["en", "es"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale", headers={"Accept-Language": "ja,ko"}
        )
    assert response.json()["locale"] == "en"


@pytest.mark.asyncio
async def test_prefix_match() -> None:
    app = _build_app(supported=["en", "pt-BR"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale", headers={"Accept-Language": "en-US"}
        )
    assert response.json()["locale"] == "en"


@pytest.mark.asyncio
async def test_query_parameter_override() -> None:
    """?locale=xx overrides Accept-Language when it names a supported tag."""
    app = _build_app(supported=["en", "es", "fr"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale?locale=fr", headers={"Accept-Language": "en"}
        )
    assert response.json()["locale"] == "fr"


@pytest.mark.asyncio
async def test_query_parameter_ignored_when_unsupported() -> None:
    """An unrecognized ?locale= falls through to Accept-Language."""
    app = _build_app(supported=["en", "es"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale?locale=ja", headers={"Accept-Language": "es"}
        )
    assert response.json()["locale"] == "es"


@pytest.mark.asyncio
async def test_locale_is_cleared_after_request() -> None:
    """After the response is generated, the contextvar should be reset."""
    app = _build_app(supported=["en", "es"])
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        await client.get("/locale", headers={"Accept-Language": "es"})

    # We're now outside the middleware-managed request scope
    assert get_current_locale() is None


@pytest.mark.asyncio
async def test_pathologically_long_accept_language_does_not_crash() -> None:
    """Defensive cap on header length prevents pathological clients
    from blowing up parsing."""
    app = _build_app(supported=["en", "es"])
    long_header = ("xx-XX," * 5000) + "es"  # 35KB
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        response = await client.get(
            "/locale", headers={"Accept-Language": long_header}
        )
    # We cap at _MAX_HEADER_LENGTH chars; result may be 'en' (default,
    # if cap fell within an xx-XX) or 'es' if the cap let some 'es'
    # survive. Either way the response is 200 and the locale is one of
    # the supported set.
    assert response.status_code == 200
    assert response.json()["locale"] in {"en", "es"}


@pytest.mark.asyncio
async def test_locale_bound_during_request_body() -> None:
    """During the request, get_current_locale() returns the negotiated value."""
    captured: dict[str, str | None] = {}

    async def check_locale(request: object) -> JSONResponse:
        captured["locale"] = get_current_locale()
        return JSONResponse({"ok": True})

    app = Starlette(routes=[Route("/check", check_locale)])
    app.add_middleware(
        LocaleMiddleware,
        supported_locales=["en", "es"],
        default_locale="en",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t"
    ) as client:
        await client.get("/check", headers={"Accept-Language": "es"})

    assert captured["locale"] == "es"
