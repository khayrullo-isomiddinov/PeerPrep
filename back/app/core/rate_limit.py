"""Small in-memory rate limiter for the endpoints worth abusing: sign-in, sign-up and the paid AI helpers.

The API runs as a single process, so a dict of timestamps per key is enough. If it ever runs on
several instances, move these counters to a shared store (e.g. Redis) so the limits hold across them.
"""
import time
from collections import deque
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request

_hits: dict[str, deque] = {}
_lock = Lock()
_last_sweep = time.monotonic()


def client_ip(request: Request) -> str:
    """The caller's IP. Behind Render's proxy the real address is in the forwarding headers."""
    for header in ("cf-connecting-ip", "true-client-ip"):
        if value := request.headers.get(header):
            return value.strip()
    if forwarded := request.headers.get("x-forwarded-for"):
        # Proxies append; the last entry was added by the proxy in front of us, so it can't be spoofed
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _sweep(now: float) -> None:
    """Drop keys that have gone quiet so the dict doesn't grow forever."""
    global _last_sweep
    if now - _last_sweep < 300:
        return
    _last_sweep = now
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > 3600]:
        del _hits[key]


def _recent(key: str, window_seconds: int, now: float) -> deque:
    q = _hits.setdefault(key, deque())
    while q and now - q[0] > window_seconds:
        q.popleft()
    return q


def _too_many(q: deque, window_seconds: int, now: float) -> HTTPException:
    return HTTPException(
        status_code=429,
        detail="Too many attempts. Please wait a moment and try again.",
        headers={"Retry-After": str(int(window_seconds - (now - q[0])) + 1)},
    )


def check(key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 if `key` already used up its attempts, without recording a new one."""
    now = time.monotonic()
    with _lock:
        q = _recent(key, window_seconds, now)
        if len(q) >= limit:
            raise _too_many(q, window_seconds, now)


def hit(key: str, limit: int, window_seconds: int) -> None:
    """Record one attempt for `key`; raise 429 if there were already `limit` in the window."""
    now = time.monotonic()
    with _lock:
        _sweep(now)
        q = _recent(key, window_seconds, now)
        if len(q) >= limit:
            raise _too_many(q, window_seconds, now)
        q.append(now)


def reset(key: str) -> None:
    with _lock:
        _hits.pop(key, None)


def limit_by_ip(name: str, limit: int, window_seconds: int) -> Callable:
    """FastAPI dependency: at most `limit` calls per IP per window for this endpoint."""
    def dependency(request: Request) -> None:
        hit(f"{name}:ip:{client_ip(request)}", limit, window_seconds)
    return dependency
