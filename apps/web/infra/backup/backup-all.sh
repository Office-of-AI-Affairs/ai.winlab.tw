#!/usr/bin/env bash
# Orchestrator: run db + storage backup, then prune old files past
# RETENTION_DAYS. Designed to be the single entry point for cron.

set -euo pipefail

source /etc/aioffice-backup/secrets.env

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== aioffice backup $(date -Iseconds) ==="

"${script_dir}/backup-db.sh"
"${script_dir}/backup-storage.sh"

# Retention prune. Use mtime to be filesystem-portable.
find "${BACKUP_ROOT}/db" -name 'aioffice-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete -print | sed 's/^/[prune] /'
find "${BACKUP_ROOT}/storage" -name 'aioffice-storage-*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete -print | sed 's/^/[prune] /'

# Tally what survived
db_count="$(find "${BACKUP_ROOT}/db" -name 'aioffice-*.sql.gz' | wc -l)"
storage_count="$(find "${BACKUP_ROOT}/storage" -name 'aioffice-storage-*.tar.gz' | wc -l)"
total_bytes="$(du -sb "${BACKUP_ROOT}" | cut -f1)"
total_human="$(numfmt --to=iec --suffix=B "${total_bytes}")"

echo "[summary] ${db_count} db dumps, ${storage_count} storage archives, ${total_human} on disk"
echo "=== done $(date -Iseconds) ==="
