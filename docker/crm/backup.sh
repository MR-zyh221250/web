#!/bin/sh
# Run on the deployment host as root; backup includes CRM accounts and records.
set -eu
umask 077
dir=/opt/neon-crm/backups
mkdir -p "$dir"
file="$dir/$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
tmp="$file.sql.tmp"
trap 'rm -f "$tmp" "$file.tmp"' EXIT
docker exec neon-crm-db-1 sh -c 'export MYSQL_PWD=$(cat /run/secrets/db_root_password); exec mysqldump --hex-blob -uroot --single-transaction --no-tablespaces --routines --triggers neon' > "$tmp"
test -s "$tmp"
gzip -c "$tmp" > "$file.tmp"
gzip -t "$file.tmp"
mv "$file.tmp" "$file"
find "$dir" -maxdepth 1 -type f -name '*.sql.gz' -mtime +7 -delete
echo "CRM backup completed."
