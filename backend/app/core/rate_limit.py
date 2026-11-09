"""In-process sliding-window rate limiter.

Good enough for a single-instance MVP. For multiple workers/instances replace the
store with Redis (same interface).
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.errors import ApiError


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_s: float) -> float | None:
        """Record a hit. Returns seconds to wait if over the limit, else None."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - window_s:
                q.popleft()
            if len(q) >= limit:
                return window_s - (now - q[0])
            q.append(now)
            return None

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    # Behind a proxy, run uvicorn with --proxy-headers so request.client reflects X-Forwarded-For.
    return request.client.host if request.client else "unknown"


def rate_limit(group: str, limit: int, window_s: float = 60.0):
    def dependency(request: Request) -> None:
        wait = limiter.hit(f"{group}:{client_ip(request)}", limit, window_s)
        if wait is not None:
            raise ApiError(
                429, "rate_limited", "Too many requests. Please wait a moment and try again.",
                headers={"Retry-After": str(int(wait) + 1)},
            )

    return dependency
