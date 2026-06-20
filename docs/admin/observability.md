# Observability runbook

This document covers what Theourgia logs, what it measures, and how to consume the data. It complements the [disaster-recovery runbook](./disaster-recovery.md).

## Defaults: zero telemetry

By default, Theourgia ships nothing about your instance to anyone. The `/api/v1/meta` endpoint reports `"telemetry": "none"` and the zero-telemetry verifier (Phase 01 Batch 10) enforces this property automatically against every release. Operators opt-in to crash reporting by setting `THEOURGIA_SENTRY_DSN` — that's the only knob that changes the default.

## Logs

Logs are structured JSON written to **stderr**. Each line is a single JSON object with at least:

- `timestamp` — ISO 8601 UTC
- `level` — `info` / `warning` / `error`
- `event` — the log message (dotted-name convention: `auth.signed_in`, `backup.complete`, …)
- `logger` — the source module
- `request_id` — present on every line emitted during an HTTP request (UUIDv7)
- `user_id` — present once the bearer token has been resolved

Example:

```json
{"timestamp": "2026-06-20T22:15:03.142000Z", "level": "info", "event": "auth.signed_in", "logger": "theourgia.api.auth", "request_id": "01970a8a-...", "user_id": "01970a85-..."}
```

### Format selection

| `THEOURGIA_LOG_FORMAT` | Behavior |
|---|---|
| `auto` (default) | JSON in production / test, pretty in development |
| `json` | Force JSON, even in development |
| `pretty` | Force colorized human-readable, even in production (not recommended) |

### Log levels

Set with `THEOURGIA_LOG_LEVEL` (`debug` / `info` / `warning` / `error`). The default is `info`. `debug` is verbose — useful when chasing a specific bug, painful as a steady state.

### Stdlib library noise

In JSON mode we automatically quiet `uvicorn.access` and `sqlalchemy.engine` to `WARNING`. If you genuinely want every SQL statement in your logs (development debugging), set `THEOURGIA_LOG_LEVEL=debug` *and* re-enable those loggers in your own startup hook.

## Metrics

`GET /metrics` exposes Prometheus-format metrics. The endpoint is **admin-scoped**, requiring the `admin.observe` scope — a deliberate departure from the unauthenticated-`/metrics` convention to avoid leaking instance fingerprints to the public web. Operators who run a metrics sidecar set up their own scrape with an admin token.

### Available metrics

| Metric | Type | Labels | What it measures |
|---|---|---|---|
| `theourgia_http_requests_total` | counter | method, path_template, status | HTTP request counts |
| `theourgia_http_request_duration_seconds` | histogram | method, path_template | HTTP request latency |
| `theourgia_backup_runs_total` | counter | outcome | Backup attempts |
| `theourgia_backup_run_duration_seconds` | histogram | — | Backup wall-clock duration |
| `theourgia_backup_bytes_transferred_total` | counter | — | Bytes uploaded to backup storage |
| `theourgia_plugin_active` | gauge | — | Currently active plugins |

New metrics land here as new subsystems do. Naming convention: `theourgia_<unit>_<aspect>_<measurement>`.

### Sample Prometheus scrape config

```yaml
scrape_configs:
  - job_name: theourgia
    metrics_path: /metrics
    scheme: https
    static_configs:
      - targets: ['theourgia.your-domain.tld']
    bearer_token: '${THEOURGIA_OBSERVE_TOKEN}'
```

The bearer token is a regular Theourgia session token issued to a user that holds the `admin.observe` scope. You can also build a dedicated machine user for the sidecar.

## Crash reporting (Sentry — opt-in)

Set `THEOURGIA_SENTRY_DSN` and install the optional dependency:

```bash
pip install 'theourgia[sentry]'
```

Theourgia initializes `sentry-sdk` at startup with `send_default_pii=False`. Tuning:

| Variable | Default | Purpose |
|---|---|---|
| `THEOURGIA_SENTRY_DSN` | empty | Sentry project DSN. Empty = no Sentry. |
| `THEOURGIA_SENTRY_TRACES_SAMPLE_RATE` | `0.0` | Trace sampling. `0.0` = no traces, `1.0` = all. |

If the DSN is set but `sentry-sdk` is not importable, Theourgia logs a single warning and continues without Sentry — it never crashes startup over a misconfigured optional dependency.

## Background tasks (Celery beat)

Theourgia runs Celery for scheduled work. Beat schedule lives in `theourgia/core/tasks/app.py`:

| Schedule key | When (UTC) | Task |
|---|---|---|
| `theourgia.backup.daily` | 03:15 daily | `run_scheduled_backup(incremental=False)` |
| `theourgia.backup.hourly_incremental` | :15 every 6 hours | `run_scheduled_backup(incremental=True)` |

Tasks log a `backup.complete` event with the outcome / snapshot id / bytes / duration. The metrics surface (above) increments on every run.

### Running workers

```bash
# Worker
celery -A theourgia.core.tasks worker --loglevel=info --queues=default,backups

# Beat scheduler (only run one process — coordination is single-leader)
celery -A theourgia.core.tasks beat --loglevel=info
```

Use Flower (or any Celery-compatible monitor) for live introspection. We don't bundle one — pick what fits your operational stack.

## Common log lookups

| Question | Filter |
|---|---|
| "Who made this request?" | `request_id == "<id>"` |
| "What did user X do today?" | `user_id == "<id>"` and time range |
| "Did backups succeed last night?" | `event == "backup.complete"` and time range |
| "What's failing right now?" | `level == "error"` |
| "Why did this 500?" | `request_id == "<id>"` then look at `level == "error"` lines |

## When something is wrong

1. **Find the request ID** from the response (it's echoed back in the `X-Request-ID` response header).
2. **Filter logs by that ID** to see everything related to the failing request.
3. If you have **metrics**, check whether the problem is request-specific (single log line) or systemic (a counter spiking).
4. If you have **Sentry enabled**, the exception will be in the project tied to your DSN with the same `request_id` tag attached.
5. For backup failures specifically, the `BackupRun` table records every attempt with the captured Restic stderr — the DR runbook tells you how to act on what you find.
