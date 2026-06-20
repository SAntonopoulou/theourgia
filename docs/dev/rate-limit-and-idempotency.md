# Rate limiting + idempotency — developer guide

Two related substrates. Endpoints declare rate limits; write endpoints honor `Idempotency-Key` headers.

## The substrate at a glance

```
core/ratelimit/
├── limiter.py       # RateLimit + RateLimiter + RateLimitExceeded
├── stores.py        # RateLimitStore Protocol + InMemory + Redis impls
└── idempotency.py   # IdempotencyRecord + IdempotencyStore + InMemory + Redis impls
```

## Rate limiting

### Declare a limit

Limits live next to the endpoints they protect, often as module-level constants:

```python
# theourgia/features/auth/limits.py
from theourgia.core.ratelimit import RateLimit

LOGIN_ATTEMPT = RateLimit(name="auth.login.attempt", count=5, window_seconds=60)
SIGNUP = RateLimit(name="auth.signup", count=3, window_seconds=3600)
PASSWORD_RESET_REQUEST = RateLimit(
    name="auth.password_reset.request", count=3, window_seconds=600
)
```

`count` requests per `window_seconds`. Names are stable identifiers used in the counter key.

### Check a limit

```python
from theourgia.core.ratelimit import RateLimitExceeded

try:
    await rate_limiter.check(LOGIN_ATTEMPT, identity=client_ip)
except RateLimitExceeded as exc:
    raise RateLimitedError(
        f"too many login attempts",
        headers={"Retry-After": str(exc.retry_after_seconds)},
    )
```

The limiter increments the counter and raises if the cap is exceeded. The exception carries the retry-after seconds so the endpoint can echo it via the `Retry-After` header (RFC 6585).

### Per-user vs per-IP

`identity` is opaque. Use:

- **`user.id`** for authenticated endpoints where the user is the natural unit (per-user write rate limits, etc.).
- **client IP** for anonymous endpoints where the user isn't known yet (signup, public-content reads).
- Both — register two limits with different names if you want both layers. Login attempts in particular benefit from per-IP + per-username layered limits (so a single attacker can't lock out a victim by exhausting the victim's per-username cap).

### Backends

- **In-memory** for tests + single-process dev.
- **Redis** for production. Atomic INCR + EXPIRE, multi-worker safe.

## Idempotency

### When to honor

Every write endpoint that may be retried should honor `Idempotency-Key`. Specifically: anything that creates a row, sends an external message, or triggers a non-reversible side effect. Pure read endpoints don't need idempotency keys.

### Pattern

```python
@router.post("/api/v1/payments")
async def create_payment(
    payload: PaymentRequest,
    request: Request,
    idempotency: IdempotencyStoreDep,
):
    key = request.headers.get("Idempotency-Key")
    if key is not None:
        fingerprint = compute_request_fingerprint(
            method="POST",
            path="/api/v1/payments",
            body=await request.body(),
        )
        existing = await idempotency.get(key)
        if existing is not None:
            if existing.fingerprint != fingerprint:
                raise ConflictError("idempotency-key reused with different request")
            return Response(
                content=existing.body,
                status_code=existing.status_code,
                media_type=existing.content_type,
            )

    # Process the request normally
    payment = await actually_create_payment(payload)
    response_body = orjson.dumps({"id": str(payment.id)})

    if key is not None:
        await idempotency.put(
            IdempotencyRecord(
                key=key,
                fingerprint=fingerprint,
                status_code=201,
                body=response_body,
                content_type="application/json",
                created_at=time.monotonic(),
            ),
            ttl_seconds=24 * 3600,
        )

    return Response(content=response_body, status_code=201, media_type="application/json")
```

A middleware version of this pattern lands when the first real endpoint exercises it; for now use the inline form.

### Same key, different payload = conflict

If a client sends the same `Idempotency-Key` with a different request body, it's a client bug (or an attack). The endpoint must reject with 409 Conflict. The fingerprint check (`compute_request_fingerprint`) makes this mechanical.

### TTL

Set a TTL on idempotency records that covers the longest realistic retry window — 24 hours is the standard. Records older than the TTL are dropped; a retry past the TTL produces a fresh execution.

### Backends

- **In-memory** for tests + single-process dev.
- **Redis** for production. Records encoded as pipe-delimited bytes; `SET key value EX ttl` for atomic write+expire.

## Testing

```python
@pytest.mark.asyncio
async def test_login_rate_limited():
    limiter = RateLimiter(InMemoryRateLimitStore())
    for _ in range(5):
        await limiter.check(LOGIN_ATTEMPT, identity="1.2.3.4")
    with pytest.raises(RateLimitExceeded):
        await limiter.check(LOGIN_ATTEMPT, identity="1.2.3.4")


@pytest.mark.asyncio
async def test_idempotency_returns_cached_response():
    store = InMemoryIdempotencyStore()
    record = IdempotencyRecord(
        key="key-1", fingerprint="fp", status_code=201,
        body=b'{"id": "abc"}', content_type="application/json",
        created_at=time.monotonic(),
    )
    await store.put(record, ttl_seconds=60)
    found = await store.get("key-1")
    assert found.body == b'{"id": "abc"}'
```

## What's next

- A FastAPI middleware that turns rate-limit + idempotency-key handling into a per-endpoint decorator (`@rate_limit(LOGIN_ATTEMPT)`) — lands when the first auth endpoint actually needs it.
- Per-endpoint declarative limits in route metadata (so the admin dashboard can list which endpoints are limited and how).
- Distributed sliding-window (not fixed-window) counting if the burst-at-window-boundary behavior becomes a problem in practice. The current fixed-window approach is simple and adequate for most cases.

## Anti-patterns

**Don't** inline counter checks:

```python
# WRONG
if some_counter > 5:
    raise TooManyError()
some_counter += 1
```

**Do** declare a `RateLimit` and call the limiter — the substrate handles concurrency, expiry, multi-worker safety, and Retry-After header diagnostics for you.
