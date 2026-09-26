"""
storage/cache.py — Analysis cache with Redis (production) or in-memory (development) backend.
"""

import json
import os
import time
from typing import Optional

class AnalysisCache:
    """Async-compatible analysis cache with TTL support."""

    def __init__(self):
        self._redis = None
        self._memory_store = {}
        self._ttl = int(os.getenv("CACHE_TTL_SECONDS", "86400"))  # 24h default

    async def _get_redis(self):
        if self._redis is None:
            redis_url = os.getenv("REDIS_URL")
            if redis_url:
                try:
                    import redis.asyncio as aioredis
                    self._redis = aioredis.from_url(redis_url, decode_responses=True)
                    await self._redis.ping()
                except Exception as e:
                    print(f"[CACHE] Redis unavailable ({e}), using in-memory fallback")
                    self._redis = False  # Sentinel: don't retry
        return self._redis if self._redis else None

    async def store(self, key: str, data: dict):
        r = await self._get_redis()
        if r:
            await r.setex(f"carbon:analysis:{key}", self._ttl, json.dumps(data))
        else:
            self._memory_store[key] = {"data": data, "expires": time.time() + self._ttl}

    async def get(self, key: str) -> Optional[dict]:
        r = await self._get_redis()
        if r:
            raw = await r.get(f"carbon:analysis:{key}")
            return json.loads(raw) if raw else None
        else:
            entry = self._memory_store.get(key)
            if entry and entry["expires"] > time.time():
                return entry["data"]
            return None

    async def delete(self, key: str):
        r = await self._get_redis()
        if r:
            await r.delete(f"carbon:analysis:{key}")
        else:
            self._memory_store.pop(key, None)


# Singleton
analysis_cache = AnalysisCache()
