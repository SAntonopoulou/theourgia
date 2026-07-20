"""Publish + body PATCH endpoints — b108-2hm.

These endpoints were called by the Editor auto-save + Publish CTA
but never existed on the backend, so every save silently 404'd and
Publish appeared broken. This batch adds them + the tests.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import entries as entries_module
from theourgia.api.routers.v1.entries import EntryBodyUpdate


# ── Router surface ────────────────────────────────────────────────


def test_publish_endpoint_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in entries_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/entries/{entry_id}/publish", "POST") in paths_methods


def test_body_endpoint_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in entries_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/entries/{entry_id}/body", "PATCH") in paths_methods


def test_new_endpoints_require_auth() -> None:
    from theourgia.api.deps import get_current_user

    targets = {
        ("/entries/{entry_id}/publish", "POST"),
        ("/entries/{entry_id}/body", "PATCH"),
    }
    for route in entries_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        for m in route.methods or set():
            if (route.path, m) not in targets:
                continue
            deps = route.dependant.dependencies
            calls = [d.call for d in deps]
            sub_names: list[str] = []
            for d in deps:
                for sub in d.dependencies:
                    if hasattr(sub.call, "__name__"):
                        sub_names.append(sub.call.__name__)
            assert (
                get_current_user in calls
                or "get_current_user" in sub_names
            ), f"{route.path} must require auth"


# ── EntryBodyUpdate schema ────────────────────────────────────────


def test_body_update_accepts_a_body_string() -> None:
    payload = EntryBodyUpdate(body='{"type":"doc","content":[]}')
    assert payload.body.startswith("{")


def test_body_update_rejects_absurdly_large_bodies() -> None:
    """2 MB cap — a Tiptap doc that large is almost certainly a
    runaway recursion or upload gone wrong."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        EntryBodyUpdate(body="x" * (2_000_001))


# ── Source-level regression guards ────────────────────────────────


def test_publish_source_refuses_sealed_entries() -> None:
    """Regression guard: sealed entries must not be publishable.
    Defence in depth on top of the SPA gate that already hides the
    Publish button when sealed=true.

    v1-018 moved the transition into ``apply_publish`` — shared with
    the memorial sweep's posthumous release — so the guard follows the
    logic there, and the endpoint must still route through it."""
    from inspect import getsource

    src = getsource(entries_module.apply_publish)
    assert "encryption_mode == EncryptionMode.SEALED" in src
    assert "Sealed entries cannot be published" in src
    assert "apply_publish" in getsource(entries_module.publish_entry)


def test_publish_source_is_idempotent() -> None:
    """Regression guard: repeated Publish clicks must not reset the
    published_at timestamp. If someone re-clicks Publish a day later,
    the record still says "published on {original date}"."""
    from inspect import getsource

    src = getsource(entries_module.apply_publish)
    assert "row.published_at is None" in src


def test_body_endpoint_source_refuses_sealed_entries() -> None:
    """Regression guard: the auto-save path must refuse to overwrite
    a sealed body server-side. Sealing means the server never sees
    plaintext; a plaintext PATCH would break that invariant."""
    from inspect import getsource

    src = getsource(entries_module.update_entry_body)
    assert "encryption_mode == EncryptionMode.SEALED" in src
