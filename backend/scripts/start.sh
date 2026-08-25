#!/bin/sh
# Production start: migrate → ingest PYQs → serve.
# Used by Dockerfile CMD and railway.toml startCommand so they cannot drift.
# Ingest failure must abort boot (set -e). First boot is slow: embeddings download.
set -eu

alembic upgrade head

if [ -n "${RAG_CHROMA_PATH:-}" ]; then
  CHROMA_PATH="$RAG_CHROMA_PATH"
elif [ -n "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
  CHROMA_PATH="${RAILWAY_VOLUME_MOUNT_PATH}/chroma"
else
  CHROMA_PATH="/data/chroma"
fi

SOURCE="${PYQS_SOURCE:-/app/data/pyqs.json}"
MIN_DOCS="${RAG_MIN_DOCS:-100}"

echo "start.sh: chroma=${CHROMA_PATH} source=${SOURCE} min_docs=${MIN_DOCS}"

python -m data.ingest \
  --source "$SOURCE" \
  --chroma-path "$CHROMA_PATH" \
  --min-docs "$MIN_DOCS"

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-1}"
