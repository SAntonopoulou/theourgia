"""Rate limiting + idempotency substrate.

Two related concerns, one package:

- **Rate limiting** — protect endpoints from abuse and accidental
  storms. Every write endpoint declares a rate limit; reads typically
  rely on the global per-IP backstop.
- **Idempotency** — write endpoints that may be retried (network
  failures, mobile clients) honor an ``Idempotency-Key`` header so a
  retry produces the same effect as the first call.

Both ride a pluggable storage backend: Redis in production, in-memory
for tests. The interface is small enough that adding new backends
(memcached, distributed-counter services) is straightforward.
"""

from __future__ import annotations

from theourgia.core.ratelimit.idempotency import (
    IdempotencyRecord,
    IdempotencyStore,
    InMemoryIdempotencyStore,
    RedisIdempotencyStore,
)
from theourgia.core.ratelimit.limiter import (
    RateLimit,
    RateLimiter,
    RateLimitExceeded,
)
from theourgia.core.ratelimit.stores import (
    InMemoryRateLimitStore,
    RateLimitStore,
    RedisRateLimitStore,
)

__all__ = [
    "IdempotencyRecord",
    "IdempotencyStore",
    "InMemoryIdempotencyStore",
    "InMemoryRateLimitStore",
    "RateLimit",
    "RateLimitExceeded",
    "RateLimitStore",
    "RateLimiter",
    "RedisIdempotencyStore",
    "RedisRateLimitStore",
]
