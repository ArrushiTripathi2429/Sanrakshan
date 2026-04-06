"""
Simple async rate limiter for Gemini API calls.
Gemini 2.0 Flash: 15 RPM free tier.
This ensures we never exceed that even with concurrent field workers.
"""

import asyncio
import time

class RateLimiter:
    def __init__(self, max_per_minute: int = 12):  # stay under 15 RPM limit
        self.max_per_minute = max_per_minute
        self.calls = []
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            # Remove calls older than 60 seconds
            self.calls = [t for t in self.calls if now - t < 60]
            if len(self.calls) >= self.max_per_minute:
                # Wait until oldest call is 60s old
                wait = 60 - (now - self.calls[0])
                if wait > 0:
                    await asyncio.sleep(wait)
                self.calls = self.calls[1:]
            self.calls.append(time.time())

# Global limiter instance
gemini_limiter = RateLimiter(max_per_minute=12)
