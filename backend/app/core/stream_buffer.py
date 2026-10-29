"""In-process SSE resume buffer. Last-Event-ID = `{stream_id}:{seq}`."""

from __future__ import annotations

import asyncio
import secrets
import time
from collections.abc import AsyncIterator

# ponytail: process-local. Redis if resume must hop workers when WEB_CONCURRENCY > 1.
TTL_SECONDS = 120
_buffers: dict[str, tuple[float, "StreamBuffer"]] = {}
_tasks: set[asyncio.Task] = set()


class StreamFailed(Exception):
    pass


class StreamBuffer:
    def __init__(self, owner_id: int):
        self.owner_id = owner_id
        self.tokens: list[str] = []
        self.done = False
        self.error: str | None = None
        self._cond = asyncio.Condition()

    async def push(self, token: str) -> None:
        async with self._cond:
            self.tokens.append(token)
            self._cond.notify_all()

    async def finish(self, error: str | None = None) -> None:
        async with self._cond:
            self.error = error
            self.done = True
            self._cond.notify_all()

    async def wait_ready(self, timeout: float = 60.0) -> None:
        async with self._cond:
            if self.tokens or self.done:
                return
            try:
                await asyncio.wait_for(self._cond.wait(), timeout=timeout)
            except TimeoutError:
                return

    async def iter_from(self, start: int) -> AsyncIterator[tuple[int, str]]:
        i = max(int(start), 0)
        while True:
            async with self._cond:
                while i >= len(self.tokens) and not self.done:
                    await self._cond.wait()
                if i < len(self.tokens):
                    seq = i
                    token = self.tokens[i]
                    i += 1
                elif self.error:
                    raise StreamFailed(self.error)
                else:
                    return
            yield seq, token


def parse_last_event_id(raw: str | None) -> tuple[str | None, int]:
    value = (raw or "").strip()
    if ":" not in value:
        return None, -1
    stream_id, _, seq = value.rpartition(":")
    if not stream_id:
        return None, -1
    try:
        return stream_id, int(seq)
    except ValueError:
        return None, -1


def _gc(now: float | None = None) -> None:
    cutoff = (now or time.time()) - TTL_SECONDS
    for key in [k for k, (ts, _) in _buffers.items() if ts < cutoff]:
        _buffers.pop(key, None)


def new_stream(owner_id: int) -> tuple[str, StreamBuffer]:
    _gc()
    stream_id = secrets.token_urlsafe(8)
    buf = StreamBuffer(owner_id)
    _buffers[stream_id] = (time.time(), buf)
    return stream_id, buf


def get_stream(stream_id: str | None, owner_id: int) -> StreamBuffer | None:
    if not stream_id:
        return None
    _gc()
    item = _buffers.get(stream_id)
    if not item:
        return None
    ts, buf = item
    if time.time() - ts > TTL_SECONDS:
        _buffers.pop(stream_id, None)
        return None
    if buf.owner_id != owner_id:
        return None
    _buffers[stream_id] = (time.time(), buf)
    return buf


def spawn(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return task
