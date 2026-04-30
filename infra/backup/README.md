# aioffice backup

Off-site backup for the production Supabase project — DB dump (public + auth +
storage schemas) and Storage object snapshot, each gzipped, tarred, and
retained for `RETENTION_DAYS`.

## Where it runs

PVE VM `cron` (VMID 105, internal `10.10.10.105`, SSH `ssh -p 50105
user@140.113.194.229`). Cron fires daily at **03:00 Asia/Taipei**.

This is "phase 1" — backups live on PVE local disk only. Phase 2 will push
the same archives to Cloudflare R2 for true off-site redundancy; once that
lands, the local copy stays as fast restore source.

## Files

- `backup-db.sh` — `pg_dump` → gzip → `${BACKUP_ROOT}/db/aioffice-<ts>.sql.gz`
- `backup-storage.sh` — enumerate every bucket via Storage REST API, download
  every object, tar.gz → `${BACKUP_ROOT}/storage/aioffice-storage-<ts>.tar.gz`
- `backup-all.sh` — orchestrator + retention prune. **This is what cron
  runs.**
- `restore-drill.sh` — replay latest dump into a throwaway Docker Postgres,
  assert rows survived. Run manually before trusting the pipeline; consider
  weekly cron once stable.
- `secrets.env.example` — copy to `/etc/aioffice-backup/secrets.env`,
  `chmod 600`, fill in.

## One-time VM setup

Done in commit landing this directory:

- Ubuntu 24.04 cloud-init template clone (VMID 105, 2 vCPU, 2GB RAM).
- Timezone `Asia/Taipei`.
- `postgresql-client-17` from PGDG (matches Supabase server major).
- `curl`, `jq`, `docker.io` (for restore drill).
- Scripts deployed to `/opt/aioffice-backup/`.
- Secrets in `/etc/aioffice-backup/secrets.env` (chmod 600, root-owned).
- Backup root `/var/backups/aioffice/` (root-owned, 0700).
- Cron entry: `0 3 * * * /opt/aioffice-backup/backup-all.sh`.

## How to refresh secrets

The two things that occasionally need rotating:

1. **DB password** — Supabase dashboard → Settings → Database → Reset database
   password → paste into `DATABASE_URL` in secrets.env.
2. **Service role key** — Supabase dashboard → Settings → API → service_role
   key → paste into `SUPABASE_SERVICE_ROLE_KEY` in secrets.env.

After either rotation, run `backup-all.sh` once manually to confirm.

## Restore checklist

If production ever burns:

1. SSH to cron VM, find the latest archive in `/var/backups/aioffice/db/`.
2. Spin up a fresh Postgres (Supabase or self-hosted), get its connection URL.
3. `zcat <dump> | psql "<new-db-url>" -v ON_ERROR_STOP=1`.
4. Restore storage by extracting `aioffice-storage-<ts>.tar.gz` and pushing
   each bucket back via the Storage REST API (same shape as
   `backup-storage.sh` but reversed).
5. Re-point Vercel env vars at the new Supabase URL/keys.

The drill script proves step 3 works. Steps 4–5 need an actual disaster
to test fully — keep that in mind when sizing your incident response.

## Phase 2 (planned)

- Add Cloudflare R2 bucket as `aioffice-backup`.
- Append `aws s3 cp ... --endpoint-url=...` calls in `backup-all.sh`.
- 30-day R2 lifecycle rule on top of 14-day local retention.
- Drift watch: weekly diff of local vs R2 inventory.
