"""Local Whisper transcription substrate — v1-012.

Tier 2 #10 / FEATURES §2 audio: opt-in local transcription. Follows the
suite's DB-less style: pure unit tests for the ``core.transcription``
engines + factory, task-level tests driving the async task body with a
fake ``session_scope`` / storage / engine, and handler-level tests that
drive the real endpoint coroutines with fakes.

The invariants pinned here:

* Disabled is the default — the factory hands back the NullEngine and
  the endpoint 403s — and the two 403 gates (instance / user opt-in)
  carry DISTINCT detail strings.
* An engine failure NEVER raises out of the worker and NEVER writes an
  error sentinel into ``transcript_engine`` — the transcript stays NULL.
* Re-transcribing an attachment that already has a transcript requires
  ``force=true`` (409 otherwise).
* Non-owners get 404, not 403 — they may not learn the row exists.
* The engine is always injected in tests — ``faster_whisper`` is never
  imported here (it is not installed; the guarded-import test relies
  on exactly that).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import audio as audio_module
from theourgia.api.routers.v1.audio import (
    DETAIL_ALREADY_TRANSCRIBED,
    DETAIL_INSTANCE_DISABLED,
    DETAIL_NOT_OPTED_IN,
    TRANSCRIPTION_OPT_IN_KEY,
    get_audio_attachment,
    transcribe_audio,
)
from theourgia.core.tasks import transcription as task_module
from theourgia.core.tasks.transcription import (
    _suffix_for_mime,
    _transcribe_audio_attachment_async,
)
from theourgia.core.transcription import (
    FasterWhisperEngine,
    NullEngine,
    TranscriptionError,
    TranscriptionResult,
    build_transcription_engine,
)
from theourgia.models.audio import AudioAttachment
from theourgia.models.uploads import Upload

# ── Fakes ─────────────────────────────────────────────────────────


class _Result:
    """Stand-in for a SQLAlchemy ``Result``."""

    def __init__(self, *, scalar: Any = None) -> None:
        self._scalar = scalar

    def scalar_one_or_none(self) -> Any:
        return self._scalar


class _FakeDb:
    """Endpoint-level stand-in for ``AsyncSession``: ``get`` returns
    the single configured row; ``execute`` pops queued results."""

    def __init__(
        self, *, row: Any = None, results: list[_Result] | None = None
    ) -> None:
        self.row = row
        self.results = list(results or [])

    async def get(self, model: Any, pk: Any) -> Any:
        return self.row

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "handler issued an unexpected query"
        return self.results.pop(0)


class _FakeTaskSession:
    """Task-level stand-in: ``get`` resolves by model class."""

    def __init__(self, rows: dict[type, Any]) -> None:
        self._rows = rows
        self.commits = 0

    async def get(self, model: type, pk: Any) -> Any:
        return self._rows.get(model)

    async def commit(self) -> None:
        self.commits += 1


class _FakeEngine:
    name = "fake"

    def __init__(
        self,
        *,
        result: TranscriptionResult | None = None,
        error: Exception | None = None,
    ) -> None:
        self._result = result
        self._error = error
        self.calls: list[str] = []

    def transcribe(
        self, audio_path: str, language: str | None = None
    ) -> TranscriptionResult:
        self.calls.append(audio_path)
        if self._error is not None:
            raise self._error
        assert self._result is not None
        return self._result


def _user() -> Any:
    return SimpleNamespace(id=uuid4())


def _attachment(owner_id: Any, **over: Any) -> AudioAttachment:
    defaults: dict[str, Any] = {
        "upload_id": uuid4(),
        "owner_id": owner_id,
    }
    defaults.update(over)
    return AudioAttachment(**defaults)


def _opted_in_result() -> _Result:
    return _Result(scalar=SimpleNamespace(value_json="true"))


def _wire_task(
    monkeypatch: pytest.MonkeyPatch,
    *,
    attachment: AudioAttachment | None,
    upload: Upload | None,
    engine: _FakeEngine,
    audio_bytes: bytes = b"OggS fake audio",
) -> _FakeTaskSession:
    """Point the task module's seams at fakes; returns the session."""
    session = _FakeTaskSession({AudioAttachment: attachment, Upload: upload})

    @asynccontextmanager
    async def _fake_scope():
        yield session

    async def _fake_get(key: str) -> bytes:
        return audio_bytes

    monkeypatch.setattr(task_module, "session_scope", _fake_scope)
    monkeypatch.setattr(
        task_module,
        "build_storage_service",
        lambda settings: SimpleNamespace(get=_fake_get),
    )
    monkeypatch.setattr(
        task_module, "build_transcription_engine", lambda settings: engine
    )
    return session


# ── Factory ───────────────────────────────────────────────────────


def test_factory_default_is_null_engine() -> None:
    """Transcription is OFF unless the operator opts the instance in."""
    engine = build_transcription_engine(
        SimpleNamespace(transcription_enabled=False)
    )
    assert isinstance(engine, NullEngine)


def test_factory_treats_missing_setting_as_disabled() -> None:
    engine = build_transcription_engine(SimpleNamespace())
    assert isinstance(engine, NullEngine)


def test_factory_enabled_builds_faster_whisper_with_model() -> None:
    engine = build_transcription_engine(
        SimpleNamespace(
            transcription_enabled=True, transcription_model="medium"
        )
    )
    assert isinstance(engine, FasterWhisperEngine)
    assert engine.model_size == "medium"
    assert engine.engine_label == "whisper:medium"


def test_factory_enabled_defaults_model_to_small() -> None:
    engine = build_transcription_engine(
        SimpleNamespace(transcription_enabled=True)
    )
    assert isinstance(engine, FasterWhisperEngine)
    assert engine.model_size == "small"


def test_factory_rejects_unknown_model_size() -> None:
    with pytest.raises(ValueError, match="THEOURGIA_TRANSCRIPTION_MODEL"):
        build_transcription_engine(
            SimpleNamespace(
                transcription_enabled=True, transcription_model="colossal"
            )
        )


def test_settings_default_disabled() -> None:
    """The real Settings object defaults to disabled + small."""
    from theourgia.core.config import Settings

    settings = Settings()
    assert settings.transcription_enabled is False
    assert settings.transcription_model == "small"


# ── Engines ───────────────────────────────────────────────────────


def test_null_engine_refuses_with_clear_message() -> None:
    with pytest.raises(TranscriptionError, match="transcription not enabled"):
        NullEngine().transcribe("/tmp/x.ogg")


def test_faster_whisper_guarded_import_names_the_extra() -> None:
    """faster-whisper is NOT installed in the test environment — the
    lazy import must fail with a message pointing at the extra."""
    engine = FasterWhisperEngine(model_size="tiny")
    with pytest.raises(TranscriptionError, match="uv sync --extra transcription"):
        engine.transcribe("/tmp/x.ogg")


def test_faster_whisper_construction_does_not_import_the_package() -> None:
    """Constructing the engine (as the factory does at config time)
    must not require the optional dependency."""
    import sys

    assert "faster_whisper" not in sys.modules
    FasterWhisperEngine(model_size="large-v3")
    assert "faster_whisper" not in sys.modules


def test_user_setting_key_matches_registered_default() -> None:
    """The router's key literal and the usersettings default must
    agree — a typo in either silently breaks the opt-in gate."""
    from theourgia.core.usersettings.defaults import register_default_settings
    from theourgia.core.usersettings.registry import SettingsRegistry

    registry = SettingsRegistry()
    register_default_settings(registry)
    definition = registry.get(TRANSCRIPTION_OPT_IN_KEY)
    assert definition.default is False


# ── Celery task ───────────────────────────────────────────────────


def test_task_is_registered_with_celery() -> None:
    import theourgia.core.tasks  # noqa: F401 — import side-effect registers
    from theourgia.core.tasks.app import celery_app

    assert (
        "theourgia.core.tasks.transcription.transcribe_audio_attachment"
        in celery_app.tasks
    )


async def test_task_happy_path_writes_transcript_and_engine_label(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attachment = _attachment(uuid4())
    upload = Upload(storage_key="k", content_type="audio/ogg", backend="null")
    engine = _FakeEngine(
        result=TranscriptionResult(
            text="Once, in the temple of the dawn.",
            language="en",
            engine_label="whisper:small",
            duration_seconds=4.2,
        )
    )
    session = _wire_task(
        monkeypatch, attachment=attachment, upload=upload, engine=engine
    )

    out = await _transcribe_audio_attachment_async(str(uuid4()))

    assert out["outcome"] == "success"
    assert out["engine_label"] == "whisper:small"
    assert attachment.transcript == "Once, in the temple of the dawn."
    assert attachment.transcript_engine == "whisper:small"
    assert session.commits == 1
    # The engine received a real local temp-file path.
    assert len(engine.calls) == 1
    assert engine.calls[0].endswith(".ogg")


async def test_task_engine_failure_leaves_transcript_null(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """TranscriptionError → logged failure outcome; transcript stays
    NULL, transcript_engine stays NULL (no ``error:`` sentinel), and
    nothing raises out of the task."""
    attachment = _attachment(uuid4())
    upload = Upload(storage_key="k", content_type="audio/ogg", backend="null")
    engine = _FakeEngine(error=TranscriptionError("model exploded"))
    session = _wire_task(
        monkeypatch, attachment=attachment, upload=upload, engine=engine
    )

    out = await _transcribe_audio_attachment_async(str(uuid4()))

    assert out["outcome"] == "failure"
    assert out["reason"] == "engine_failed"
    assert attachment.transcript is None
    assert attachment.transcript_engine is None
    assert session.commits == 0


async def test_task_never_raises_on_unexpected_engine_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attachment = _attachment(uuid4())
    upload = Upload(storage_key="k", content_type="audio/ogg", backend="null")
    engine = _FakeEngine(error=RuntimeError("segfault-adjacent"))
    _wire_task(
        monkeypatch, attachment=attachment, upload=upload, engine=engine
    )

    out = await _transcribe_audio_attachment_async(str(uuid4()))

    assert out["outcome"] == "failure"
    assert attachment.transcript is None


async def test_task_skips_missing_attachment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = _FakeEngine(error=AssertionError("must not be called"))
    _wire_task(monkeypatch, attachment=None, upload=None, engine=engine)

    out = await _transcribe_audio_attachment_async(str(uuid4()))

    assert out == {
        "outcome": "skipped",
        "attachment_id": out["attachment_id"],
        "reason": "missing_attachment",
    }
    assert engine.calls == []


async def test_task_storage_failure_is_a_logged_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attachment = _attachment(uuid4())
    upload = Upload(storage_key="k", content_type="audio/ogg", backend="null")
    engine = _FakeEngine(error=AssertionError("must not be called"))
    _wire_task(
        monkeypatch, attachment=attachment, upload=upload, engine=engine
    )

    async def _boom(key: str) -> bytes:
        raise OSError("bucket unreachable")

    monkeypatch.setattr(
        task_module,
        "build_storage_service",
        lambda settings: SimpleNamespace(get=_boom),
    )

    out = await _transcribe_audio_attachment_async(str(uuid4()))

    assert out["outcome"] == "failure"
    assert out["reason"] == "storage_fetch_failed"
    assert attachment.transcript is None


def test_suffix_for_mime_covers_common_audio_types() -> None:
    assert _suffix_for_mime("audio/ogg") == ".ogg"
    assert _suffix_for_mime("audio/webm") == ".webm"
    assert _suffix_for_mime("audio/mp4") == ".m4a"
    assert _suffix_for_mime("audio/ogg; codecs=opus") == ".ogg"
    assert _suffix_for_mime("application/octet-stream") == ".audio"


# ── Endpoint: POST /audio/{id}/transcribe ─────────────────────────


def _enable_instance(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        audio_module,
        "get_settings",
        lambda: SimpleNamespace(transcription_enabled=True),
    )


def _capture_delay(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    queued: list[str] = []
    monkeypatch.setattr(
        audio_module,
        "transcribe_audio_attachment",
        SimpleNamespace(delay=queued.append),
    )
    return queued


async def test_transcribe_404_when_attachment_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_instance(monkeypatch)
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), _FakeDb(row=None), _user())
    assert exc.value.status_code == 404


async def test_transcribe_404_when_caller_is_not_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Owner check: not-yours reads as not-found, never 403."""
    _enable_instance(monkeypatch)
    row = _attachment(uuid4())  # someone else's
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), _FakeDb(row=row), _user())
    assert exc.value.status_code == 404


async def test_transcribe_403_when_instance_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        audio_module,
        "get_settings",
        lambda: SimpleNamespace(transcription_enabled=False),
    )
    user = _user()
    row = _attachment(user.id)
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), _FakeDb(row=row), user)
    assert exc.value.status_code == 403
    assert exc.value.detail == DETAIL_INSTANCE_DISABLED


async def test_transcribe_403_when_user_not_opted_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_instance(monkeypatch)
    user = _user()
    row = _attachment(user.id)
    db = _FakeDb(row=row, results=[_Result(scalar=None)])
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), db, user)
    assert exc.value.status_code == 403
    assert exc.value.detail == DETAIL_NOT_OPTED_IN
    # The two 403s must be distinguishable by the frontend.
    assert DETAIL_NOT_OPTED_IN != DETAIL_INSTANCE_DISABLED


async def test_transcribe_409_when_transcript_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_instance(monkeypatch)
    user = _user()
    row = _attachment(user.id, transcript="Already here.")
    db = _FakeDb(row=row, results=[_opted_in_result()])
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), db, user)
    assert exc.value.status_code == 409
    assert exc.value.detail == DETAIL_ALREADY_TRANSCRIBED


async def test_transcribe_force_true_re_enqueues(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_instance(monkeypatch)
    queued = _capture_delay(monkeypatch)
    user = _user()
    row = _attachment(user.id, transcript="Already here.")
    db = _FakeDb(row=row, results=[_opted_in_result()])

    out = await transcribe_audio(uuid4(), db, user, force=True)

    assert out.queued is True
    assert len(queued) == 1


async def test_transcribe_202_enqueues_the_task(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_instance(monkeypatch)
    queued = _capture_delay(monkeypatch)
    user = _user()
    row = _attachment(user.id)
    db = _FakeDb(row=row, results=[_opted_in_result()])
    attachment_id = uuid4()

    out = await transcribe_audio(attachment_id, db, user)

    assert out.queued is True
    assert queued == [str(attachment_id)]


async def test_transcribe_opt_in_gate_ignores_malformed_stored_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A corrupt value_json reads as not-opted-in (fail closed)."""
    _enable_instance(monkeypatch)
    user = _user()
    row = _attachment(user.id)
    db = _FakeDb(
        row=row,
        results=[_Result(scalar=SimpleNamespace(value_json="{nope"))],
    )
    with pytest.raises(HTTPException) as exc:
        await transcribe_audio(uuid4(), db, user)
    assert exc.value.status_code == 403
    assert exc.value.detail == DETAIL_NOT_OPTED_IN


# ── Endpoint: GET /audio/{id} ─────────────────────────────────────


async def test_get_attachment_includes_transcript_fields() -> None:
    user = _user()
    row = _attachment(
        user.id,
        transcript="Once, in the temple.",
        transcript_engine="whisper:small",
    )
    out = await get_audio_attachment(uuid4(), _FakeDb(row=row), user)
    assert out.transcript == "Once, in the temple."
    assert out.transcript_engine == "whisper:small"


async def test_get_attachment_404_for_non_owner() -> None:
    row = _attachment(uuid4())
    with pytest.raises(HTTPException) as exc:
        await get_audio_attachment(uuid4(), _FakeDb(row=row), _user())
    assert exc.value.status_code == 404


# ── Router surface ────────────────────────────────────────────────


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in audio_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/audio/{attachment_id}", "GET") in paths_methods
    assert ("/audio/{attachment_id}/transcribe", "POST") in paths_methods


def test_every_route_requires_auth() -> None:
    from theourgia.api.deps import get_current_user

    for route in audio_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = [
            sub.call.__name__
            for d in deps
            for sub in d.dependencies
            if hasattr(sub.call, "__name__")
        ]
        assert (
            get_current_user in calls
            or "get_current_user" in sub_names
        ), f"{route.path} should require auth"
