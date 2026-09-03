#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# This pipeline is intentionally restricted to the provisioned production agent.
[ "${NEON_DEPLOY_TARGET:-}" = neon-loft-production ] || { echo 'Wrong deployment agent' >&2; exit 2; }
: "${NEON_DEPLOY_STATE_DIR:?Set a persistent deployment-state directory}"
: "${NEON_HTTP_PORT:?Set the verified free server port}"
case "$NEON_HTTP_PORT" in ''|*[!0-9]*) echo 'Invalid port' >&2; exit 2;; esac
[ "$NEON_HTTP_PORT" -ge 1 ] && [ "$NEON_HTTP_PORT" -le 65535 ]
image=$(cat .ci-output/image.txt)
case "$image" in neon-loft:build-*) ;; *) echo 'Invalid release image' >&2; exit 2;; esac
export NEON_IMAGE="$image"
docker image inspect "$image" >/dev/null
docker compose -p neon-loft -f compose.yaml config --quiet
mkdir -p "$NEON_DEPLOY_STATE_DIR"
lock="$NEON_DEPLOY_STATE_DIR/deploy.lock"
mkdir "$lock" || { echo 'A deployment is already running; inspect its lock before retrying.' >&2; exit 1; }
cleanup() { rmdir "$lock" 2>/dev/null || true; }
trap cleanup EXIT
previous_id=$(docker compose -p neon-loft -f compose.yaml ps -q web 2>/dev/null || true)
previous=''
if [ -n "$previous_id" ]; then previous=$(docker inspect --format '{{.Image}}' "$previous_id"); fi
apply_image() {
  NEON_IMAGE="$1" docker compose -p neon-loft -f compose.yaml up -d --no-build --pull never --wait --wait-timeout 60 web
}
rollback() {
  echo 'Deployment failed; attempting to restore the previous release.' >&2
  if [ -n "$previous" ]; then
    # Tag the immutable image ID, even if its original tag was replaced.
    docker tag "$previous" neon-loft:rollback
    if apply_image neon-loft:rollback; then echo 'Previous release restored.' >&2;
    else echo 'ROLLBACK FAILED: check container logs immediately.' >&2; fi
  else
    NEON_IMAGE="$image" docker compose -p neon-loft -f compose.yaml stop web || true
    echo 'No previous release exists; failed first release has been stopped.' >&2
  fi
}
trap 'rollback; exit 130' INT
trap 'rollback; exit 143' TERM
if ! apply_image "$image"; then rollback; exit 1; fi
container=$(docker compose -p neon-loft -f compose.yaml ps -q web)
if ! docker exec "$container" wget -q -O /dev/null http://127.0.0.1:8080/manage.html; then
  rollback; exit 1
fi
printf '%s\n' "$previous" > "$NEON_DEPLOY_STATE_DIR/previous-image-id.txt"
printf '%s\n' "$image" > "$NEON_DEPLOY_STATE_DIR/current-image.txt"
cp .ci-output/release.txt "$NEON_DEPLOY_STATE_DIR/release.txt"
echo "Deployed $image on port $NEON_HTTP_PORT."
