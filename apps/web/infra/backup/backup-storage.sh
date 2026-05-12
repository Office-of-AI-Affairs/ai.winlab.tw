#!/usr/bin/env bash
# Snapshot every object in every bucket via the Supabase Storage REST API.
# Layout: BACKUP_ROOT/storage/<timestamp>/<bucket>/<object_path>
# Then tar.gz the timestamped directory and remove the working tree.
#
# The /object/list API returns one directory level per call (folders show
# up as entries with id=null), so we BFS through folders to find every
# real file. Both buckets in this project use nested paths
# (announcement-images has 80+ files in subfolders, resumes uses
# resumes/<user-id>/<file>.pdf), so the previous flat listing missed
# almost everything.

set -euo pipefail

source /etc/aioffice-backup/secrets.env

ts="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="${BACKUP_ROOT}/storage/${ts}"
out_file="${BACKUP_ROOT}/storage/aioffice-storage-${ts}.tar.gz"
mkdir -p "${work_dir}"

api="${SUPABASE_URL}/storage/v1"
auth=(-H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

list_page() {
  local bucket="$1" prefix="$2" offset="$3"
  curl -fsS "${auth[@]}" \
    -H 'Content-Type: application/json' \
    -X POST "${api}/object/list/${bucket}" \
    -d "{\"prefix\":\"${prefix}\",\"limit\":1000,\"offset\":${offset},\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}"
}

walk_bucket() {
  local bucket="$1" count=0
  local -a prefix_stack=("")
  while [[ ${#prefix_stack[@]} -gt 0 ]]; do
    local prefix="${prefix_stack[-1]}"
    unset 'prefix_stack[-1]'
    local offset=0
    while :; do
      local page n
      page="$(list_page "${bucket}" "${prefix}" "${offset}")"
      n="$(echo "${page}" | jq 'length')"
      [[ "${n}" -eq 0 ]] && break
      while IFS=$'\t' read -r name id; do
        local full_path
        if [[ -z "${prefix}" ]]; then
          full_path="${name}"
        else
          full_path="${prefix}/${name}"
        fi
        if [[ "${id}" == "null" ]]; then
          prefix_stack+=("${full_path}")
        else
          mkdir -p "${work_dir}/${bucket}/$(dirname "${full_path}")"
          curl -fsS "${auth[@]}" \
            "${api}/object/${bucket}/${full_path}" \
            -o "${work_dir}/${bucket}/${full_path}"
          count=$((count + 1))
        fi
      done < <(echo "${page}" | jq -r '.[] | "\(.name)\t\(.id)"')
      [[ "${n}" -lt 1000 ]] && break
      offset=$((offset + 1000))
    done
  done
  echo "[backup-storage] ${bucket}: ${count} files"
}

mapfile -t buckets < <(curl -fsS "${auth[@]}" "${api}/bucket" | jq -r '.[].name')

total=0
for bucket in "${buckets[@]}"; do
  before="$(find "${work_dir}" -type f 2>/dev/null | wc -l || echo 0)"
  walk_bucket "${bucket}"
  after="$(find "${work_dir}" -type f 2>/dev/null | wc -l || echo 0)"
  total=$((total + after - before))
done

echo "[backup-storage] total: ${total} files across ${#buckets[@]} buckets"

tar -C "${BACKUP_ROOT}/storage" -czf "${out_file}" "${ts}"
rm -rf "${work_dir}"

size_bytes="$(stat -c%s "${out_file}")"
size_human="$(numfmt --to=iec --suffix=B "${size_bytes}")"
echo "[backup-storage] ${out_file} (${size_human})"
tar -tzf "${out_file}" >/dev/null
echo "[backup-storage] integrity ok"
