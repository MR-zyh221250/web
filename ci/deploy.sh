#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ "${NEON_DEPLOY_TARGET:-}" = neon-loft-production ] || exit 2
: "${NEON_DEPLOY_STATE_DIR:?}"
: "${NEON_HTTP_PORT:?}"
export NEON_IMAGE=$(cat .ci-output/image.txt)
export NEON_API_IMAGE=$(cat .ci-output/api-image.txt)
export NEON_CRM_IMAGE=$(cat .ci-output/crm-image.txt)
case "$NEON_CRM_IMAGE" in neon-loft-crm:build-*) ;; *) exit 2;; esac
case "$NEON_IMAGE" in neon-loft:build-*) ;; *) exit 2;; esac
case "$NEON_API_IMAGE" in neon-loft-api:build-*) ;; *) exit 2;; esac
docker image inspect "$NEON_IMAGE" "$NEON_API_IMAGE" "$NEON_CRM_IMAGE" >/dev/null
docker compose -p neon-loft -f compose.yaml config --quiet
docker compose -p neon-crm -f docker/crm/compose.yaml config --quiet
umask 077
mkdir -p "$NEON_DEPLOY_STATE_DIR/backups"
lock="$NEON_DEPLOY_STATE_DIR/deploy.lock"
mkdir "$lock" || { echo 'Another deployment is active'; exit 1; }
trap 'rmdir "$lock" 2>/dev/null || true' EXIT
previous_web=$(docker inspect --format '{{.Image}}' neon-loft-web-1 2>/dev/null || true)
previous_crm=$(docker inspect --format '{{.Image}}' neon-loft-crm-1 2>/dev/null || true)
previous_api=$(docker inspect --format '{{.Image}}' neon-crm-api-1 2>/dev/null || true)
previous_origin=$(docker exec neon-crm-api-1 node -p 'process.env.PUBLIC_ORIGIN || ""' 2>/dev/null || true)
previous_front=$(docker exec neon-crm-api-1 node -p 'process.env.FRONT_ORIGIN || ""' 2>/dev/null || true)
proxy_dir=/opt/neon-proxy
test -w "$proxy_dir/Caddyfile" || { echo 'Mount /opt/neon-proxy into the trusted deployment Agent first'; exit 1; }
proxy_backup="$NEON_DEPLOY_STATE_DIR/backups/Caddyfile-$(date -u +%Y%m%dT%H%M%SZ)"
cp "$proxy_dir/Caddyfile" "$proxy_backup"
proxy_changed=false
# Backup before any additive schema migration. Credentials never enter command arguments.
if docker inspect neon-crm-db-1 >/dev/null 2>&1; then
 backup="$NEON_DEPLOY_STATE_DIR/backups/$(date -u +%Y%m%dT%H%M%SZ).sql"
 docker exec neon-crm-db-1 sh -c 'export MYSQL_PWD=$(cat /run/secrets/db_root_password); exec mysqldump --hex-blob -uroot --single-transaction --no-tablespaces --routines --triggers neon' > "$backup.tmp"
 test -s "$backup.tmp" && mv "$backup.tmp" "$backup"
 # Restrict retention to this application's completed SQL backups.
 find "$NEON_DEPLOY_STATE_DIR/backups" -maxdepth 1 -name '*.sql' -type f -mtime +7 -delete
fi
web(){ NEON_IMAGE="$1" docker compose -p neon-loft -f compose.yaml up -d --no-build --pull never --wait --wait-timeout 60 web; }
api(){ NEON_API_IMAGE="$1" docker compose -p neon-crm -f docker/crm/compose.yaml up -d --no-build --pull never --wait --wait-timeout 180 api; }
crm(){ NEON_CRM_IMAGE="$1" docker compose -p neon-loft -f compose.yaml up -d --no-build --pull never --wait --wait-timeout 60 crm; }
rollback(){
 echo 'Deployment failed; restoring application images (database is retained).'
 if [ -n "$previous_crm" ]; then docker tag "$previous_crm" neon-loft-crm:rollback; crm neon-loft-crm:rollback || echo 'CRM ROLLBACK FAILED';
 else docker compose -p neon-loft -f compose.yaml stop crm || true; fi
 if [ -n "$previous_api" ]; then docker tag "$previous_api" neon-loft-api:rollback; NEON_PUBLIC_ORIGIN="$previous_origin" NEON_FRONT_ORIGIN="$previous_front" api neon-loft-api:rollback || echo 'API ROLLBACK FAILED';
 else docker compose -p neon-crm -f docker/crm/compose.yaml stop api || true; fi
 if [ -n "$previous_web" ]; then docker tag "$previous_web" neon-loft:rollback; web neon-loft:rollback || echo 'WEB ROLLBACK FAILED'; fi
 if [ "$proxy_changed" = true ]; then cp "$proxy_backup" "$proxy_dir/Caddyfile"; docker restart neon-proxy-caddy-1 >/dev/null || echo 'PROXY ROLLBACK FAILED'; fi
}
trap 'rollback; exit 130' INT TERM
if ! api "$NEON_API_IMAGE"; then rollback; exit 1; fi
if ! crm "$NEON_CRM_IMAGE"; then rollback; exit 1; fi
if ! web "$NEON_IMAGE"; then rollback; exit 1; fi
if ! docker exec neon-crm-api-1 node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1))"; then rollback; exit 1; fi
proxy_changed=true
if ! cp docker/reverse-proxy/Caddyfile "$proxy_dir/Caddyfile"; then rollback; exit 1; fi
if ! docker exec neon-proxy-caddy-1 caddy validate --config /etc/caddy/Caddyfile; then rollback; exit 1; fi
if ! docker restart neon-proxy-caddy-1; then rollback; exit 1; fi
printf '%s\n' "$NEON_IMAGE" > "$NEON_DEPLOY_STATE_DIR/current-image.txt"
printf '%s\n' "$NEON_API_IMAGE" > "$NEON_DEPLOY_STATE_DIR/current-api-image.txt"
printf '%s\n' "$previous_web" > "$NEON_DEPLOY_STATE_DIR/previous-image-id.txt"
printf '%s\n' "$previous_api" > "$NEON_DEPLOY_STATE_DIR/previous-api-image-id.txt"
printf '%s\n' "$NEON_CRM_IMAGE" > "$NEON_DEPLOY_STATE_DIR/current-crm-image.txt"
cp .ci-output/release.txt "$NEON_DEPLOY_STATE_DIR/release.txt"
echo "Deployed web and API; MySQL volume retained."
