#!/bin/sh
# Seenova AI: the database copied every night (24 Nov 2026, the user's "Backups + failure alerts": the free Supabase
# plan keeps no copy that can be restored). On the server as /opt/geo-backend/deploy/geo-backup.sh, run as root by
# geo-backup.timer (Docker needs root). Keeps the last 7 days in /opt/geo-backend/backups, readable by root alone; a
# failure emails the team (app/alerts.py). How to restore: backend/README.md, "Backups".
set -eu

ROOT=/opt/geo-backend
DIR="$ROOT/backups"
KEEP_DAYS=7
TARGET="$DIR/geo-$(date +%Y-%m-%d).dump"
ENVFILE=$(mktemp)
trap 'rm -f "$ENVFILE" "$TARGET.part"' EXIT

fail() {
  echo "backup failed: $1" >&2
  last=$(ls -1t "$DIR"/geo-*.dump 2>/dev/null | head -1)
  # The team is told; an email that can't go out doesn't hide the failure from the timer
  (cd "$ROOT" && sudo -u geo ./.venv/bin/python -m app.alerts backup_failed "The night's database copy failed: $1. The last good copy: ${last:-none}. The details: journalctl -u geo-backup") || true
  exit 1
}

mkdir -p "$DIR"
chmod 700 "$DIR"
# The app's address of the database, as libpq writes it (SQLAlchemy's says which driver: postgresql+psycopg://)
URL=$(grep -E '^DATABASE_URL=' "$ROOT/.env" | cut -d= -f2- | sed -E 's#^postgresql\+[a-z0-9]+://#postgresql://#')
[ -n "$URL" ] || fail "no DATABASE_URL in $ROOT/.env"
# Through a file, not the command line, where every process on the server could read the password
chmod 600 "$ENVFILE"
printf 'PGURL=%s\n' "$URL" > "$ENVFILE"

# pg_dump of the same major version as the database (Postgres 17), from Docker, since the server has no client of its
# own; on the server's network, as the database's address answers over IPv6 alone. The app's tables are in `public`:
# Supabase's own schemas aren't ours to copy.
docker run --rm --network host --env-file "$ENVFILE" postgres:17 \
  sh -c 'exec pg_dump --format=custom --no-owner --no-privileges --schema=public "$PGURL"' > "$TARGET.part" \
  || fail "pg_dump stopped with an error"
[ -s "$TARGET.part" ] || fail "the copy came out empty"
mv "$TARGET.part" "$TARGET"
chmod 600 "$TARGET"
find "$DIR" -name 'geo-*.dump' -mtime +$((KEEP_DAYS - 1)) -delete
echo "backup: $TARGET, $(du -h "$TARGET" | cut -f1)"
