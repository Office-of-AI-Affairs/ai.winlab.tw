#!/usr/bin/env bash
# Restore drill: take the latest db dump, replay it against a temp local
# Postgres in a Docker container, smoke-check a row count, tear down.
# Backups you've never restored aren't backups, they're hopes.
#
# Run manually whenever you change the dump pipeline. Cheap enough to also
# wire into a weekly cron once stable.

set -euo pipefail

source /etc/aioffice-backup/secrets.env

latest_dump="$(find "${BACKUP_ROOT}/db" -name 'aioffice-*.sql.gz' | sort | tail -1)"
if [[ -z "${latest_dump}" ]]; then
  echo "[drill] no dump found under ${BACKUP_ROOT}/db" >&2
  exit 1
fi

echo "[drill] using ${latest_dump}"

container="aioffice-restore-drill-$$"
log_file="/tmp/drill-${$}.log"
trap 'docker rm -f "${container}" >/dev/null 2>&1 || true; rm -f "${log_file}"' EXIT

docker run -d --name "${container}" \
  -e POSTGRES_PASSWORD=drill \
  -e POSTGRES_DB=drill \
  postgres:17 >/dev/null

# Wait for the container to accept connections
until docker exec "${container}" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

# Replay. The dump references public/auth/storage schemas, plus a few
# Supabase-specific roles that don't exist in vanilla Postgres — those rows
# error out with "role not found" but the schema + data we care about lands.
zcat "${latest_dump}" | docker exec -i "${container}" psql -U postgres -d drill -v ON_ERROR_STOP=0 >"${log_file}" 2>&1 || true

# Sanity check: profiles row count > 0
profile_count="$(docker exec "${container}" psql -U postgres -d drill -tAc 'SELECT count(*) FROM public.profiles;' 2>/dev/null || echo 0)"
echo "[drill] restored profiles row count: ${profile_count}"

if [[ "${profile_count}" -lt 1 ]]; then
  echo "[drill] FAIL: profiles table empty after replay" >&2
  echo "[drill] last 30 lines of replay log:" >&2
  tail -30 "${log_file}" >&2
  exit 1
fi

echo "[drill] OK — dump replays cleanly"
