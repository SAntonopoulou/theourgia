# Cache — developer guide

Pluggable read-through cache for expensive computations and frequent lookups. Replaces per-feature ad-hoc Redis calls with one canonical pattern.

## The substrate at a glance

```
core/cache/
├── cache.py             # Cache orchestrator (get_or_set, get_or_set_json, ...)
├── factory.py           # build_cache(settings)
└── backends/
    ├── base.py          # CacheBackend Protocol + CacheBackendError
    ├── memory.py        # in-memory backend for tests + single-process dev
    └── redis.py         # Redis backend for production
```

## Pattern: feature-side usage

The most common case — memoize an expensive computation:

```python
from theourgia.core.cache import Cache

async def get_natal_chart(cache: Cache, lat: float, lon: float, when: datetime):
    key = f"astrology:chart:{lat}:{lon}:{when.isoformat()}"

    async def compute() -> bytes:
        chart = await actually_run_swiss_ephemeris(lat, lon, when)
        return serialize_chart(chart)

    raw = await cache.get_or_set(key=key, loader=compute, ttl_seconds=86400)
    return deserialize_chart(raw)
```

For JSON-shaped data, use the typed helper:

```python
async def get_user_preferences_summary(cache: Cache, user_id: UUID):
    return await cache.get_or_set_json(
        key=f"prefs:summary:{user_id}",
        loader=lambda: compute_summary(user_id),
        ttl_seconds=300,
    )
```

## Key-naming convention

Prefix keys with the feature that owns them. Examples in active or planned use:

- `astrology:chart:<inputs>` — Swiss Ephemeris results
- `astrology:ephemeris:<date>` — daily ephemeris positions
- `gematria:lookup:<cipher>:<text>` — gematria sums
- `federation:peer:<host>:actor` — peer .well-known/actor metadata
- `tarot:deck:<deck_id>` — deck definitions
- `i18n:catalog:<locale>` — translation catalogs (the i18n substrate's own caching)
- `prefs:<user_id>:summary` — user-settings summaries

The substrate doesn't enforce a particular scheme; it's the feature's responsibility. A project-wide convention prevents collisions.

## Stampede protection

`get_or_set` is stampede-resistant. Under contention (10 callers racing on a cold key) only one runs the loader; others wait on a per-key `asyncio.Lock` and read the cached result.

This matters most for expensive computations (astrology, gematria over long passages) where a cold-start storm would otherwise multiply CPU load by the number of concurrent waiters.

## Backend failures degrade gracefully

A flaky cache **must never** bring down a feature. If the Redis backend fails:

- `get()` logs a WARNING and returns `None` (treated as miss).
- `set()` logs a WARNING and silently continues.
- `get_or_set()` falls through to the loader and returns the freshly computed value.

This is intentional: a transient Redis blip is not worth failing the user's request. The structured log line is what surfaces the underlying issue.

## TTL guidance

Pick the longest TTL that produces correct behavior. A few rough rules:

| Class | Suggested TTL | Why |
|---|---|---|
| Ephemeris / astrology / fixed astronomical data | 24h–7d | Inputs are immutable for a given date |
| Gematria sums | 24h | Cipher tables don't change in production |
| Federation peer metadata | 1h | Peers update keys / endpoints occasionally |
| User-settings summaries | 5min | User changes settings; short TTL recovers quickly |
| Auth / session lookups | NEVER | Use the session table; cache invalidation is too dangerous |
| Permission decisions | NEVER | Same reason — staleness becomes a vulnerability |

When invalidation is needed (a user changes their settings), call `cache.delete(key)` or `cache.clear_namespace(prefix)`. Don't rely on TTL expiry alone for correctness-critical paths.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `THEOURGIA_CACHE_BACKEND` | `memory` | One of `memory` or `redis` |
| `REDIS_URL` | `redis://localhost:6379/0` | Used by the Redis backend |

For production: `THEOURGIA_CACHE_BACKEND=redis`. For dev / tests: `memory` is fine.

## Testing

```python
@pytest.fixture
def cache():
    return Cache(InMemoryCacheBackend())


@pytest.mark.asyncio
async def test_my_feature_uses_cache(cache):
    result = await my_feature.do_thing(cache=cache)
    # First call populates cache
    assert await cache.get("expected_key") is not None
    # Second call hits cache
    cached_result = await my_feature.do_thing(cache=cache)
    assert cached_result == result
```

The in-memory backend has a `size()` helper for assertions and a `reset()` helper for inter-test cleanup.

## Anti-patterns

**Don't** call Redis directly outside the substrate:

```python
# WRONG — bypasses observability + stampede protection + graceful degradation
await redis_client.set("my:key", value, ex=300)
```

**Do** route through `Cache`:

```python
# RIGHT
await cache.set("my:key", value, ttl_seconds=300)
```

**Don't** cache mutable Python objects directly:

```python
# WRONG — pickle is not portable, not safe across versions
import pickle
await cache.set("k", pickle.dumps(obj), ttl_seconds=60)
```

**Do** use `get_or_set_json` for structured data:

```python
# RIGHT
await cache.get_or_set_json(key="k", loader=..., ttl_seconds=60)
```

**Don't** cache authorization decisions or session state:

```python
# WRONG — staleness becomes a security bug
await cache.set(f"can_read:{user.id}:{entry.id}", b"yes", ttl_seconds=300)
```

Authorization runs every request, fast and uncached. Use the policy registry, not the cache.
