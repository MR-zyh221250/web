#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
: "${NEON_BUILD_ID:?Set the TeamCity build id}"
case "$NEON_BUILD_ID" in ''|*[!0-9]*) echo 'Invalid build id' >&2; exit 2;; esac
revision=$(git rev-parse HEAD)
short_revision=$(printf '%s' "$revision" | cut -c1-12)
image="neon-loft:build-${NEON_BUILD_ID}-${short_revision}"
smoke="neon-loft-smoke-${NEON_BUILD_ID}"
mkdir -p .ci-output
docker build --pull --label "org.opencontainers.image.revision=$revision" -t "$image" .
cleanup() { docker rm -f "$smoke" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker run -d --name "$smoke" --read-only --network none --tmpfs /tmp:size=16m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges --memory 128m --pids-limit 128 "$image"
healthy=false
i=0
while [ "$i" -lt 30 ]; do
  state=$(docker inspect --format '{{.State.Health.Status}}' "$smoke")
  if [ "$state" = healthy ]; then healthy=true; break; fi
  if [ "$state" = unhealthy ]; then break; fi
  i=$((i + 1)); sleep 2
done
if [ "$healthy" != true ]; then docker logs "$smoke"; echo 'Container health check failed' >&2; exit 1; fi
for route in / /manage.html /project-notes.txt /assets/textures/street_live/cyberpunk_facade_a.jpg; do
  docker exec "$smoke" wget -q -O /dev/null "http://127.0.0.1:8080$route"
done
if docker exec "$smoke" wget -q -O /dev/null http://127.0.0.1:8080/does-not-exist; then
  echo 'Missing files must return 404' >&2; exit 1
fi
printf '%s\n' "$image" > .ci-output/image.txt
printf 'commit=%s\nimage=%s\n' "$revision" "$image" > .ci-output/release.txt
echo 'Image build and HTTP smoke checks passed.'

export NEON_API_IMAGE="neon-loft-api:build-${NEON_BUILD_ID}-${short_revision}"
docker build --pull --label "org.opencontainers.image.revision=$revision" -t "$NEON_API_IMAGE" backend
sh ci/test-api.sh
printf '%s\n' "$NEON_API_IMAGE" > .ci-output/api-image.txt
printf 'api_image=%s\n' "$NEON_API_IMAGE" >> .ci-output/release.txt