# Transcription — developer guide

Optional local Whisper transcription for voice recordings (Tier 2 #10 /
FEATURES §2 audio). Fully local: the audio bytes never leave the
instance, and there is no cloud-API code path at all.

## The substrate at a glance

```
core/transcription/
├── base.py            # TranscriptionEngine Protocol + TranscriptionResult
│                      #   + TranscriptionSegment + TranscriptionError
├── null.py            # disabled default — raises TranscriptionError
├── faster_whisper.py  # FasterWhisperEngine (lazy import, per-process model cache)
└── factory.py         # build_transcription_engine(settings)

core/tasks/transcription.py        # Celery task transcribe_audio_attachment
api/routers/v1/audio.py            # GET /audio/{id} + POST /audio/{id}/transcribe
```

The engine of record is [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
(CTranslate2 port of OpenAI Whisper), running on the operator's own
CPU (`compute_type=int8` by default). The model is loaded once per
worker process and cached.

## Installing

The dependency is an optional extra — default installs ship without it:

```
uv sync --extra transcription
```

## Settings (operator)

| Env var | Default | Meaning |
| --- | --- | --- |
| `THEOURGIA_TRANSCRIPTION_ENABLED` | `false` | Master switch. Off = the factory returns the NullEngine and the API 403s. |
| `THEOURGIA_TRANSCRIPTION_MODEL` | `small` | faster-whisper model size: `tiny`, `base`, `small`, `medium`, `large-v3`. |

## The opt-in contract

Transcription runs only when **both** gates are open:

1. **Instance** — `THEOURGIA_TRANSCRIPTION_ENABLED=true` (operator).
2. **User** — the `audio.transcription_opt_in` user setting is `true`
   (per user, default `false`).

`POST /api/v1/audio/{id}/transcribe` fails closed with distinct 403
details for each gate so the frontend can tell "not available here"
apart from "you haven't opted in". A 409 means a transcript already
exists — pass `?force=true` to re-transcribe. Success is a 202 with
`{"queued": true}`; the Celery task does the actual work.

Failure semantics in the task mirror the backup task: an engine
failure logs and leaves `transcript` NULL — no `error:` sentinel is
ever written to `transcript_engine`, and the worker never crashes.
On success the task writes `transcript` plus a provenance label
(`transcript_engine = "whisper:<size>"`) onto the `AudioAttachment`
row.

## Model sizes

Rough guidance for CPU inference with `int8` quantisation:

| Model | Parameters | RAM (approx.) | Notes |
| --- | --- | --- | --- |
| `tiny` | 39 M | ~1 GB | Fastest; fine for clear, short voice notes. |
| `base` | 74 M | ~1 GB | Small quality bump over tiny. |
| `small` | 244 M | ~2 GB | **Default** — good accuracy/speed balance. |
| `medium` | 769 M | ~5 GB | Noticeably better on accented / noisy audio. |
| `large-v3` | 1550 M | ~10 GB | Best accuracy; slow on CPU — consider only for batch overnight use. |

The first transcription with a given size downloads the model from
Hugging Face into the local cache (`~/.cache/huggingface`); subsequent
runs are fully offline.

## Testing

Tests never import `faster_whisper` — the engine is always injected
(monkeypatch `build_transcription_engine` on
`theourgia.core.tasks.transcription`). See
`backend/tests/test_transcription.py` for the fake-engine and
fake-session patterns.
