#!/bin/sh
# Daily dump of the ai.winlab.tw database, files included (they are rows).
# Runs on the Carrel machine `ai` from a systemd timer:
#
#   /etc/systemd/system/ai-db-backup.service
#     [Service]
#     Type=oneshot
#     ExecStart=/opt/ai-db/backup.sh
#   /etc/systemd/system/ai-db-backup.timer
#     [Timer]
#     OnCalendar=*-*-* 03:30:00 Asia/Taipei
#     Persistent=true
#     [Install]
#     WantedBy=timers.target
#
# Restore: docker compose exec -T postgres pg_restore -U ai -d ai --clean < <file>
set -eu

DIR=${BACKUP_DIR:-/var/backups/ai-db}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DIR"
chmod 700 "$DIR"

stamp=$(date +%Y%m%d-%H%M%S)
out="$DIR/ai-$stamp.dump"
docker compose -f /opt/ai-db/compose.yaml exec -T postgres pg_dump -U ai -d ai -Fc > "$out.part"
mv "$out.part" "$out"
chmod 600 "$out"

find "$DIR" -name 'ai-*.dump' -mtime "+$KEEP_DAYS" -delete
echo "backup: $out ($(du -h "$out" | cut -f1))"
