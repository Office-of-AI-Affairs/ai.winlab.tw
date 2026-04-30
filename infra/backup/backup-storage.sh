#!/usr/bin/env bash
# Snapshot every object in every bucket via the Supabase Storage REST API.
# Layout: BACKUP_ROOT/storage/<timestamp>/<bucket>/<object_path>
# Then tar.gz the timestamped directory and remove the working tree.
#
# Uses curl + jq to avoid pulling in node/python. Works for any bucket the
# service role can read.

set -euo pipefail

source /etc/aioffice-backup/secrets.env

ts="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="${BACKUP_ROOT}/storage/${ts}"
out_file="${BACKUP_ROOT}/storage/aioffice-storage-${ts}.tar.gz"
mkdir -p "${work_dir}"

api="${SUPABASE_URL}/storage/v1"
auth=(-H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

# 1. enumerate buckets
mapfile -t buckets < <(
  curl -fsS "${auth[@]}" "${api}/bucket" | jq -r '.[].name'
)

total_objects=0
for bucket in "${buckets[@]}"; do
  # 2. enumerate objects (recursive). Storage API caps at 1000 per call;
  # paginate with offset until empty.
  offset=0
  limit=1000
  while :; do
    page="$(curl -fsS "${auth[@]}" \
      -H "Content-Type: application/json" \
      -X POST "${api}/object/list/${bucket}" \
      -d "{\"prefix\":\"\",\"limit\":${limit},\"offset\":${offset},\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}")"
    count="$(echo "${page}" | jq 'length')"
    [[ "${count}" -eq 0 ]] && break

    while IFS=$'\t' read -r name id; do
      # objects with id=null are directory placeholders — skip
      [[ "${id}" == "null" ]] && continue
      mkdir -p "${work_dir}/${bucket}/$(dirname "${name}")"
      curl -fsS "${auth[@]}" \
        "${api}/object/${bucket}/${name}" \
        -o "${work_dir}/${bucket}/${name}"
      total_objects=$((total_objects + 1))
    done < <(echo "${page}" | jq -r '.[] | "\(.name)\t\(.id)"')

    [[ "${count}" -lt "${limit}" ]] && break
    offset=$((offset + limit))
  done
done

echo "[backup-storage] downloaded ${total_objects} objects across ${#buckets[@]} buckets"

# 3. tarball + cleanup
tar -C "${BACKUP_ROOT}/storage" -czf "${out_file}" "${ts}"
rm -rf "${work_dir}"

size_bytes="$(stat -c%s "${out_file}")"
size_human="$(numfmt --to=iec --suffix=B "${size_bytes}")"
echo "[backup-storage] ${out_file} (${size_human})"

# Smoke-check archive
tar -tzf "${out_file}" >/dev/null
echo "[backup-storage] integrity ok"
