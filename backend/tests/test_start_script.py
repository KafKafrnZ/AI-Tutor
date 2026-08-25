"""Guard: production boot must ingest PYQs before serving, and fail closed."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
START_SH = BACKEND_ROOT / "scripts" / "start.sh"
RAILWAY_TOML = BACKEND_ROOT / "railway.toml"
DOCKERFILE = BACKEND_ROOT / "Dockerfile"


def test_start_script_exists_and_is_safe():
    text = START_SH.read_text(encoding="utf-8")
    assert "set -e" in text
    assert "alembic upgrade head" in text
    assert "data.ingest" in text
    assert "uvicorn" in text
    assert text.index("data.ingest") < text.index("uvicorn")
    assert "RAG_CHROMA_PATH" in text
    assert "RAILWAY_VOLUME_MOUNT_PATH" in text


def test_railway_and_dockerfile_use_the_same_start_script():
    railway = RAILWAY_TOML.read_text(encoding="utf-8")
    dockerfile = DOCKERFILE.read_text(encoding="utf-8")
    assert "scripts/start.sh" in railway
    assert "scripts/start.sh" in dockerfile
    assert "alembic upgrade head && uvicorn" not in railway
