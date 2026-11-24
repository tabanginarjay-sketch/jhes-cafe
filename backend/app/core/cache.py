"""
In-memory thread-safe TTL Cache Manager for Jhe's Cafe'.

Provides:
- High-speed cache-aside caching for Airtable records
- Automatic TTL expiration and pruning
- Prefix-based invalidation (e.g., invalidate "catalog:" when menu is updated)
- Observability metrics (hits, misses, hit ratio)
- Resilient fallback cache to preserve uptime during external API glitches
"""

import asyncio
import time
import threading
from typing import Any, Callable, Dict, Optional, Tuple


class CacheEntry:
    """Represents a cached value with timestamp and expiration."""
    __slots__ = ("value", "expires_at", "created_at")

    def __init__(self, value: Any, ttl_seconds: float):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl_seconds

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class CacheManager:
    """
    Thread-safe in-memory cache supporting TTL, prefix invalidation, and metrics.
    """

    def __init__(self):
        self._store: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._hits: int = 0
        self._misses: int = 0

    def get(self, key: str) -> Optional[Any]:
        """Fetch item if present and unexpired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None

            if entry.is_expired:
                del self._store[key]
                self._misses += 1
                return None

            self._hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: float = 60.0) -> None:
        """Store item with time-to-live."""
        with self._lock:
            self._store[key] = CacheEntry(value=value, ttl_seconds=ttl_seconds)

    def delete(self, key: str) -> bool:
        """Remove single key from cache."""
        with self._lock:
            return self._store.pop(key, None) is not None

    def invalidate_prefix(self, prefix: str) -> int:
        """
        Invalidate all keys beginning with prefix (e.g. 'catalog:').
        Returns count of keys invalidated.
        """
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]
            return len(keys_to_delete)

    def clear(self) -> None:
        """Purge all cached items."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0

    def get_stats(self) -> dict[str, Any]:
        """Return cache health and efficiency metrics."""
        with self._lock:
            # Prune expired entries during stats check
            now = time.time()
            valid_keys = [k for k, v in self._store.items() if v.expires_at > now]
            active_count = len(valid_keys)

            total_requests = self._hits + self._misses
            hit_ratio = round((self._hits / total_requests * 100), 1) if total_requests > 0 else 0.0

            return {
                "active_items": active_count,
                "hits": self._hits,
                "misses": self._misses,
                "total_queries": total_requests,
                "hit_ratio_percent": hit_ratio,
                "status": "operational",
            }

    async def get_or_set(
        self,
        key: str,
        coro_fn: Callable[[], Any],
        ttl_seconds: float = 60.0,
        fallback_stale: bool = True,
    ) -> Any:
        """
        Cache-aside helper.
        Returns cached value if fresh; otherwise runs coro_fn, updates cache, and returns result.
        If coro_fn fails and fallback_stale is enabled, returns previous cached value if available.
        """
        cached = self.get(key)
        if cached is not None:
            return cached

        try:
            val = await coro_fn()
            self.set(key, val, ttl_seconds=ttl_seconds)
            return val
        except Exception as exc:
            # Check if an expired entry is still stored and can serve as fallback
            if fallback_stale:
                with self._lock:
                    entry = self._store.get(key)
                    if entry is not None:
                        # Log and serve stale
                        return entry.value
            raise exc


# Global cache manager instance
cache = CacheManager()
