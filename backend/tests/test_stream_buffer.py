import asyncio

from app.core.stream_buffer import (
    StreamFailed,
    get_stream,
    new_stream,
    parse_last_event_id,
)


def test_parse_last_event_id():
    assert parse_last_event_id(None) == (None, -1)
    assert parse_last_event_id("abc:3") == ("abc", 3)
    assert parse_last_event_id("ab:c:9") == ("ab:c", 9)
    assert parse_last_event_id("nocolon") == (None, -1)


def test_buffer_replays_from_offset():
    async def main():
        sid, buf = new_stream(7)
        await buf.push("a")
        await buf.push("b")
        await buf.push("c")
        await buf.finish()
        got = [token async for _, token in buf.iter_from(1)]
        assert got == ["b", "c"]
        assert get_stream(sid, 7) is buf
        assert get_stream(sid, 99) is None

    asyncio.run(main())


def test_buffer_surfaces_error_after_tokens():
    async def main():
        _, buf = new_stream(1)
        await buf.push("ok")
        await buf.finish(error="boom")
        tokens = []
        try:
            async for _, token in buf.iter_from(0):
                tokens.append(token)
        except StreamFailed as exc:
            assert str(exc) == "boom"
        assert tokens == ["ok"]

    asyncio.run(main())
