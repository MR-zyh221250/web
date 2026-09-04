#!/bin/sh
set -eu
: "${NEON_API_IMAGE:?}"
name="neon-api-test-${NEON_BUILD_ID:?}"
cleanup(){ docker rm -f -v "$name-api" "$name-db" >/dev/null 2>&1 || true; docker network rm "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
trap 'exit 130' INT TERM
docker network create --internal "$name" >/dev/null
# Test credentials are for this disposable, non-published network only.
docker run -d --name "$name-db" --network "$name" --network-alias db --memory 768m -e MYSQL_ROOT_PASSWORD=TestRoot123 -e MYSQL_DATABASE=neon -e MYSQL_USER=neon -e MYSQL_PASSWORD=TestDatabase123 mysql:8.4 --innodb-buffer-pool-size=128M --performance-schema=OFF >/dev/null
i=0
until docker exec -e MYSQL_PWD=TestDatabase123 "$name-db" mysql -h127.0.0.1 -uneon neon -e 'SELECT 1' >/dev/null 2>&1; do i=$((i+1)); [ "$i" -lt 60 ] || { echo 'Test DB did not start'; exit 1; }; sleep 2; done
docker run -d --name "$name-api" --network "$name" --memory 256m -e DB_PASSWORD=TestDatabase123 -e PUBLIC_ORIGIN=http://test.local -e COOKIE_SECURE=false "$NEON_API_IMAGE" >/dev/null
i=0
until docker exec "$name-api" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do i=$((i+1)); [ "$i" -lt 30 ] || exit 1; sleep 2; done
printf '%s' '{"username":"admin","name":"测试管理员","password":"TestInitial123!"}' | docker exec -i "$name-api" node server.mjs --bootstrap
docker exec "$name-api" node test.mjs
docker exec "$name-api" node market-test.mjs
docker restart "$name-api" >/dev/null
i=0
until docker exec "$name-api" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; do i=$((i+1)); [ "$i" -lt 30 ] || exit 1; sleep 2; done
docker exec "$name-api" node --input-type=module -e "const r=await fetch('http://127.0.0.1:3000/api/login',{method:'POST',headers:{Origin:'http://test.local','Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'TestChanged123!'})}); if(!r.ok)process.exit(1); const d=await fetch('http://127.0.0.1:3000/api/data',{headers:{Cookie:r.headers.get('set-cookie').split(';')[0]}}).then(r=>r.json()); if(d.customers.length!==1||d.customers[0].name!=='持久化验收')process.exit(1); console.log('PASS: records survive API restart');"
