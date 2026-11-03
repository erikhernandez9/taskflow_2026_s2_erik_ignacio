#!/usr/bin/env bash
# Escaneo de OWASP ZAP contra TaskFlow EN LOCAL. El active scan manda payloads hostiles
# y escribe datos: nunca apuntarlo a un ambiente que no sea el propio.
# Requiere Docker y la app levantada con: npm run dev:server y
# npm --prefix client run dev -- --host (ver security/REPORTE.md).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/security/zap/reports"
WORK="$(mktemp -d)"
API="http://localhost:3000/api"
JSON='Content-Type: application/json'
IMAGE="ghcr.io/zaproxy/zaproxy:stable"
mkdir -p "$OUT"
chmod 777 "$WORK"

# Usuario, proyecto y tarea propios del escaneo: los ids reales van a la superficie.
curl -s -o /dev/null -X POST -H "$JSON" -d '{"email":"zap@test.com","password":"Password1","name":"Zap"}' "$API/auth/register"
TOKEN=$(curl -s -X POST -H "$JSON" -d '{"email":"zap@test.com","password":"Password1"}' "$API/auth/login" | sed -E 's/.*"token":"([^"]+)".*/\1/')
AUTH="Authorization: Bearer $TOKEN"
PROJECT=$(curl -s -X POST -H "$JSON" -H "$AUTH" -d "{\"name\":\"Zap $(date +%s)\"}" "$API/projects" | sed -E 's/^\{"id":"([^"]+)".*/\1/')
TASK=$(curl -s -X POST -H "$JSON" -H "$AUTH" -d '{"title":"Tarea del escaneo"}' "$API/projects/$PROJECT/tasks" | sed -E 's/^\{"id":"([^"]+)".*/\1/')
sed -e "s/__PROJECT__/$PROJECT/g" -e "s/__TASK__/$TASK/g" "$ROOT/security/zap/openapi.json" > "$WORK/openapi.json"

# 1. API: active scan autenticado, con el token agregado a cada request.
docker run --rm -v "$WORK:/zap/wrk:rw" "$IMAGE" zap-api-scan.py \
  -t openapi.json -f openapi -O http://host.docker.internal:3000 \
  -r api-report.html -J api-report.json -w api-report.md -I \
  -z "-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Authorization -config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=Bearer\ $TOKEN" \
  > "$OUT/api-scan.log" 2>&1
echo "api-scan exit=$?"

# 2. Frontend: spider y active scan, con tiempo acotado.
docker run --rm -v "$WORK:/zap/wrk:rw" "$IMAGE" zap-full-scan.py \
  -t http://host.docker.internal:5173 -m 2 -T 10 \
  -r web-report.html -J web-report.json -w web-report.md -I \
  > "$OUT/web-scan.log" 2>&1
echo "web-scan exit=$?"

cp "$WORK"/*report* "$OUT"/
rm -rf "$WORK"
