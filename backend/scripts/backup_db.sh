#!/usr/bin/env bash
# Backup the Ascend AI PostgreSQL database using pg_dump.
#
# Required env var: DATABASE_URL  (format: postgresql://user:pass@host:port/db)
# Optional env var: BACKUP_DIR    (default: /tmp/ascend_backups)
#
# Usage (Railway cron or manual):
#   DATABASE_URL="$DATABASE_URL" BACKUP_DIR="/mnt/backups" ./scripts/backup_db.sh
#
# Output: <BACKUP_DIR>/ascend_ai_YYYYMMDD_HHMMSS.dump  (pg_dump custom format)
# Restore: pg_restore --clean --no-acl --no-owner -d "$DATABASE_URL" <file>

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/ascend_backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${BACKUP_DIR}/ascend_ai_${TIMESTAMP}.dump"

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL is not set" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

pg_dump \
    --format=custom \
    --no-acl \
    --no-owner \
    "$DATABASE_URL" \
    --file "$OUTPUT_FILE"

echo "Backup complete: $OUTPUT_FILE"
echo "Restore command: pg_restore --clean --no-acl --no-owner -d \"\$DATABASE_URL\" $OUTPUT_FILE"
