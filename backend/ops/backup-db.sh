#!/usr/bin/env bash
# Dumps the production MySQL database from the Docker Compose stack and keeps the newest dumps.
# Installed next to docker-compose.yml by CI. Run it from cron, e.g. daily at 09:15 UTC:
#   15 9 * * * $HOME/mad-enroll/backup-db.sh >> $HOME/mad-enroll/backups/backup.log 2>&1
# Restore one dump:
#   gunzip -c backups/<file>.sql.gz | docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"'
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/course_monitor_db-$STAMP.sql.gz"

notify_failure() {
    # Reuse the app's Bark URL from .env so a failed backup reaches the admin's phone.
    local bark
    bark="$(grep -E '^BARK_URL=' "$APP_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2- || true)"
    if [ -n "$bark" ]; then
        curl -fsS -m 10 "${bark%/}/MadEnroll%3A%20backup%20failed/Database%20backup%20failed%20at%20$STAMP%20UTC?level=timeSensitive&group=MadEnroll" >/dev/null || true
    fi
    rm -f "$OUT.tmp"
}
trap notify_failure ERR

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
docker compose exec -T db sh -c \
    'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --databases course_monitor_db' \
    | gzip > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"

ls -1t "$BACKUP_DIR"/course_monitor_db-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "[$(date -u +%FT%TZ)] backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
