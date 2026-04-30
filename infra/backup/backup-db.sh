#!/usr/bin/env bash
# Dump the public + auth + storage schemas from production Postgres to a
# gzipped SQL file. Idempotent: each invocation creates a new timestamped
# file. Reads DATABASE_URL from /etc/aioffice-backup/secrets.env.

set -euo pipefail

source /etc/aioffice-backup/secrets.env

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out_dir="${BACKUP_ROOT}/db"
out_file="${out_dir}/aioffice-${ts}.sql.gz"
mkdir -p "${out_dir}"

# --no-owner/--no-acl keeps the dump portable to a fresh Postgres without
# Supabase-specific roles. Auth runtime tables (sessions, tokens, audit
# log) are intentionally excluded — they regenerate on first login and
# carrying them would just leak short-lived JWTs into long-term storage.
pg_dump "${DATABASE_URL}" \
  --no-owner --no-acl \
  --schema=public --schema=auth --schema=storage \
  --exclude-table-data='auth.audit_log_entries' \
  --exclude-table-data='auth.flow_state' \
  --exclude-table-data='auth.refresh_tokens' \
  --exclude-table-data='auth.sessions' \
  --exclude-table-data='auth.mfa_*' \
  --exclude-table-data='auth.saml_*' \
  --exclude-table-data='auth.sso_*' \
  --exclude-table-data='auth.one_time_tokens' \
  | gzip -9 > "${out_file}"

size_bytes="$(stat -c%s "${out_file}")"
size_human="$(numfmt --to=iec --suffix=B "${size_bytes}")"
echo "[backup-db] ${out_file} (${size_human})"

if [[ "${size_bytes}" -lt 1024 ]]; then
  echo "[backup-db] FATAL: dump under 1KB, almost certainly empty" >&2
  exit 1
fi

# Smoke-check: gzip integrity + first SQL line looks like a Postgres dump
gzip -t "${out_file}"
zcat "${out_file}" | head -3 | grep -q "PostgreSQL database dump"
echo "[backup-db] integrity ok"
